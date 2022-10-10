import { deploy, Verifier, waitForTransaction } from "@gearbox-protocol/devops";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { degens } from "../degens";
import {
  MerkleDistributorInfo,
  NewFormat,
  parseBalanceMap,
} from "../merkle/parse-accounts";
import { DegenDistributor } from "../types";
import { DegenNFT } from "../types/@gearbox-protocol/core-v2/contracts/tokens";
import { AddressProvider__factory } from "../types/factories/@gearbox-protocol/core-v2/contracts/core";

async function deployDegenNFT() {
  dotenv.config({ path: ".env.goerli" });
  const log = new Logger();
  const verifier = new Verifier();

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log(deployer.address);

  const addressProvider = process.env.REACT_APP_ADDRESS_PROVIDER || "";

  if (addressProvider === "") {
    throw new Error("Address provider is not set");
  }

  const constructorArguments = [addressProvider, "DegenNFT", "DNFT"];

  const degenNFT = await deploy<DegenNFT>(
    "DegenNFT",
    log,
    ...constructorArguments
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
