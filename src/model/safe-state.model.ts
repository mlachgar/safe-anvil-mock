export interface SafeConfirmation {
  owner: string;
  submissionDate: string;
  signature: string;
  signatureType: 'ETH_SIGN';
}

export interface SafeTransactionData {
  to?: string;
  value?: string;
  data?: string;
  operation?: number;
}

export interface SafeTransactionRecord {
  safe: string;
  safeTxHash: string;
  nonce: string;
  executed: boolean;
  isExecuted: boolean;
  txStatus: string;
  executionDate: string | null;
  submissionDate: string;
  modified: string;
  confirmationsRequired: number;
  confirmations: SafeConfirmation[];
  trusted: boolean;
  signatures: Record<string, string>;
  owners: string[];
  transactionHash?: string;
  safeTransactionData?: SafeTransactionData;
  [key: string]: unknown;
}

export interface SafeState {
  address: string;
  nonce: string;
  threshold: number;
  owners: string[];
  txs: SafeTransactionRecord[];
}
