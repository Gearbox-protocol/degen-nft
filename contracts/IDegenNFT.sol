// SPDX-License-Identifier: GPL-2.0-or-later
// Gearbox Protocol. Generalized leverage for DeFi protocols
// (c) Gearbox Holdings, 2021
pragma solidity ^0.8.10;
import { IVersion } from "./IVersion.sol";

interface IDegenNFTExceptions {
    /// @dev Thrown if an access-restricted function was called by non-CreditFacade
    error CreditFacadeOrConfiguratorOnlyException();

    /// @dev Thrown if an access-restricted function was called by non-minter
    error MinterOnlyException();

    /// @dev Thrown if trying to add a burner address that is not a correct Credit Facade
    error InvalidCreditFacadeException();

    /// @dev Thrown if the account's balance is not sufficient for an action (usually a burn)
    error InsufficientBalanceException();
}

interface IDegenNFT is IDegenNFTExceptions, IVersion {
    /// @dev address of the current minter
    function minter() external view returns (address);

    /// @dev Stores the total number of tokens on holder accounts
    function totalSupply() external view returns (uint256);

    /// @dev Stores the base URI for NFT metadata
    function baseURI() external view returns (string memory);

    /// @dev Mints a specified amount of tokens to the address
    /// @param to Address the tokens are minted to
    /// @param amount The number of tokens to mint
    function mint(address to, uint256 amount) external;

    /// @dev Burns a number of tokens from a specified address
    /// @param from The address a token will be burnt from
    /// @param amount The number of tokens to burn
    function burn(address from, uint256 amount) external;
}
