// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {SimpleTeleportProver} from "./SimpleTeleportProver.sol";
import {Erc20Token, CToken, MToken, Protocol, TokenType, CTokenType} from "./types/TeleportTypes.sol";
import {Registry} from "./constants/Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {CreditModel} from "./CreditModel.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IController} from "./interfaces/IController.sol";
import {IUniswapV2PriceOracle} from "./interfaces/IUniswapV2PriceOracle.sol";
import {Initializable} from "openzeppelin-contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts/proxy/utils/UUPSUpgradeable.sol";

import {IAToken} from "./interfaces/IAToken.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {ICToken} from "./interfaces/ICToken.sol";
import {IMorpho, Id, MarketParams} from "./interfaces/IMorpho.sol";

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
/// @title Controller
/// @notice Upgradeable contract for handling DeFi data processing and credit scoring
/// @dev Uses UUPS upgrade pattern for future contract upgrades
/// @custom:oz-upgrades-from Controller
contract Controller is Initializable, UUPSUpgradeable, IController {

    // ============ STATE VARIABLES ============

    // Storage
    address private _owner;

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
    mapping(address => mapping(Protocol => mapping(address => mapping(uint256 => bool)))) public isClaimedBlock;

    // user address => aToken address => latest balance
    mapping(address => mapping(address => uint256)) private _latestAaveBalance;

    // user address => cToken address => latest balance (for Compound BASE tokens - borrowed balance)
    mapping(address => mapping(address => uint256)) private _latestCompoundDebtBalance;

    // user address => cToken address => collateral address => latest balance (for Compound COLLATERAL tokens)
    mapping(address => mapping(address => mapping(address => uint256))) private _latestCompoundCollateralBalance;

    // latest debt aToken block number
    uint256 private _latestDebtATokenBlockNumber;
    // latest collateral aToken block number
    uint256 private _latestCollateralATokenBlockNumber;
    
    // latest debt cToken block number
    uint256 private _latestDebtCBlockNumber;
    // latest collateral cToken block number
    uint256 private _latestCollateralCBlockNumber;

    // latest debt Morpho block number
    uint256 private _latestDebtMBlockNumber;
    // latest collateral Morpho block number
    uint256 private _latestCollateralMBlockNumber;

    // user address => morpho address => market id => latest borrow amount
    mapping(address => mapping(address => mapping(Id => uint256))) public _latestMorphoBorrowAmount;

    // user address => morpho address => market id => latest collateral amount
    mapping(address => mapping(address => mapping(Id => uint256))) public _latestMorphoCollateralAmount;

    // ============ CONSTRUCTOR ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ INITIALIZER ============

    /**
     * @notice Initializes the Controller contract
     * @dev This replaces the constructor for upgradeable contracts
     * @param _verifier Address of the SimpleTeleportVerifier contract
     * @param _registry Registry contract containing protocol addresses and configurations
     * @param _creditScoreCalculator Address of the CreditModel contract for score calculations
     * @param _priceOracle Address of the UniswapV2PriceOracle contract for price conversions
     * @param initialOwner Address of the initial owner who can update the contracts
     */
    function initialize(
        address _verifier,
        Registry _registry,
        address _creditScoreCalculator,
        address _priceOracle,
        address initialOwner
    ) public initializer {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
        
        verifier = _verifier;
        registry = _registry;
        creditScoreCalculator = CreditModel(_creditScoreCalculator);
        priceOracle = IUniswapV2PriceOracle(_priceOracle);
    }

    // ============ OWNERSHIP FUNCTIONS ============

    /// @notice Returns the address of the current owner
    function owner() public view returns (address) {
        return _owner;
    }

    /// @notice Throws if called by any account other than the owner
    modifier onlyOwner() {
        if (owner() != msg.sender) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    /// @notice Transfers ownership of the contract to a new account
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /// @notice Renounces ownership of the contract
    /// @dev Leaves the contract without an owner, disabling upgrade functionality
    function renounceOwnership() public onlyOwner {
        _transferOwnership(address(0));
    }

    /// @dev Internal function to transfer ownership
    function _transferOwnership(address newOwner) internal {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @notice Authorizes an upgrade to a new implementation
    /// @dev Only the owner can authorize upgrades
    /// @param newImplementation Address of the new implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
        } else if (selector == SimpleTeleportProver.proveMorphoData.selector) {
            _processMorphoData(claimer, encodedData);
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
              
                // Per aToken latest block checks are handled in each token-type branch

                if(tokens[i].tokenType == TokenType.AVARIABLEDEBT) { // if borrow or repay
                    // validate latest block number for debt aToken
                    if (_blkNumber <= _latestDebtATokenBlockNumber) {
                        continue;
                    }
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveVariableDebtToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    
                    // Get USDC and USDT addresses for current chain
                    IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);
                    
                    uint256 borrowAmount;
                    uint256 repayAmount;
                    
                    if (_latestAaveBalance[claimer][tokens[i].aTokenAddress] <= tokens[i].balance) { // borrow
                        borrowAmount = tokens[i].balance - _latestAaveBalance[claimer][tokens[i].aTokenAddress];
                        
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
                        repayAmount = _latestAaveBalance[claimer][tokens[i].aTokenAddress] - tokens[i].balance;
                        
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

                    _latestAaveBalance[claimer][tokens[i].aTokenAddress] = tokens[i].balance;
                    _latestDebtATokenBlockNumber = _blkNumber;

                } else if(tokens[i].tokenType == TokenType.ARESERVE) { // if supply assets, only increase the supplied amount, will consider withdraw in the future
                    // validate latest block number for collateral aToken
                    if (_blkNumber <= _latestCollateralATokenBlockNumber) {
                        continue;
                    }
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
                    _latestAaveBalance[claimer][tokens[i].aTokenAddress] = tokens[i].balance;
                    _latestCollateralATokenBlockNumber = _blkNumber;
                } else if(tokens[i].tokenType == TokenType.ASTABLEDEBT) {
                    return;
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > _totals[claimer].latestBlock) {
                    _totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isClaimedBlock[claimer][Protocol.AAVE][tokens[i].aTokenAddress][_blkNumber] = true;
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
                    if(_blkNumber <= _latestDebtCBlockNumber) { // skip, always get data at block number which is greater than saved latest block
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
                    
                    if (_latestCompoundDebtBalance[claimer][tokens[i].cTokenAddress] <= tokens[i].balance) { // borrow
                        borrowAmount = tokens[i].balance - _latestCompoundDebtBalance[claimer][tokens[i].cTokenAddress];
                        
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
                        repayAmount = _latestCompoundDebtBalance[claimer][tokens[i].cTokenAddress] - tokens[i].balance;
                        
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

                    _latestCompoundDebtBalance[claimer][tokens[i].cTokenAddress] = tokens[i].balance;
                    _latestDebtCBlockNumber = _blkNumber;

                } else if(tokens[i].tokenType == CTokenType.COLLATERAL) { // if supply or withdraw collateral
                    // validate latest block number
                    if(_blkNumber <= _latestCollateralCBlockNumber) { // skip, always get data at block number which is greater than saved latest block
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
                    _latestCollateralCBlockNumber = _blkNumber;
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > _totals[claimer].latestBlock) {
                    _totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isClaimedBlock[claimer][Protocol.COMPOUND][tokens[i].cTokenAddress][_blkNumber] = true;
            }
        }
    }

    /**
     * @notice Process Morpho protocol data
     * @dev Internal function to handle Morpho data processing
     * @param claimer The address claiming their data
     * @param encodedData The encoded MToken array
     */
    function _processMorphoData(address claimer, bytes memory encodedData) internal {
        MToken[] memory tokens = abi.decode(encodedData, (MToken[]));
        
        IVerifier.UserInfo storage userInfo = _usersInfo[claimer][Protocol.MORPHO];

        // Track first activity for credit scoring
        _updateFirstActivity(claimer, Protocol.MORPHO, block.number);

        {
            uint _blkNumber;
            for(uint256 i = 0; i < tokens.length; i++) {
                
                _blkNumber = tokens[i].blockNumber;
              
                // Get USDC and USDT addresses for current chain
                IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);

                // check morpho address with chainAddresses.morphoAddress
                if(tokens[i].morphoAddress != chainAddresses.morphoAddress) {
                    continue;
                }

                // Fetch market params once and reuse across borrow/repay and collateral paths
                MarketParams memory marketParams = IMorpho(tokens[i].morphoAddress).idToMarketParams(tokens[i].marketId);

                // Process borrow shares (debt)
                if (tokens[i].borrowShares > 0) {
                    // validate latest block number for debt
                    if(_blkNumber <= _latestDebtMBlockNumber) { // skip, always get data at block number which is greater than saved latest block
                        continue;
                    }
                    
                    uint256 borrowAmount;
                    uint256 repayAmount;
                    
                    if (_latestMorphoBorrowAmount[claimer][tokens[i].morphoAddress][tokens[i].marketId] <= tokens[i].borrowShares) { // borrow
                        uint256 borrowSharesDiff = tokens[i].borrowShares - _latestMorphoBorrowAmount[claimer][tokens[i].morphoAddress][tokens[i].marketId];
                        // Convert borrow shares to actual borrow amount using: borrowAmount = borrowShares * totalBorrowAssets / totalBorrowShares
                        if (tokens[i].totalBorrowShares > 0) {
                            borrowAmount = (borrowSharesDiff * uint256(tokens[i].totalBorrowAssets)) / uint256(tokens[i].totalBorrowShares);
                        } else {
                            borrowAmount = 0;
                        }
                        
                        // Convert to USD if not USDC or USDT
                        if(marketParams.loanToken != chainAddresses.usdc && marketParams.loanToken != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(marketParams.loanToken, borrowAmount);
                            borrowAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.borrowedAmount += borrowAmount;
                        userInfo.borrowTimes++;

                        // Update totals
                        _totals[claimer].borrowedAmount += borrowAmount;
                        _totals[claimer].borrowTimes++;

                        // Emit borrow event
                        emit UserBorrowed(claimer, Protocol.MORPHO, borrowAmount, userInfo.borrowedAmount, userInfo.borrowTimes);

                    } else { // repay
                        uint256 repaySharesDiff = _latestMorphoBorrowAmount[claimer][tokens[i].morphoAddress][tokens[i].marketId] - tokens[i].borrowShares;
                        // Convert repay shares to actual repay amount using: repayAmount = repayShares * totalBorrowAssets / totalBorrowShares
                        if (tokens[i].totalBorrowShares > 0) {
                            repayAmount = (repaySharesDiff * uint256(tokens[i].totalBorrowAssets)) / uint256(tokens[i].totalBorrowShares);
                        } else {
                            repayAmount = 0;
                        }
                        
                        // Convert to USD if not USDC or USDT
                        if(marketParams.loanToken != chainAddresses.usdc && marketParams.loanToken != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(marketParams.loanToken, repayAmount);
                            repayAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.repaidAmount += repayAmount;
                        userInfo.repayTimes++;

                        // Update totals
                        _totals[claimer].repaidAmount += repayAmount;
                        _totals[claimer].repayTimes++;

                        // Emit repay event
                        emit UserRepaid(claimer, Protocol.MORPHO, repayAmount, userInfo.repaidAmount, userInfo.repayTimes);
                    }

                    _latestMorphoBorrowAmount[claimer][tokens[i].morphoAddress][tokens[i].marketId] = tokens[i].borrowShares;
                    _latestDebtMBlockNumber = _blkNumber;
                }

                // Process collateral
                if (tokens[i].collateral > 0) {
                    // validate latest block number for collateral
                    if(_blkNumber <= _latestCollateralMBlockNumber) { // skip, always get data at block number which is greater than saved latest block
                        continue;
                    }
                    
                    uint256 previousCollateral = _latestMorphoCollateralAmount[claimer][tokens[i].morphoAddress][tokens[i].marketId];
                    
                    if (previousCollateral <= tokens[i].collateral) { // add collateral
                        uint256 supplyAmount = tokens[i].collateral - previousCollateral;
                        
                        // Convert to USD if not USDC or USDT
                        if(marketParams.collateralToken != chainAddresses.usdc && marketParams.collateralToken != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDT(marketParams.collateralToken, supplyAmount);
                            supplyAmount = usdAmount / priceOracle.EXP();
                        }
                        
                        userInfo.suppliedAmount += supplyAmount;
                        userInfo.supplyTimes++;

                        // Update totals
                        _totals[claimer].suppliedAmount += supplyAmount;
                        _totals[claimer].supplyTimes++;

                        // Emit supply event
                        emit UserSupplied(claimer, Protocol.MORPHO, supplyAmount, userInfo.suppliedAmount, userInfo.supplyTimes);
                        
                    } else { // withdraw collateral
                        // uint256 withdrawAmount = previousCollateral - tokens[i].collateral;
                        
                        // // Get market params to find the collateral token
                        // reuse marketParams declared above
                        
                        // // Convert to USD if not USDC or USDT
                        // if(marketParams.collateralToken != chainAddresses.usdc && marketParams.collateralToken != chainAddresses.usdt) {
                        //     (uint256 usdAmount,) = priceOracle.getPriceInUSDT(marketParams.collateralToken, withdrawAmount);
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
                    _latestMorphoCollateralAmount[claimer][tokens[i].morphoAddress][tokens[i].marketId] = tokens[i].collateral;
                    _latestCollateralMBlockNumber = _blkNumber;
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > _totals[claimer].latestBlock) {
                    _totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isClaimedBlock[claimer][Protocol.MORPHO][tokens[i].morphoAddress][_blkNumber] = true;
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

    /// @notice Get latest debt and collateral block numbers for a protocol
    /// @param protocol The protocol to query
    /// @return latestDebtBlock The latest processed debt block number for the protocol
    /// @return latestCollateralBlock The latest processed collateral block number for the protocol
    function latestProtocolBlockNumbers(Protocol protocol)
        external
        view
        returns (uint256 latestDebtBlock, uint256 latestCollateralBlock)
    {
        if (protocol == Protocol.AAVE) {
            return (_latestDebtATokenBlockNumber, _latestCollateralATokenBlockNumber);
        } else if (protocol == Protocol.COMPOUND) {
            return (_latestDebtCBlockNumber, _latestCollateralCBlockNumber);
        } else if (protocol == Protocol.MORPHO) {
            return (_latestDebtMBlockNumber, _latestCollateralMBlockNumber);
        }
    }

    /// @inheritdoc IController
    function totals(address user)
        external
        view
        returns (IVerifier.UserInfo memory)
    {
        return _totals[user];
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}

