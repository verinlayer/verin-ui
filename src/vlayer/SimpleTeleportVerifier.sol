// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {SimpleTeleportProver} from "./SimpleTeleportProver.sol";
import {Erc20Token, Protocol, TokenType} from "./types/TeleportTypes.sol";
import {Registry} from "./constants/Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {CreditModel} from "./CreditModel.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IUniswapV2PriceOracle} from "./interfaces/IUniswapV2PriceOracle.sol";


import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";
import {IAToken} from "./interfaces/IAToken.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";

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
contract SimpleTeleportVerifier is Verifier, IVerifier {

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

    // user address => protocol => aToken address => block number => amount: to track if a token at a block number has been proven or not
    mapping(address => mapping(Protocol => mapping(address => mapping(uint256 => bool)))) isExisted;

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
     */
    constructor(address _prover, Registry _registry, address _creditScoreCalculator, address _priceOracle) {
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

                // Check if data already exists for this token at this block
                require(!isExisted[claimer][Protocol.AAVE][tokens[i].aTokenAddress][_blkNumber],
                    "Data already exists for this token at this block");
                // require(_blkNumber > userInfo.latestBlock, "Invalid block number"); // always get data at block number which is greater than saved latest block
                if(_blkNumber <= userInfo.latestBlock) { // skip
                    continue;
                }

                if(tokens[i].tokenType == TokenType.AVARIABLEDEBT) { // if borrow or repay
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveVariableDebtToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    
                    // Get USDC and USDT addresses for current chain
                    IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);
                    
                    uint256 borrowAmount;
                    uint256 repayAmount;
                    
                    if(userInfo.latestBalance <= tokens[i].balance) { // borrow
                        borrowAmount = tokens[i].balance - userInfo.latestBalance;
                        
                        // Convert to USD if not USDC or USDT
                        if(tokens[i].underlingTokenAddress != chainAddresses.usdc && tokens[i].underlingTokenAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDC(tokens[i].underlingTokenAddress, borrowAmount);
                            borrowAmount = usdAmount;
                        }
                        
                        userInfo.borrowedAmount += borrowAmount;
                        userInfo.borrowTimes++;

                        // Emit borrow event
                        emit UserBorrowed(claimer, Protocol.AAVE, borrowAmount, userInfo.borrowedAmount, userInfo.borrowTimes);

                    } else { // repay
                        repayAmount = userInfo.latestBalance - tokens[i].balance;
                        
                        // Convert to USD if not USDC or USDT
                        if(tokens[i].underlingTokenAddress != chainAddresses.usdc && tokens[i].underlingTokenAddress != chainAddresses.usdt) {
                            (uint256 usdAmount,) = priceOracle.getPriceInUSDC(tokens[i].underlingTokenAddress, repayAmount);
                            repayAmount = usdAmount;
                        }
                        
                        userInfo.repaidAmount += repayAmount;
                        userInfo.repayTimes++;

                        // Emit repay event
                        emit UserRepaid(claimer, Protocol.AAVE, repayAmount, userInfo.repaidAmount, userInfo.repayTimes);
                    }

                    userInfo.latestBalance = tokens[i].balance;

                } else if(tokens[i].tokenType == TokenType.ARESERVE) { // if supply assets, only increase the supplied amount, will consider withdraw in the future
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveAToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    
                    // Get USDC and USDT addresses for current chain
                    IRegistry.ChainAddresses memory chainAddresses = registry.getAddressesForChain(block.chainid);
                    
                    uint256 supplyAmount = tokens[i].balance;
                    
                    // Convert to USD if not USDC or USDT
                    if(tokens[i].underlingTokenAddress != chainAddresses.usdc && tokens[i].underlingTokenAddress != chainAddresses.usdt) {
                        (uint256 usdAmount,) = priceOracle.getPriceInUSDC(tokens[i].underlingTokenAddress, supplyAmount);
                        supplyAmount = usdAmount;
                    }
                    
                    userInfo.suppliedAmount += supplyAmount;
                    userInfo.supplyTimes++;

                    // Emit supply event
                    emit UserSupplied(claimer, Protocol.AAVE, supplyAmount, userInfo.suppliedAmount, userInfo.supplyTimes);
                } else if(tokens[i].tokenType == TokenType.ASTABLEDEBT) {
                    return;
                }

                userInfo.latestBlock = _blkNumber;

                // Mark this data as existed to prevent duplicate claims
                isExisted[claimer][Protocol.AAVE][tokens[i].aTokenAddress][_blkNumber] = true;
            }

        }

    }

    // ============ CREDIT SCORING FUNCTIONS ============

    /// @inheritdoc IVerifier
    function calculateCreditScore(address user, Protocol protocol)
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

    /// @inheritdoc IVerifier
    function getCreditScore(address user, Protocol protocol)
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
     */
    function _updateFirstActivity(address user, Protocol protocol, uint256 blockNumber) internal {
        UserInfo storage userInfo = _usersInfo[user][protocol];
        if (userInfo.firstActivityBlock == 0) {
            userInfo.firstActivityBlock = blockNumber;
        }
    }

    // ============ EXTERNAL FUNCTIONS ============

    /// @inheritdoc IVerifier
    function recordLiquidation(address user, Protocol protocol) external {
        UserInfo storage userInfo = _usersInfo[user][protocol];
        userInfo.liquidations++;
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
