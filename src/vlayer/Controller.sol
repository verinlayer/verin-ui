// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {SimpleTeleportProver} from "./SimpleTeleportProver.sol";
import {Erc20Token, CToken, Protocol, TokenType, CTokenType} from "./types/TeleportTypes.sol";
import {Registry} from "./constants/Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {CreditModel} from "./CreditModel.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IController} from "./interfaces/IController.sol";
import {IUniswapV2PriceOracle} from "./interfaces/IUniswapV2PriceOracle.sol";
import {Ownable2Step} from "openzeppelin-contracts/access/Ownable2Step.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

import {IAToken} from "./interfaces/IAToken.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {ICToken} from "./interfaces/ICToken.sol";

/**
 * @title Controller
 * @notice Handles all data processing and business logic for the DeFi credit scoring system
 * @dev This contract processes verified DeFi activity data to calculate credit scores and manage user reputation
 *
 * @dev Credit Scoring Algorithm:
 *      - Repayment Rate (35%): Measures how much borrowed amount has been repaid
 *      - Leverage/Utilization (30%): Borrowed vs total assets ratio (inverted scoring)
 *      - Cushion Ratio (15%): Supplied assets vs borrowed assets ratio
 *      - History (10%): Address age in days (capped at 365 days)
 *      - Recency (10%): Days since last activity (penalty after 90 days)
 *
 * @dev Security Features:
 *      - Registry-based token validation
 *      - Stale data prevention mechanisms
 *      - Access control via verifier contract
 *
 * @dev Integration Points:
 *      - CreditModel contract for score calculations
 *      - Registry contract for protocol addresses
 *      - Price oracle for token price conversions
 *      - Event system for external monitoring
 */
