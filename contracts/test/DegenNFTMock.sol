// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DegenNFTMock is ERC721 {

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}


    function mint(address to, uint256 amount)
        external
        returns (bool)
    {
        uint256 balanceBefore = balanceOf(to); // F:[DNFT-7]

        for (uint256 i; i < amount; ) {
            uint256 tokenId = (uint256(uint160(to)) << 40) + balanceBefore + i; // F:[DNFT-7]
            _mint(to, tokenId); // F:[DNFT-7]

            unchecked {
                ++i; // F:[DNFT-7]
            }
        }
    }

}
