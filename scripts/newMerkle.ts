import { detectNetwork } from "@gearbox-protocol/devops";
import { getNetworkType } from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { BigNumber, providers } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { degens } from "../degens";
import { ClaimableBalance, parseBalanceMap } from "../core/parse-accounts";
import {
  IDegenDistributor__factory,
  IDegenNFT__factory,
  ISanctioned__factory,
} from "../types";
import { deployDistributor } from "./deployer";

const CHAINALYSIS_OFAC_ORACLE = "0x40c57923924b5c5c5455c48d93317139addac8fb";

async function generateMerkle() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  console.log(`Deployer: ${deployer.address}`);

  const chainId = await deployer.getChainId();

  const networkType =
    chainId === 1337 ? await detectNetwork() : getNetworkType(chainId);

  dotenv.config({
    path: networkType == "Goerli" ? ".env.goerli" : ".env.mainnet",
  });

  const DEGEN_DISTRIBUTOR = process.env.REACT_APP_DEGEN_DISTRIBUTOR || "";

  console.log(`Degen NFT: ${DEGEN_DISTRIBUTOR}`);

  if (DEGEN_DISTRIBUTOR === "") {
    throw new Error("ADDRESS_PROVIDER token address unknown");
  }

  const log = new Logger();

  const degenDistributor = IDegenDistributor__factory.connect(
    DEGEN_DISTRIBUTOR,
    deployer
  );

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

    const claimed = await degenDistributor.claimed(address);

    if (claimed.gt(d.amount)) {
      throw new Error(
        `${address} already claimed more than in merkle ${d.amount}`
      );
    }
  }

  const merkle = parseBalanceMap(degens);

  fs.writeFileSync(
    `./merkle/${networkType.toLowerCase()}_${merkle.merkleRoot}.json`,
    JSON.stringify(merkle)
  );
}

generateMerkle()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
