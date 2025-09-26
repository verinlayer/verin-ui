// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {UserInfo} from "./types/UserInfo.sol";

/// @title CreditModel
/// @notice Gas-optimized on-chain credit score calculator (0..100) and tier mapping.
/// @dev Designed to be pure and auditable. No external calls. Keeps math integer-based (percent * 100).
contract CreditModel {
    // Tier enum for easy interpretation
    enum Tier { D, C, B, A }

    /// @notice Internal function to compute credit score from individual parameters
    /// @dev Used internally by struct-based functions to avoid code duplication
    function _computeOnchainScore(
        uint256 borrowedUSD,
        uint256 suppliedUSD,
        uint256 repaidUSD,
        uint256 borrowCount,
        uint256 supplyCount,
        uint256 repayCount,
        uint256 addrAgeDays,
        uint256 daysSinceLastActive,
        uint256 numLiquidations
    ) internal pure returns (uint256 score100) {
        // Immediate heavy penalty if there were liquidations
        if (numLiquidations > 0) {
            return 10; // tier D "minimal"
        }

        // 1) repayRateX100 = min(100, repaidUSD * 100 / max(borrowedUSD,1))
        uint256 repayRateX100;
        if (borrowedUSD == 0) {
            // No borrow => perfect repayRate for scoring
            repayRateX100 = 100;
        } else {
            uint256 rr = (repaidUSD * 100) / borrowedUSD;
            repayRateX100 = rr > 100 ? 100 : rr;
        }

        // 2) utilizationX100 = borrowedUSD / (borrowedUSD + suppliedUSD + 1) * 100
        // +1 protects division by zero
        uint256 total = borrowedUSD + suppliedUSD + 1;
        uint256 utilizationX100 = (borrowedUSD * 100) / total;
        if (utilizationX100 > 100) utilizationX100 = 100; // defensive

        // 3) cushionX100 = mapped from supplied/burrowed ratio:
        // If borrowedUSD == 0 -> full cushion
        uint256 cushionX100;
        if (borrowedUSD == 0) {
            cushionX100 = 100;
        } else {
            // c = suppliedUSD * 100 / borrowedUSD
            uint256 c = (suppliedUSD * 100) / borrowedUSD;
            // map >200% -> full 100; else scale linearly (c / 2)
            if (c >= 200) {
                cushionX100 = 100;
            } else {
                cushionX100 = c / 2; // if c==100 -> 50
            }
        }

        // 4) historyX100 = addrAgeDays scaled to 365 days cap
        uint256 historyX100 = addrAgeDays >= 365 ? 100 : (addrAgeDays * 100) / 365;

        // 5) recentX100 = activity recency; 0 if >= 90 days inactive, else linear
        uint256 recentX100;
        if (daysSinceLastActive >= 90) {
            recentX100 = 0;
        } else {
            recentX100 = 100 - (daysSinceLastActive * 100) / 90; // invert: more recent => higher
        }

        // Weights in basis points (sum = 10000)
        // repay 35% -> 3500, leverage (inverted util) 30% -> 3000
        // cushion 15% -> 1500, history 10% -> 1000, recent 10% -> 1000
        uint256 repayW = 3500;
        uint256 leverageW = 3000;
        uint256 cushionW = 1500;
        uint256 historyW = 1000;
        uint256 recentW = 1000;

        // weighted = repayRateX100 * repayW
        //         + (100 - utilizationX100) * leverageW
        //         + cushionX100 * cushionW
        //         + historyX100 * historyW
        //         + recentX100 * recentW;
        // All intermediate terms fit in uint256 (100 * max weight ~ 100 * 3500 = 350000)
        uint256 weighted = repayRateX100 * repayW
                         + (100 - utilizationX100) * leverageW
                         + cushionX100 * cushionW
                         + historyX100 * historyW
                         + recentX100 * recentW;

        // Divide by 10000 to map back to 0..100 range
        score100 = weighted / 10000;

        // Safety caps
        if (score100 > 100) score100 = 100;
        return score100;
    }

    /// @notice Map numeric score to Tier enum
    /// @param score100 input score 0..100
    /// @return tier corresponding Tier
    function scoreToTier(uint256 score100) public pure returns (Tier tier) {
        if (score100 >= 85) return Tier.A;
        if (score100 >= 70) return Tier.B;
        if (score100 >= 50) return Tier.C;
        return Tier.D;
    }

    /// @notice Convenience: compute score and tier in one call using UserInfo struct
    /// @param userInfo The user's DeFi activity data
    /// @param currentBlock The current block number for calculations
    /// @return score100 The credit score (0-100)
    /// @return tier The credit tier (A, B, C, D)
    function computeScoreAndTier(
        UserInfo memory userInfo,
        uint256 currentBlock
    ) external pure returns (uint256 score100, Tier tier) {
        // Calculate address age in days (assuming 12 seconds per block)
        uint256 blocksPerDay = 43200; // https://optimistic.etherscan.io/chart/blocks
        uint256 addrAgeDays = 0;

        if (userInfo.firstActivityBlock > 0) {
            uint256 blocksSinceFirst = currentBlock - userInfo.firstActivityBlock;
            addrAgeDays = blocksSinceFirst / blocksPerDay;
        }

        // Calculate days since last activity
        uint256 daysSinceLastActive = 0;
        if (userInfo.latestBlock > 0) {
            uint256 blocksSinceLast = currentBlock - userInfo.latestBlock;
            daysSinceLastActive = blocksSinceLast / blocksPerDay;
        }

        // Call the internal function with calculated parameters
        score100 = _computeOnchainScore(
            userInfo.borrowedAmount,
            userInfo.suppliedAmount,
            userInfo.repaidAmount,
            userInfo.borrowTimes,
            userInfo.supplyTimes,
            userInfo.repayTimes,
            addrAgeDays,
            daysSinceLastActive,
            userInfo.liquidations
        );

        tier = scoreToTier(score100);
    }

}
