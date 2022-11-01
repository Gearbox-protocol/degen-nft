import { deploy, detectNetwork, Verifier } from "@gearbox-protocol/devops";
import { getNetworkType } from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { DegenNFT } from "../types";

export const fee = {
  maxFeePerGas: BigNumber.from(105e9),
  maxPriorityFeePerGas: BigNumber.from(3e9),
};

async function deployDegenNFT() {
  const log = new Logger();
  const verifier = new Verifier();

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  // Gets current chainId
  const chainId = await accounts[0].getChainId();

  const networkType =
    chainId === 1337 ? await detectNetwork() : getNetworkType(chainId);

  dotenv.config({
    path: networkType === "Goerli" ? ".env.goerli" : ".env.mainnet",
  });

  log.warn(`Chain: ${networkType}`);
  log.warn(`Deployer address: ${deployer.address}`);

  const addressProvider = process.env.REACT_APP_ADDRESS_PROVIDER || "";

  if (addressProvider === "") {
    throw new Error("Address provider is not set");
  }

  const constructorArguments = [addressProvider, "DegenNFT", "DNFT"];

  const degenNFT = await deploy<DegenNFT>(
    "DegenNFT",
    log,
    ...constructorArguments,
    fee
  );

  verifier.addContract({
    address: degenNFT.address,
    constructorArguments,
  });

  console.log(degenNFT.address);
}

deployDegenNFT()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
