import { Wallet, ethers } from 'ethers';
import type { SafeTransactionRecord } from '../model/safe-state.model.js';
import { normalizePrivateKey } from '../utils/address.utils.js';
import { getExecutionPayloadFromRecord } from '../utils/payload.utils.js';

const fundedBalanceHex = '0x3635C9ADC5DEA00000';
const rpcUrl = process.env.RPC_URL;
const provider = rpcUrl ? new ethers.providers.JsonRpcProvider(rpcUrl) : null;

export class SafeExecutionService {
  static async executeTransaction(tx: SafeTransactionRecord): Promise<SafeTransactionRecord> {
    if (tx.isExecuted) {
      return tx;
    }

    const payload = getExecutionPayloadFromRecord(tx as Record<string, unknown>);
    await this.sendRpc('anvil_setBalance', [tx.safe, fundedBalanceHex]);
    await this.sendRpc('anvil_impersonateAccount', [tx.safe]);

    try {
      const onChainTxHash = await this.sendRpc('eth_sendTransaction', [
        {
          from: tx.safe,
          to: payload.to,
          value: payload.value,
          data: payload.data,
        },
      ]);

      const receipt = await provider?.waitForTransaction(onChainTxHash);
      if (receipt?.status !== 1) {
        throw new Error(`Transaction execution failed for ${tx.safeTxHash}`);
      }

      const now = new Date().toISOString();
      tx.executed = true;
      tx.isExecuted = true;
      tx.txStatus = 'SUCCESS';
      tx.executionDate = now;
      tx.modified = now;
      tx.transactionHash = onChainTxHash;
      return tx;
    } finally {
      await this.sendRpc('anvil_stopImpersonatingAccount', [tx.safe]).catch(() => undefined);
    }
  }

  static async buildAutoConfirmation(tx: SafeTransactionRecord): Promise<{ owner: string; signature: string }> {
    const confirmerPrivateKey = normalizePrivateKey(process.env.SAFE_MOCK_CONFIRMER_PRIVATE_KEY);
    if (!confirmerPrivateKey) {
      throw new Error('Missing SAFE_MOCK_CONFIRMER_PRIVATE_KEY');
    }

    const wallet = new Wallet(confirmerPrivateKey);
    const owner = wallet.address.toLowerCase();

    if (!tx.owners.includes(owner)) {
      throw new Error(`Configured confirmer ${owner} is not declared as a Safe owner`);
    }

    if (tx.signatures[owner]) {
      throw new Error(`Configured confirmer ${owner} already confirmed ${tx.safeTxHash}`);
    }

    return {
      owner,
      signature: await wallet.signMessage(ethers.utils.arrayify(tx.safeTxHash)),
    };
  }
  private static async sendRpc(method: string, params: unknown[]): Promise<any> {
    if (!provider) {
      throw new Error('Missing RPC_URL configuration');
    }

    return provider.send(method, params);
  }
}
