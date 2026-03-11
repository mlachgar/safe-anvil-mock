import { Router } from 'express';
import { SafeStoreService } from '../services/safe-store.service.js';
import { SafeTransactionService } from '../services/safe-transaction.service.js';
import { toQueryParamValue } from '../utils/payload.utils.js';

const router = Router();

router.get('/v1/safes/:safe/', (req, res) => {
  const safe = SafeStoreService.ensureSafe(req.params.safe);
  res.json({
    address: safe.address,
    nonce: safe.nonce,
    threshold: safe.threshold,
    owners: safe.owners,
    masterCopy: '0x0000000000000000000000000000000000000009',
    modules: [],
    fallbackHandler: null,
    guard: null,
    version: '1.4.1',
  });
});

router.get('/v2/safes/:safe/multisig-transactions/', (req, res) => {
  const safe = SafeStoreService.ensureSafe(req.params.safe);
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalizedItem = toQueryParamValue(item);
        if (normalizedItem != null) {
          searchParams.append(key, normalizedItem);
        }
      }
    } else {
      const normalizedValue = toQueryParamValue(value);
      if (normalizedValue != null) {
        searchParams.set(key, normalizedValue);
      }
    }
  }

  res.json(SafeStoreService.listTransactions(safe, searchParams));
});

router.post('/v2/safes/:safe/multisig-transactions/', (req, res) => {
  const safe = SafeStoreService.ensureSafe(req.params.safe);

  try {
    const tx = SafeTransactionService.createTransaction(safe, req.body || {});
    SafeStoreService.saveTransaction(safe, tx);
    res.status(201).json(tx);
  } catch (error) {
    res.status(400).json({ detail: error instanceof Error ? error.message : 'Invalid request' });
  }
});

export default router;
