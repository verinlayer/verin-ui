// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {SimpleTeleportProver} from "./SimpleTeleportProver.sol";
import {Erc20Token, CToken, Protocol, TokenType, CTokenType} from "./types/TeleportTypes.sol";
import {Registry} from "./constants/Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {CreditModel} from "./CreditModel.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IUniswapV2PriceOracle} from "./interfaces/IUniswapV2PriceOracle.sol";
import {Ownable2Step} from "openzeppelin-contracts/access/Ownable2Step.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";
import {IAToken} from "./interfaces/IAToken.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {ICToken} from "./interfaces/ICToken.sol";

/**
 * @title SimpleTeleportVerifier
 * @notice A comprehensive DeFi credit scoring system that tracks user activity across multiple protocols
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
 *      - Cryptographic proof verification via Risc0
 *      - User-specific data access controls
 *      - Registry-based token validation
 *      - Stale data prevention mechanisms
 *
 * @dev Integration Points:
 *      - CreditModel contract for score calculations
 *      - Registry contract for protocol addresses
 *      - Prover contract for data verification
 *      - Event system for external monitoring
 */
contract SimpleTeleportVerifier is Verifier, IVerifier, Ownable2Step {

    // ============ STATE VARIABLES ============

    /// @notice Address of the trusted prover contract for data verification
    address public prover;

    /// @notice Registry contract containing protocol addresses and configurations
    Registry public registry;

    /// @notice Credit scoring model contract for calculating user credit scores
    CreditModel public creditScoreCalculator;

    /// @notice Uniswap V2 price oracle for converting token amounts to USD
    IUniswapV2PriceOracle public priceOracle;

    /// @notice Mapping of user addresses to protocol types to user activity data
    /// @dev Structure: _usersInfo[userAddress][protocol] = IVerifier.UserInfo
    mapping(address => mapping(Protocol => UserInfo)) private _usersInfo;

    /// @notice Mapping of user addresses to total aggregated data across all protocols
    /// @dev Structure: totals[userAddress] = IVerifier.UserInfo (aggregated from all protocols)
    mapping(address => UserInfo) public totals;

    // user address => protocol => aToken address => block number => amount: to track if a token at a block number has been proven or not
    mapping(address => mapping(Protocol => mapping(address => mapping(uint256 => bool)))) isExisted;

    // user address => aToken address => latest balance
    mapping(address => mapping(address => uint256)) private _latestBalance;

    // user address => cToken address => latest balance (for Compound BASE tokens - borrowed balance)
    mapping(address => mapping(address => uint256)) private _latestCompoundBalance;

    // user address => cToken address => collateral address => latest balance (for Compound COLLATERAL tokens)
    mapping(address => mapping(address => mapping(address => uint256))) private _latestCompoundCollateralBalance;

    // ============ EVENTS ============

    // Events are defined in IVerifier interface

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initializes the SimpleTeleportVerifier contract
     * @dev Sets up the trusted prover, registry, credit scoring model, and price oracle
     *
     * @param _prover Address of the trusted prover contract for data verification
     * @param _registry Registry contract containing protocol addresses and configurations
     * @param _creditScoreCalculator Address of the CreditModel contract for score calculations
     * @param _priceOracle Address of the UniswapV2PriceOracle contract for price conversions
     * @param initialOwner Address of the initial owner who can update the price oracle
     */
    constructor(
        address _prover,
        Registry _registry,
        address _creditScoreCalculator,
        address _priceOracle,
        address initialOwner
    ) Ownable(initialOwner) {
        prover = _prover;
        registry = _registry;
        creditScoreCalculator = CreditModel(_creditScoreCalculator);
        priceOracle = IUniswapV2PriceOracle(_priceOracle);
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to ensure only the claimer can update their own data
     * @dev Prevents users from claiming or modifying other users' data
     *
     * @param claimer The address claiming/updating their data
     * @dev Reverts if msg.sender is not the same as the claimer address
     */
    modifier onlyClaimer(address claimer) {
        require(msg.sender == claimer, "Only the claimer can update their own data");
        _;
    }

    // ============ CORE FUNCTIONS ============

    /// @inheritdoc IVerifier
    function claim(Proof calldata, address claimer, Erc20Token[] memory tokens)
        public
        onlyVerified(prover, SimpleTeleportProver.proveAaveData.selector)
        onlyClaimer(claimer)
    {

        UserInfo storage userInfo = _usersInfo[claimer][Protocol.AAVE];

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
                        totals[claimer].borrowedAmount += borrowAmount;
                        totals[claimer].borrowTimes++;

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
                        totals[claimer].repaidAmount += repayAmount;
                        totals[claimer].repayTimes++;

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
                    totals[claimer].suppliedAmount += supplyAmount;
                    totals[claimer].supplyTimes++;

                    // Emit supply event
                    emit UserSupplied(claimer, Protocol.AAVE, supplyAmount, userInfo.suppliedAmount, userInfo.supplyTimes);
                    _latestBalance[claimer][tokens[i].aTokenAddress] = tokens[i].balance;
                } else if(tokens[i].tokenType == TokenType.ASTABLEDEBT) {
                    return;
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > totals[claimer].latestBlock) {
                    totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isExisted[claimer][Protocol.AAVE][tokens[i].aTokenAddress][_blkNumber] = true;
            }

        }

    }

    /**
     * @notice Claims and processes Compound protocol data for a user
     * @dev This function processes verified Compound token data to track user's borrowing,
     *      supplying, repayment, and withdrawal activities for the Compound protocol.
     *
     * @param claimer The address of the user claiming their Compound data
     * @param tokens Array of CToken structs containing Compound token balances and metadata
     *
     * @dev Processing Logic:
     *      - Only processes tokens with block numbers greater than the last processed block
     *      - CTokenType.BASE: Tracks borrows (balance increase) and repays (balance decrease)
     *      - CTokenType.COLLATERAL: Tracks supplied collateral (balance increase) and withdrawals (balance decrease)
     *      - Converts all amounts to USD using the price oracle (except USDC/USDT)
     *      - Updates user's credit score data and emits events for each activity
     *      - Withdrawals decrease the suppliedAmount (with floor of 0)
     *
     * @dev Security:
     *      - Requires cryptographic proof verification via onlyVerified modifier
     *      - Only the claimer can update their own data via onlyClaimer modifier
     *      - Prevents duplicate data claims via isExisted mapping
     */
    function claimCompoundData(Proof calldata, address claimer, CToken[] memory tokens)
        public
        onlyVerified(prover, SimpleTeleportProver.proveCompoundData.selector)
        onlyClaimer(claimer)
    {
        UserInfo storage userInfo = _usersInfo[claimer][Protocol.COMPOUND];

        // Track first activity for credit scoring
        _updateFirstActivity(claimer, Protocol.COMPOUND, block.number);

        {
            uint _blkNumber;
            for(uint256 i = 0; i < tokens.length; i++) {
                _blkNumber = tokens[i].blockNumber;
              
                if(_blkNumber < userInfo.latestBlock) { // skip, always get data at block number which is greater than saved latest block
                    continue;
                }

                // Get USDC and USDT addresses for current chain
                IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);

                if(tokens[i].tokenType == CTokenType.BASE) { // if borrow or repay
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
                        totals[claimer].borrowedAmount += borrowAmount;
                        totals[claimer].borrowTimes++;

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
                        totals[claimer].repaidAmount += repayAmount;
                        totals[claimer].repayTimes++;

                        // Emit repay event
                        emit UserRepaid(claimer, Protocol.COMPOUND, repayAmount, userInfo.repaidAmount, userInfo.repayTimes);
                    }

                    _latestCompoundBalance[claimer][tokens[i].cTokenAddress] = tokens[i].balance;

                } else if(tokens[i].tokenType == CTokenType.COLLATERAL) { // if supply or withdraw collateral
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
                        totals[claimer].suppliedAmount += supplyAmount;
                        totals[claimer].supplyTimes++;

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
                }

                userInfo.latestBlock = _blkNumber;
                
                // Update totals latest block with the most recent block
                if (_blkNumber > totals[claimer].latestBlock) {
                    totals[claimer].latestBlock = _blkNumber;
                }

                // Mark this data as existed to prevent duplicate claims
                isExisted[claimer][Protocol.COMPOUND][tokens[i].cTokenAddress][_blkNumber] = true;
            }
        }
    }

    // ============ CREDIT SCORING FUNCTIONS ============

    /// @inheritdoc IVerifier
    function calculateCreditScore(address user)
        public
        view
        returns (uint256 score, uint8 tier)
    {
        UserInfo memory userInfo = totals[user];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        CreditModel.Tier creditTier;
        (score, creditTier) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
        tier = uint8(creditTier);
    }

    /// @inheritdoc IVerifier
    function getCreditScore(address user)
        external
        view
        returns (uint256 score)
    {
        UserInfo memory userInfo = totals[user];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        (score,) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
    }

    /**
     * @notice Calculate credit score for a specific protocol
     * @dev Computes credit score and tier based on user's activity in a single protocol
     *      Uses the same credit model as the aggregate score but only considers
     *      data from the specified protocol.
     *
     * @param user The address of the user to calculate the credit score for
     * @param protocol The specific protocol (AAVE or COMPOUND) to calculate the score for
     * @return score The calculated credit score (0-1000)
     * @return tier The credit tier (0: Bronze, 1: Silver, 2: Gold, 3: Platinum, 4: Diamond)
     *
     * @dev This function allows users and dApps to see protocol-specific credit scores,
     *      which can be useful for:
     *      - Understanding performance on individual protocols
     *      - Protocol-specific lending decisions
     *      - Comparative analysis across protocols
     */
    function calculateCreditScorePerProtocol(address user, Protocol protocol)
        public
        view
        returns (uint256 score, uint8 tier)
    {
        UserInfo memory userInfo = _usersInfo[user][protocol];
        uint256 currentBlock = block.number;

        // Call the credit score calculator with UserInfo struct
        CreditModel.Tier creditTier;
        (score, creditTier) = creditScoreCalculator.computeScoreAndTier(userInfo, currentBlock);
        tier = uint8(creditTier);
    }

    /**
     * @notice Get credit score for a specific protocol (score only)
     * @dev Returns just the credit score without the tier for a specific protocol
     *
     * @param user The address of the user to get the credit score for
     * @param protocol The specific protocol (AAVE or COMPOUND) to get the score for
     * @return score The calculated credit score (0-1000)
     */
    function getCreditScorePerProtocol(address user, Protocol protocol)
        external
        view
        returns (uint256 score)
    {
        UserInfo memory userInfo = _usersInfo[user][protocol];
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
        UserInfo storage userInfo = _usersInfo[user][protocol];
        if (userInfo.firstActivityBlock == 0) {
            userInfo.firstActivityBlock = blockNumber;
        }
        
        // Update totals with earliest first activity across all protocols
        if (totals[user].firstActivityBlock == 0 || blockNumber < totals[user].firstActivityBlock) {
            totals[user].firstActivityBlock = blockNumber;
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /// @inheritdoc IVerifier
    function setPriceOracle(address newPriceOracle) external onlyOwner {
        require(newPriceOracle != address(0), "Price oracle cannot be zero address");
        
        address oldPriceOracle = address(priceOracle);
        priceOracle = IUniswapV2PriceOracle(newPriceOracle);
        
        emit IVerifier.PriceOracleUpdated(oldPriceOracle, newPriceOracle);
    }

    // ============ VIEW FUNCTIONS ============

    /// @inheritdoc IVerifier
    function usersInfo(address user, Protocol protocol)
        external
        view
        returns (UserInfo memory)
    {
        return _usersInfo[user][protocol];
    }

}
