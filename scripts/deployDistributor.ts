import { detectNetwork } from "@gearbox-protocol/devops";
import { getNetworkType } from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { BigNumber, providers } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { degens } from "../degens";
import { ClaimableBalance } from "../merkle/parse-accounts";
import { ISanctioned__factory } from "../types";
import { deployDistributor } from "./deployer";

const CHAINALYSIS_OFAC_ORACLE = "0x40c57923924b5c5c5455c48d93317139addac8fb";

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

  const provider = new providers.JsonRpcProvider(
    process.env.ETH_MAINNET_PROVIDER
  );

  const chainalysis = ISanctioned__factory.connect(
    CHAINALYSIS_OFAC_ORACLE,
    provider
  );

  const degensAddr: Array<ClaimableBalance> = [];
  for (const d of degens) {
    const address = await provider.resolveName(d.address);

    if (address === null) {
      log.error(`Cant resolve ${d.address}`);
      process.exit(1);
    }

    const isForbidden = await chainalysis.isSanctioned(address);
    if (isForbidden) {
      log.error(`${address} is in sanctioned list`);
      process.exit(2);
    } else {
      console.debug(`${address} is pass chainalisys`);
    }
    if (address) {
      degensAddr.push({
        address,
        amount: d.amount,
      });
    }
  }

  const [, merkle] = await deployDistributor(
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
