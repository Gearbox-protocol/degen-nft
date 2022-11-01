import { detectNetwork, waitForTransaction } from "@gearbox-protocol/devops";
import { getNetworkType } from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { BigNumber } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { degens } from "../degens";
import { ClaimableBalance } from "../merkle/parse-accounts";
import { deployDistributor } from "./deployer";

const fee = {
  maxFeePerGas: BigNumber.from(55e9),
  maxPriorityFeePerGas: BigNumber.from(50e9),
};

async function deployDistributorLive() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log(`Deployer: ${deployer.address}`);

  const chainId = await deployer.getChainId();

  const networkType =
    chainId === 1337 ? await detectNetwork() : getNetworkType(chainId);

  dotenv.config({
    path: networkType == "Goerli" ? ".env.goerli" : ".env.mainnet",
  });

  const ADDRESS_PROVIDER = process.env.REACT_APP_ADDRESS_PROVIDER || "";

  const DEGEN_NFT = process.env.REACT_APP_DEGEN_NFT || "";

  console.log(`Address provider: ${ADDRESS_PROVIDER}`);

  if (ADDRESS_PROVIDER === "") {
    throw new Error("ADDRESS_PROVIDER token address unknown");
  }

  const log = new Logger();

  const distributed = degens;

  const [degenDistributor, merkle] = await deployDistributor(
    ADDRESS_PROVIDER,
    DEGEN_NFT,
    distributed,
    log,
    fee
  );

  fs.writeFileSync("./merkle.json", JSON.stringify(merkle));
}

deployDistributorLive()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
