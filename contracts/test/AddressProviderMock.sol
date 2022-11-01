// SPDX-License-Identifier: UNLICENSED
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;

contract AddressProviderMock {

    address public getTreasuryContract;

    constructor(address treasury) {
        getTreasuryContract = treasury;
    }
}