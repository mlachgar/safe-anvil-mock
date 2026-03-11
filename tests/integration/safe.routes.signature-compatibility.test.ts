import express from 'express';
import request from 'supertest';
import { Wallet as WalletV6, getBytes as getBytesV6, hexlify as hexlifyV6, keccak256, toUtf8Bytes } from 'ethers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ethers as ethersV5 } from 'ethers5';
import safeRoutes from '../../src/routes/safe.routes.js';
import { SafeStoreService } from '../../src/services/safe-store.service.js';

const originalEnv = { ...process.env };
const safeAddress = '0x00000000000000000000000000000000000000a1';
const ownerPrivateKey = '0x' + '1'.repeat(64);
const ownerAddress = '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(safeRoutes);
  return app;
}

function buildProposalBody(safeTxHash: string, signature: string) {
  return {
    safeTxHash,
    nonce: 0,
    to: '0x00000000000000000000000000000000000000b2',
    value: '0',
    data: '0x',
    operation: 0,
    senderAddress: ownerAddress,
    senderSignature: signature,
  };
}

describe('safe.routes signature compatibility', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SYSTEM_PUBLIC_KEY: ownerAddress,
      SAFE_MOCK_THRESHOLD: '1',
    };
    SafeStoreService.reset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    SafeStoreService.reset();
  });

  it('accepts a proposal signed with ethers v5 signMessage(bytes)', async () => {
    const wallet = new ethersV5.Wallet(ownerPrivateKey);
    const safeTxHash = keccak256(toUtf8Bytes('ethers-v5-bytes'));
    const signature = await wallet.signMessage(ethersV5.utils.arrayify(safeTxHash));

    const response = await request(createApp())
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send(buildProposalBody(safeTxHash, signature));

    expect(response.status).toBe(201);
    expect(response.body.confirmations).toHaveLength(1);
    expect(response.body.signatures[ownerAddress]).toBe(signature);
  });

  it('accepts a proposal signed with ethers v6 signMessage(bytes)', async () => {
    const wallet = new WalletV6(ownerPrivateKey);
    const safeTxHash = keccak256(toUtf8Bytes('ethers-v6-bytes'));
    const signature = await wallet.signMessage(getBytesV6(safeTxHash));

    const response = await request(createApp())
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send(buildProposalBody(safeTxHash, signature));

    expect(response.status).toBe(201);
    expect(response.body.confirmations).toHaveLength(1);
    expect(response.body.signatures[ownerAddress]).toBe(signature);
  });

  it('accepts a proposal signed with ethers v6 signMessage(hex string)', async () => {
    const wallet = new WalletV6(ownerPrivateKey);
    const safeTxHash = keccak256(toUtf8Bytes('ethers-v6-string'));
    const signature = await wallet.signMessage(safeTxHash);

    const response = await request(createApp())
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send(buildProposalBody(safeTxHash, signature));

    expect(response.status).toBe(201);
    expect(response.body.confirmations).toHaveLength(1);
    expect(response.body.signatures[ownerAddress]).toBe(signature);
  });

  it('accepts a proposal signed with Safe eth_sign adjusted v encoding', async () => {
    const wallet = new WalletV6(ownerPrivateKey);
    const safeTxHash = keccak256(toUtf8Bytes('safe-adjusted-v'));
    const signature = await wallet.signMessage(getBytesV6(safeTxHash));
    const bytes = getBytesV6(signature);
    bytes[64] += 4;
    const safeSignature = hexlifyV6(bytes);

    const response = await request(createApp())
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send(buildProposalBody(safeTxHash, safeSignature));

    expect(response.status).toBe(201);
    expect(response.body.confirmations).toHaveLength(1);
    expect(response.body.signatures[ownerAddress]).toBe(safeSignature);
  });

  it('rejects a proposal signed by a non-owner across client versions', async () => {
    const wallet = new ethersV5.Wallet('0x' + '2'.repeat(64));
    const safeTxHash = keccak256(toUtf8Bytes('ethers-v5-outsider'));
    const signature = await wallet.signMessage(ethersV5.utils.arrayify(safeTxHash));

    const response = await request(createApp())
      .post(`/v2/safes/${safeAddress}/multisig-transactions/`)
      .send({
        ...buildProposalBody(safeTxHash, signature),
        senderAddress: wallet.address,
      });

    expect(response.status).toBe(500);
  });
});
