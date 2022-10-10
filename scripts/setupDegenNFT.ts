import {
  detectNetwork,
  impersonate,
  waitForTransaction,
} from "@gearbox-protocol/devops";
import { getNetworkType, IACL__factory } from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { Logger } from "tslog";

import { AddressProvider__factory, DegenNFT__factory } from "../types";

async function setupDegenNFT() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  // Gets current chainId
  const chainId = await accounts[0].getChainId();

  const networkType =
    chainId === 1337 ? await detectNetwork() : getNetworkType(chainId);

  dotenv.config({
    path: networkType === "Goerli" ? ".env.goerli" : ".env.mainnet",
  });
  const log: Logger = new Logger();

  console.log("DEPLOYER", deployer.address);

  const addressProvider = process.env.REACT_APP_ADDRESS_PROVIDER || "";

  if (addressProvider === "") {
    throw new Error("Address provider is not set");
  }

  const degenNFT = process.env.REACT_APP_DEGEN_NFT || "";
  const degenDistributor = process.env.REACT_APP_DEGEN_DISTRIBUTOR || "";

  if (degenNFT === "" || degenDistributor === "") {
    console.error("degenNFT or degenDistributor is not set");
    process.exit(1);
  }

  const ap = AddressProvider__factory.connect(addressProvider, deployer);
  const acl = IACL__factory.connect(await ap.getACL(), deployer);

  const configurator = await acl.owner();

  let root = deployer;
  if (chainId === 1337) {
    root = await impersonate(configurator);
  }

  const nft = DegenNFT__factory.connect(degenNFT, deployer);

  await waitForTransaction(
    nft.connect(root).setMinter(degenDistributor, { gasLimit: 20e6 })
  );
}

setupDegenNFT()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