contract Controller is IController, Ownable2Step {

    // ============ STATE VARIABLES ============

    /// @notice Address of the SimpleTeleportVerifier contract that calls this controller
    address public verifier;

    /// @notice Registry contract containing protocol addresses and configurations
    Registry public registry;

    /// @notice Credit scoring model contract for calculating user credit scores
    CreditModel public creditScoreCalculator;

    /// @notice Uniswap V2 price oracle for converting token amounts to USD
    IUniswapV2PriceOracle public priceOracle;

    /// @notice Mapping of user addresses to protocol types to user activity data
    /// @dev Structure: _usersInfo[userAddress][protocol] = IVerifier.UserInfo
    mapping(address => mapping(Protocol => IVerifier.UserInfo)) private _usersInfo;

    /// @notice Mapping of user addresses to total aggregated data across all protocols
    /// @dev Structure: _totals[userAddress] = IVerifier.UserInfo (aggregated from all protocols)
    mapping(address => IVerifier.UserInfo) private _totals;

    // user address => protocol => aToken address => block number => amount: to track if a token at a block number has been proven or not
    mapping(address => mapping(Protocol => mapping(address => mapping(uint256 => bool)))) public isExisted;

    // user address => aToken address => latest balance
    mapping(address => mapping(address => uint256)) private _latestBalance;

    // user address => cToken address => latest balance (for Compound BASE tokens - borrowed balance)
    mapping(address => mapping(address => uint256)) private _latestCompoundBalance;

    // user address => cToken address => collateral address => latest balance (for Compound COLLATERAL tokens)
    mapping(address => mapping(address => mapping(address => uint256))) private _latestCompoundCollateralBalance;

    // cToken type => block number
    uint256 private _debtCLatestBlockNumber;
    uint256 private _collateralCLatestBlockNumber;

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initializes the Controller contract
     * @dev Sets up the verifier, registry, credit scoring model, and price oracle
     *
     * @param _verifier Address of the SimpleTeleportVerifier contract
     * @param _registry Registry contract containing protocol addresses and configurations
     * @param _creditScoreCalculator Address of the CreditModel contract for score calculations
     * @param _priceOracle Address of the UniswapV2PriceOracle contract for price conversions
     * @param initialOwner Address of the initial owner who can update the contracts
     */
    constructor(
        address _verifier,
        Registry _registry,
        address _creditScoreCalculator,
        address _priceOracle,
        address initialOwner
    ) Ownable(initialOwner) {
        verifier = _verifier;
        registry = _registry;
        creditScoreCalculator = CreditModel(_creditScoreCalculator);
        priceOracle = IUniswapV2PriceOracle(_priceOracle);
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to ensure only the verifier contract can call certain functions
     * @dev Prevents unauthorized access to data processing functions
     */
    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can call this function");
        _;
    }

    // ============ CORE FUNCTIONS ============

    /// @inheritdoc IController
    function processClaim(address claimer, bytes4 selector, bytes memory encodedData)
        external
        onlyVerifier
    {
        if (selector == SimpleTeleportProver.proveAaveData.selector) {
            _processAaveData(claimer, encodedData);
        } else if (selector == SimpleTeleportProver.proveCompoundData.selector) {
            _processCompoundData(claimer, encodedData);
        } else {
            revert("Invalid selector");
        }
    }

    /**
     * @notice Process Aave protocol data
     * @dev Internal function to handle Aave data processing
     * @param claimer The address claiming their data
     * @param encodedData The encoded Erc20Token array
     */
    function _processAaveData(address claimer, bytes memory encodedData) internal {
        Erc20Token[] memory tokens = abi.decode(encodedData, (Erc20Token[]));
        
        IVerifier.UserInfo storage userInfo = _usersInfo[claimer][Protocol.AAVE];

        // Track first activity for credit scoring
        _updateFirstActivity(claimer, Protocol.AAVE, block.number);

        {
            uint _blkNumber;
            for(uint256 i = 0; i < tokens.length; i++) {
                _blkNumber = tokens[i].blockNumber;
              
                if(_blkNumber < userInfo.latestBlock) { // skip, always get data at block number which is greater than saved latest block
                    continue;
                }

                if(tokens[i].tokenType == TokenType.AVARIABLEDEBT) { // if borrow or repay
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveVariableDebtToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    
                    // Get USDC and USDT addresses for current chain
                    IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);
                    
                    uint256 borrowAmount;
                    uint256 repayAmount;
                    
                    if (_latestBalance[claimer][tokens[i].aTokenAddress] <= tokens[i].balance) { // borrow
                        borrowAmount = tokens[i].balance - _latestBalance[claimer][tokens[i].aTokenAddress];
                        
                        // Convert to USD if not USDC or USDT
                        if(tokens[i].underlingTokenAddress != chainAddresses.usdc && tokens[i].underlingTokenAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(tokens[i].underlingTokenAddress, borrowAmount);
                            borrowAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.borrowedAmount += borrowAmount;
                        userInfo.borrowTimes++;

                        // Update totals
                        _totals[claimer].borrowedAmount += borrowAmount;
                        _totals[claimer].borrowTimes++;

                        // Emit borrow event
                        emit UserBorrowed(claimer, Protocol.AAVE, borrowAmount, userInfo.borrowedAmount, userInfo.borrowTimes);

                    } else { // repay
                        repayAmount = _latestBalance[claimer][tokens[i].aTokenAddress] - tokens[i].balance;
                        
                        // Convert to USD if not USDC or USDT
                        if(tokens[i].underlingTokenAddress != chainAddresses.usdc && tokens[i].underlingTokenAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(tokens[i].underlingTokenAddress, repayAmount);
                            repayAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.repaidAmount += repayAmount;
                        userInfo.repayTimes++;

                        // Update totals
                        _totals[claimer].repaidAmount += repayAmount;
                        _totals[claimer].repayTimes++;

                        // Emit repay event
                        emit UserRepaid(claimer, Protocol.AAVE, repayAmount, userInfo.repaidAmount, userInfo.repayTimes);
                    }

                    _latestBalance[claimer][tokens[i].aTokenAddress] = tokens[i].balance;

                } else if(tokens[i].tokenType == TokenType.ARESERVE) { // if supply assets, only increase the supplied amount, will consider withdraw in the future
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveAToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    
                    // Get USDC and USDT addresses for current chain
                    IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);
                    
                    uint256 supplyAmount = tokens[i].balance;
                    
                    // Convert to USD if not USDC or USDT
                    if(tokens[i].underlingTokenAddress != chainAddresses.usdc && tokens[i].underlingTokenAddress != chainAddresses.usdt) {
                        (uint256 usdAmount,) = priceOracle.getPriceInUSDT(tokens[i].underlingTokenAddress, supplyAmount);
                        supplyAmount = usdAmount / priceOracle.EXP();
                    }
                    
                    userInfo.suppliedAmount += supplyAmount;
                    userInfo.supplyTimes++;

                    // Update totals
                    _totals[claimer].suppliedAmount += supplyAmount;
                    _totals[claimer].supplyTimes++;

                    // Emit supply event
                    emit UserSupplied(claimer, Protocol.AAVE, supplyAmount, userInfo.suppliedAmount, userInfo.supplyTimes);
                    _latestBalance[claimer][tokens[i].aTokenAddress] = tokens[i].balance;
                } else if(tokens[i].tokenType == TokenType.ASTABLEDEBT) {
                    return;
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > _totals[claimer].latestBlock) {
                    _totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isExisted[claimer][Protocol.AAVE][tokens[i].aTokenAddress][_blkNumber] = true;
            }

        }
    }

    /**
     * @notice Process Compound protocol data
     * @dev Internal function to handle Compound data processing
     * @param claimer The address claiming their data
     * @param encodedData The encoded CToken array
     */
    function _processCompoundData(address claimer, bytes memory encodedData) internal {
        CToken[] memory tokens = abi.decode(encodedData, (CToken[]));
        
        IVerifier.UserInfo storage userInfo = _usersInfo[claimer][Protocol.COMPOUND];

        // Track first activity for credit scoring
        _updateFirstActivity(claimer, Protocol.COMPOUND, block.number);

        {
            uint _blkNumber;
            for(uint256 i = 0; i < tokens.length; i++) {
                _blkNumber = tokens[i].blockNumber;
              
                // Get USDC and USDT addresses for current chain
                IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);

                if(tokens[i].tokenType == CTokenType.BASE) { // if borrow or repay
                    // validate latest block number
                    if(_blkNumber < _debtCLatestBlockNumber) { // skip, always get data at block number which is greater than saved latest block
                        continue;
                    }
                
                    
                    // Validate that the cToken address is valid for the chain
                    IRegistry.CompoundAddresses memory compoundAddresses = registry.getCompoundAddresses(block.chainid);
                    require(
                        tokens[i].cTokenAddress == compoundAddresses.cUSDCV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cUSDTV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cWETHV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cWBTCV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cUSDSV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cwstETHV3,
                        "Invalid Compound cToken"
                    );
                    
                    // Get the base token address from the cToken contract
                    address baseTokenAddress = ICToken(tokens[i].cTokenAddress).baseToken();
                    
                    uint256 borrowAmount;
                    uint256 repayAmount;
                    
                    if (_latestCompoundBalance[claimer][tokens[i].cTokenAddress] <= tokens[i].balance) { // borrow
                        borrowAmount = tokens[i].balance - _latestCompoundBalance[claimer][tokens[i].cTokenAddress];
                        
                        // Convert to USD if not USDC or USDT
                        if(baseTokenAddress != chainAddresses.usdc && baseTokenAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(baseTokenAddress, borrowAmount);
                            borrowAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.borrowedAmount += borrowAmount;
                        userInfo.borrowTimes++;

                        // Update totals
                        _totals[claimer].borrowedAmount += borrowAmount;
                        _totals[claimer].borrowTimes++;

                        // Emit borrow event
                        emit UserBorrowed(claimer, Protocol.COMPOUND, borrowAmount, userInfo.borrowedAmount, userInfo.borrowTimes);

                    } else { // repay
                        repayAmount = _latestCompoundBalance[claimer][tokens[i].cTokenAddress] - tokens[i].balance;
                        
                        // Convert to USD if not USDC or USDT
                        if(baseTokenAddress != chainAddresses.usdc && baseTokenAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(baseTokenAddress, repayAmount);
                            repayAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.repaidAmount += repayAmount;
                        userInfo.repayTimes++;

                        // Update totals
                        _totals[claimer].repaidAmount += repayAmount;
                        _totals[claimer].repayTimes++;

                        // Emit repay event
                        emit UserRepaid(claimer, Protocol.COMPOUND, repayAmount, userInfo.repaidAmount, userInfo.repayTimes);
                    }

                    _latestCompoundBalance[claimer][tokens[i].cTokenAddress] = tokens[i].balance;
                    _debtCLatestBlockNumber = _blkNumber;

                } else if(tokens[i].tokenType == CTokenType.COLLATERAL) { // if supply or withdraw collateral
                    // validate latest block number
                    if(_blkNumber < _collateralCLatestBlockNumber) { // skip, always get data at block number which is greater than saved latest block
                        continue;
                    }
                    
                    // Validate that the cToken address is valid for the chain
                    IRegistry.CompoundAddresses memory compoundAddresses = registry.getCompoundAddresses(block.chainid);
                    require(
                        tokens[i].cTokenAddress == compoundAddresses.cUSDCV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cUSDTV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cWETHV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cWBTCV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cUSDSV3 ||
                        tokens[i].cTokenAddress == compoundAddresses.cwstETHV3,
                        "Invalid Compound cToken"
                    );
                    
                    uint256 previousBalance = _latestCompoundCollateralBalance[claimer][tokens[i].cTokenAddress][tokens[i].collateralAddress];
                    
                    if (previousBalance <= tokens[i].balance) { // supply
                        uint256 supplyAmount = tokens[i].balance - previousBalance;
                        
                        // Convert to USD if not USDC or USDT
                        if(tokens[i].collateralAddress != chainAddresses.usdc && tokens[i].collateralAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(tokens[i].collateralAddress, supplyAmount);
                            supplyAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.suppliedAmount += supplyAmount;
                        userInfo.supplyTimes++;

                        // Update totals
                        _totals[claimer].suppliedAmount += supplyAmount;
                        _totals[claimer].supplyTimes++;

                        // Emit supply event
                        emit UserSupplied(claimer, Protocol.COMPOUND, supplyAmount, userInfo.suppliedAmount, userInfo.supplyTimes);
                        
                    } else { // withdraw , do not decrease the supplied amount
                        // uint256 withdrawAmount = previousBalance - tokens[i].balance;
                        
                        // // Convert to USD if not USDC or USDT
                        // if(tokens[i].collateralAddress != chainAddresses.usdc && tokens[i].collateralAddress != chainAddresses.usdt) {
                        //     (uint256 usdAmount,) = priceOracle.getPriceInUSDT(tokens[i].collateralAddress, withdrawAmount);
                        //     withdrawAmount = usdAmount / priceOracle.EXP();
                        // }
                        
                        // // Decrease supplied amount (but don't go below 0)
                        // if (userInfo.suppliedAmount >= withdrawAmount) {
                        //     userInfo.suppliedAmount -= withdrawAmount;
                        // } else {
                        //     userInfo.suppliedAmount = 0;
                        // }
                        
                    }
                    
                    // Update latest collateral balance
                    _latestCompoundCollateralBalance[claimer][tokens[i].cTokenAddress][tokens[i].collateralAddress] = tokens[i].balance;
                    _collateralCLatestBlockNumber = _blkNumber;
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > _totals[claimer].latestBlock) {
                    _totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isExisted[claimer][Protocol.COMPOUND][tokens[i].cTokenAddress][_blkNumber] = true;
            }
        }
    }

    // ============ CREDIT SCORING FUNCTIONS ============

    /// @inheritdoc IController
    function calculateCreditScore(address user)
        public
        view
        returns (uint256 score, uint8 tier)
    {
        IVerifier.UserInfo memory userInfo = _totals[user];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        CreditModel.Tier creditTier;
        (score, creditTier) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
        tier = uint8(creditTier);
    }

    /// @inheritdoc IController
    function getCreditScore(address user)
        external
        view
        returns (uint256 score)
    {
        IVerifier.UserInfo memory userInfo = _totals[user];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        (score,) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
    }

    /// @inheritdoc IController
    function calculateCreditScorePerProtocol(address user, Protocol protocol)
        public
        view
        returns (uint256 score, uint8 tier)
    {
        IVerifier.UserInfo memory userInfo = _usersInfo[user][protocol];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        CreditModel.Tier creditTier;
        (score, creditTier) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
        tier = uint8(creditTier);
    }

    /// @inheritdoc IController
    function getCreditScorePerProtocol(address user, Protocol protocol)
        external
        view
        returns (uint256 score)
    {
        IVerifier.UserInfo memory userInfo = _usersInfo[user][protocol];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        (score,) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Update first activity block when user first interacts
     * @dev Internal function that records the first activity timestamp for a user.
     *      This is used in credit score calculations to determine address age.
     *      Only updates if firstActivityBlock is not already set (0).
     *      Also updates the totals mapping with the earliest first activity across all protocols.
     */
    function _updateFirstActivity(address user, Protocol protocol, uint256 blockNumber) internal {
        IVerifier.UserInfo storage userInfo = _usersInfo[user][protocol];
        if (userInfo.firstActivityBlock == 0) {
            userInfo.firstActivityBlock = blockNumber;
        }
        
        // Update totals with earliest first activity across all protocols
        if (_totals[user].firstActivityBlock == 0 || blockNumber < _totals[user].firstActivityBlock) {
            _totals[user].firstActivityBlock = blockNumber;
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Updates the verifier contract address
     * @dev Only the contract owner can call this function
     * @param newVerifier The address of the new verifier contract
     */
    function setVerifier(address newVerifier) external onlyOwner {
        require(newVerifier != address(0), "Verifier cannot be zero address");
        
        address oldVerifier = verifier;
        verifier = newVerifier;
        
        emit VerifierUpdated(oldVerifier, newVerifier);
    }

    /**
     * @notice Updates the price oracle contract address
     * @dev Only the contract owner can call this function
     * @param newPriceOracle The address of the new price oracle contract
     */
    function setPriceOracle(address newPriceOracle) external onlyOwner {
        require(newPriceOracle != address(0), "Price oracle cannot be zero address");
        
        address oldPriceOracle = address(priceOracle);
        priceOracle = IUniswapV2PriceOracle(newPriceOracle);
        
        emit PriceOracleUpdated(oldPriceOracle, newPriceOracle);
    }

    // ============ VIEW FUNCTIONS ============

    /// @inheritdoc IController
    function usersInfo(address user, Protocol protocol)
        external
        view
        returns (IVerifier.UserInfo memory)
    {
        return _usersInfo[user][protocol];
    }

    /// @inheritdoc IController
    function totals(address user)
        external
        view
        returns (IVerifier.UserInfo memory)
    {
        return _totals[user];
    }

}

