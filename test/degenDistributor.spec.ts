/*
 * SPDX-License-Identifier: BUSL-1.1
 * Gearbox. Generalized leverage protocol, which allows to take leverage and then use it across other DeFi protocols and platforms in a composable way.
 * (c) Gearbox.fi, 2021
 */

import { deploy, waitForTransaction } from "@gearbox-protocol/devops";
import { WAD } from "@gearbox-protocol/sdk";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "ethers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { Suite } from "mocha";
import { Logger } from "tslog";
import {
  DegenDistributorInfo,
  ClaimableBalance,
  parseBalanceMap,
} from "../merkle/parse-accounts";
import { deployDistributor } from "../scripts/deployer";
import {
  DegenDistributor,
  DegenDistributor__factory,
  DegenNFTMock,
} from "../types";
import { AddressProviderMock } from "../types/contracts/test/AddressProviderMock";

const DUMB_ADDRESS = "0x5D4FF1249abf08F01AC57e1f5060BFfD55EC3692";
const DUMB_ADDRESS2 = "0x7BAFC0D5c5892f2041FD9F2415A7611042218e22";

describe("Degen distributor tests", function (this: Suite) {
  this.timeout(0);

  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user: SignerWithAddress;

  let degenDistributor: DegenDistributor;
  let info: DegenDistributorInfo;
  let token: DegenNFTMock;
  let log: Logger;

  let claimed: Array<ClaimableBalance>;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();

    deployer = accounts[0];
    treasury = accounts[1];
    user = accounts[2];

    log = new Logger();

    token = await deploy<DegenNFTMock>(
      "DegenNFTMock",
      log,
      "Distributed token",
      "DIS"
    );

    let addressProviderMock = await deploy<AddressProviderMock>(
      "AddressProviderMock",
      log,
      treasury.address
    );

    const distributed: Array<ClaimableBalance> = [
      { address: DUMB_ADDRESS, amount: 5 },
      { address: DUMB_ADDRESS2, amount: 2 },
    ];

    [degenDistributor, info] = await deployDistributor(
      addressProviderMock.address,
      token.address,
      distributed,
      log,
      {}
    );
  });

  it(`[DD-1]: constructor sets correct parameters`, async () => {
    expect(await degenDistributor.merkleRoot()).to.be.eq(info.merkleRoot);

    expect(await degenDistributor.degenNFT()).to.be.eq(token.address);

    expect(await degenDistributor.treasury()).to.be.eq(treasury.address);
  });


  it(`[DD-2]: claim works correctly`, async () => {
    const nodeInfo = info.claims[DUMB_ADDRESS];

    const tx = await waitForTransaction(
      degenDistributor.claim(
        nodeInfo.index,
        DUMB_ADDRESS,
        5,
        nodeInfo.proof
      )
    );

    const event = DegenDistributor__factory.createInterface().decodeEventLog(
      "Claimed",
      tx.logs[tx.logs.length - 1].data,
      tx.logs[tx.logs.length - 1].topics
    );

    expect(event.account).to.be.eq(DUMB_ADDRESS);
    expect(event.amount).to.be.eq(5);

    expect(await token.balanceOf(DUMB_ADDRESS)).to.be.eq(5);
  });

  it(`[DD-3]: claim reverts on incorrect proof`, async () => {
    const nodeInfo = info.claims[DUMB_ADDRESS];

    expect(
      degenDistributor.claim(
        nodeInfo.index,
        DUMB_ADDRESS,
        WAD.mul(1001),
        nodeInfo.proof
      )
    ).to.be.revertedWith("MerkleDistributor: Invalid proof.");
  });

  it(`[DD-4]: claim reverts on attempting to claim zero`, async () => {
    const nodeInfo = info.claims[DUMB_ADDRESS];

    await degenDistributor.claim(
      nodeInfo.index,
      DUMB_ADDRESS,
      5,
      nodeInfo.proof
    );

    expect(
      degenDistributor.claim(
        nodeInfo.index,
        DUMB_ADDRESS,
        5,
        nodeInfo.proof
      )
    ).to.be.revertedWith(
      "MerkleDistributor: Nothing to claim"
    );
  });

  it(`[DD-5]: updateMerkleRoot works correctly`, async () => {
    const recipients: Array<ClaimableBalance> = [
      { address: DUMB_ADDRESS, amount: 7 },
      { address: DUMB_ADDRESS2, amount: 4 },
    ];

    const newInfo = parseBalanceMap(recipients);

    const tx = await waitForTransaction(
      degenDistributor.connect(treasury).updateMerkleRoot(newInfo.merkleRoot)
    );

    const event = DegenDistributor__factory.createInterface().decodeEventLog(
      "RootUpdated",
      tx.logs[0].data,
      tx.logs[0].topics
    );

    expect(event.oldRoot).to.be.eq(info.merkleRoot);
    expect(event.newRoot).to.be.eq(newInfo.merkleRoot);

    expect(await degenDistributor.merkleRoot()).to.be.eq(newInfo.merkleRoot);
  });

  it(`[DD-6]: subsequent claims work correctly after root update`, async () => {
    let nodeInfo = info.claims[DUMB_ADDRESS];

    await waitForTransaction(
      degenDistributor.claim(
        nodeInfo.index,
        DUMB_ADDRESS,
        5,
        nodeInfo.proof
      )
    );

    const recipients: Array<ClaimableBalance> = [
      { address: DUMB_ADDRESS, amount: 7 },
      { address: DUMB_ADDRESS2, amount: 4 },
    ];

    const newInfo = parseBalanceMap(recipients);

    await waitForTransaction(
      degenDistributor.connect(treasury).updateMerkleRoot(newInfo.merkleRoot)
    );

    nodeInfo = newInfo.claims[DUMB_ADDRESS];

    await waitForTransaction(
      degenDistributor.claim(
        nodeInfo.index,
        DUMB_ADDRESS,
        7,
        nodeInfo.proof
      )
    );

    expect(await token.balanceOf(DUMB_ADDRESS)).to.be.eq(7);

    expect(await degenDistributor.claimed(DUMB_ADDRESS)).to.be.eq(
      7
    );

    expect(
      degenDistributor.claim(
        nodeInfo.index,
        DUMB_ADDRESS,
        7,
        nodeInfo.proof
      )
    ).to.be.revertedWith(
      "MerkleDistributor: Nothing to claim"
    );
  });

  it(`[DD-7]: updateMerkleRoot reverts on called by address with no access`, async () => {
    expect(
      degenDistributor.connect(user).updateMerkleRoot(info.merkleRoot)
    ).to.be.revertedWith("TreasuryOnlyException()");

  });
});
