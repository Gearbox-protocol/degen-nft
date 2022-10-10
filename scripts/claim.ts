import { waitForTransaction } from "@gearbox-protocol/devops";
import { ethers } from "hardhat";
import merkleData from "../merkle.json";
import { DegenDistributor__factory } from "../types";
import { MerkleDistributorInfo } from "../merkle/parse-accounts";

const DEGEN_DISTRIBUTOR = "0x75f74B4A665BFcc78df0Ff82c2eB677E610B7313";

const ACCOUNT = "0x07C867770C43B1c6b715Aa8AC3A55DfD7f835a82";

async function claim(account: string) {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  const degenDistributor = DegenDistributor__factory.connect(
    DEGEN_DISTRIBUTOR,
    deployer
  );

  const claimData = (merkleData as MerkleDistributorInfo).claims[account];

  await waitForTransaction(
    degenDistributor.claim(
      claimData.index,
      account,
      claimData.amount,
      claimData.proof
    )
  );
}

claim(ACCOUNT)
  .then(() => console.log("Ok"))
  .catch((e) => console.log(e));
