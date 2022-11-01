// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0;

interface ISanctioned {
    function isSanctioned(address) external view returns (bool);
}
