import { JsonRpcProvider } from "@ethersproject/providers";
import { deploy, detectNetwork, Verifier } from "@gearbox-protocol/devops";
import { getNetworkType } from "@gearbox-protocol/sdk";
import * as dotenv from "dotenv";
import { BigNumber } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { degens } from "../degens";
import { NewFormat, parseBalanceMap } from "../merkle/parse-accounts";
import { DegenDistributor, ISanctioned__factory } from "../types";

export const fee = {
  maxFeePerGas: BigNumber.from(105e9),
  maxPriorityFeePerGas: BigNumber.from(4e9),
};

const CHAINALYSIS_OFAC_ORACLE = "0x40c57923924b5c5c5455c48d93317139addac8fb";

async function deployMerkle() {
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

  const DEGEN_NFT = process.env.REACT_APP_DEGEN_NFT || "";

  if (DEGEN_NFT === "") {
    throw new Error("Address provider is not set");
  }

  log.info("generate merkle trees");

  const provider = new JsonRpcProvider(process.env.ETH_MAINNET_PROVIDER);
  dotenv.config();

  const chainalysis = ISanctioned__factory.connect(
    CHAINALYSIS_OFAC_ORACLE,
    provider
  );

  const degensAddr: Array<NewFormat> = [];
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

  const merkle = parseBalanceMap(degensAddr);

  // const degenDistributor = await deploy<DegenDistributor>(
  //   "DegenDistributor",
  //   log,
  //   DEGEN_NFT,
  //   merkle.merkleRoot,
  //   fee
  // );

  // verifier.addContract({
  //   address: degenDistributor.address,
  //   constructorArguments: [DEGEN_NFT, merkle.merkleRoot],
  // });

  fs.writeFileSync(
    `./merkle_${networkType.toLowerCase()}.json`,
    JSON.stringify(merkle)
  );
}

deployMerkle()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
