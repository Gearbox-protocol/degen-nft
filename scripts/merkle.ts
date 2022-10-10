import * as dotenv from "dotenv";
import * as fs from "fs";
import {
  MerkleDistributorInfo,
  NewFormat,
  parseBalanceMap,
} from "../merkle/parse-accounts";
import { degens } from "../degens";
import { Logger } from "tslog";
import { DegenDistributor } from "../types";
import { Verifier, deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { ethers } from "hardhat";
import { JsonRpcProvider } from "@ethersproject/providers";

async function deployMerkle() {
  dotenv.config({ path: ".env.goerli" });

  const DEGEN_NFT = process.env.REACT_APP_DEGEN_NFT || "";

  if (DEGEN_NFT === "") {
    throw new Error("Address provider is not set");
  }

  const log = new Logger();
  const verifier = new Verifier();
  log.info("generate merkle trees");

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  const provider = new JsonRpcProvider(process.env.ETH_MAINNET_PROVIDER);
  dotenv.config();

  const degensAddr: Array<NewFormat> = [];
  for (const d of degens) {
    const address = await provider.resolveName(d.address);
    if (address) {
      degensAddr.push({
        address,
        amount: d.amount,
      });
    }
  }

  const merkle = parseBalanceMap(degensAddr);

  const degenDistributor = await deploy<DegenDistributor>(
    "DegenDistributor",
    log,
    DEGEN_NFT,
    merkle.merkleRoot
  );

  verifier.addContract({
    address: degenDistributor.address,
    constructorArguments: [DEGEN_NFT, merkle.merkleRoot],
  });

  fs.writeFileSync("./merkle.json", JSON.stringify(merkle));
}

deployMerkle()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
