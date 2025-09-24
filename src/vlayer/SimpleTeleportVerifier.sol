// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {SimpleTeleportProver} from "./SimpleTeleportProver.sol";
import {Erc20Token, Protocol, TokenType} from "./types/TeleportTypes.sol";
import {WhaleBadgeNFT} from "./WhaleBadgeNFT.sol";
import {Registry} from "./constants/Registry.sol";

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";
import {IAToken} from "./interfaces/IAToken.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
struct UserInfo{
    uint256 borrowedAmount;
    uint256 suppliedAmount;
    uint256 repaidAmount;
    uint256 latestBlock;
    uint256 latestBalance;
    uint256 borrowTimes;
    uint256 supplyTimes;
    uint256 repayTimes;
}


contract SimpleTeleportVerifier is Verifier {
    address public prover;
    Registry public registry;

    // user address => protocol type => user info
    mapping(address => mapping(uint256 => UserInfo)) public usersInfo;
    WhaleBadgeNFT public reward;

    constructor(address _prover, WhaleBadgeNFT _nft, Registry _registry) {
        prover = _prover;
        reward = _nft;
        registry = _registry;
    }

    // function claim(Proof calldata, address claimer, Erc20Token[] memory tokens)
    //     public
    //     onlyVerified(prover, SimpleTeleportProver.crossChainBalanceOf.selector)
    // {
    //     // require(!claimed[claimer], "Already claimed");

    //     if (tokens.length > 0) {
    //         uint256 totalBalance = 0;
    //         for (uint256 i = 0; i < tokens.length; i++) {
    //             totalBalance += tokens[i].balance;
    //         }
    //         if (totalBalance >= 10_000_000_000_000) {
    //             // claimed[claimer] = true;
    //             reward.mint(claimer);
    //         }
    //     }
    // }

    // @dev claim Aave data
    function claim(Proof calldata, address claimer, Erc20Token[] memory tokens)
        public
        onlyVerified(prover, SimpleTeleportProver.proveAaveData.selector)
    {
        
        UserInfo storage userInfo = usersInfo[claimer][uint256(Protocol.AAVE)];
        {
            uint _blkNumber;
            for(uint256 i = 0; i < tokens.length; i++) {
                _blkNumber = tokens[i].blockNumber;
                require(_blkNumber > userInfo.latestBlock, "Invalid block number"); // always get data at block number which is greater than saved latest block
                
                if(tokens[i].tokenType == TokenType.AVARIABLEDEBT) { // if borrow or repay
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveVariableDebtToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    if(userInfo.latestBalance <= tokens[i].balance) { // borrow
                        userInfo.borrowedAmount += tokens[i].balance - userInfo.latestBalance;
                        userInfo.borrowTimes++;

                    } else { // repay
                        userInfo.repaidAmount += userInfo.latestBalance - tokens[i].balance;
                        userInfo.repayTimes++;
                    }
                    
                    userInfo.latestBalance = tokens[i].balance;

                } else if(tokens[i].tokenType == TokenType.ARESERVE) { // if supply assets, only increase the supplied amount, will consider withdraw in the future
                    require(IAavePool(registry.AAVE_POOL_ADDRESS()).getReserveAToken(tokens[i].underlingTokenAddress) == tokens[i].aTokenAddress, "Invalid Aave token");
                    userInfo.suppliedAmount += tokens[i].balance;
                    userInfo.supplyTimes++;
                } else if(tokens[i].tokenType == TokenType.ASTABLEDEBT) {
                    return;
                }

                userInfo.latestBlock = _blkNumber;
            }

        }
        reward.mint(claimer);
    
    }

}
