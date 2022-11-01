import { deploy, Verifier } from "@gearbox-protocol/devops";
import { Overrides } from "ethers";
import { Logger } from "tslog";
import {
  DegenDistributorInfo,
  ClaimableBalance,
  parseBalanceMap,
} from "../merkle/parse-accounts";
import { DegenDistributor } from "../types";

export async function deployDistributor(
  apAddress: string,
  degenNftAddress: string,
  distributed: ClaimableBalance[],
  log: Logger,
  fee?: Overrides
): Promise<[DegenDistributor, DegenDistributorInfo]> {
  log.info("Generating tree");
  const distributorInfo = parseBalanceMap(distributed);
  const verifier = new Verifier();
  log.info("Deploying distributor");

  const constructorArguments = [
    apAddress,
    degenNftAddress,
    distributorInfo.merkleRoot
  ];

  const airdropDistributor = await deploy<DegenDistributor>(
    "DegenDistributor",
    log,
    ...constructorArguments,
    fee
  );

  verifier.addContract({
    address: airdropDistributor.address,
    constructorArguments,
  });

  return [airdropDistributor, distributorInfo];
}
