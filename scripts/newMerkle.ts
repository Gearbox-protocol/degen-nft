import { detectNetwork } from "@gearbox-protocol/devops";
import { MCall, getNetworkType, multicall } from "@gearbox-protocol/sdk-gov";
import * as dotenv from "dotenv";
import { providers } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";
import { Logger } from "tslog";
import { ClaimableBalance, parseBalanceMap } from "../core/parse-accounts";
import { degens } from "../degens";
import { IDegenDistributor__factory, ISanctioned__factory } from "../types";

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
    throw new Error("DEGEN_DISTRIBUTOR address unknown");
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

  const degensAddresses: Array<string> = [];
  for (const d of degens) {
    const address = await provider.resolveName(d.address);

    if (address === null) {
      log.error(`Cant resolve ${d.address}`);
      process.exit(1);
    }

    degensAddresses.push(address);
  }

  console.log(degensAddresses.length);

  const sactionedInterface = ISanctioned__factory.createInterface();

  let calls: Array<MCall<typeof sactionedInterface>> = degensAddresses.map(
    (address) => ({
      address: CHAINALYSIS_OFAC_ORACLE,
      interface: sactionedInterface,
      method: "isSanctioned(address)",
      params: [address],
    })
  );

  const result = await multicall(calls, provider);

  const sanctioned: Array<string> = [];

  result.forEach((r, i) => {
    if (r) {
      sanctioned.push(degensAddresses[i]);
    }
  });

  if (sanctioned.length > 0) {
    console.log(
      `Found ${sanctioned.length} addresses: ${sanctioned.join(", ")}`
    );
    process.exit(2);
  }

  const degenDistributorInterface =
    IDegenDistributor__factory.createInterface();

  const calls2: Array<MCall<typeof degenDistributorInterface>> =
    degensAddresses.map((address) => ({
      address: DEGEN_DISTRIBUTOR,
      interface: degenDistributorInterface,
      method: "claimed(address)",
      params: [address],
    }));

  const result2 = await multicall(calls2, provider);

  result2.forEach((r, i) => {
    if (r.gt(degens[i].amount)) {
      throw new Error(
        `${degensAddresses[i]} already claimed more than in merkle ${degens[i].amount}`
      );
    }
  });

  const merkle = parseBalanceMap(degens);

  fs.writeFileSync(
    `./merkle/${networkType.toLowerCase()}_${merkle.merkleRoot}.json`,
    JSON.stringify(merkle)
  );

  log.warn(`MERKLE_ROOT: ${merkle.merkleRoot}`);
}

generateMerkle()
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
