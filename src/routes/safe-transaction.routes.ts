import { Router } from 'express';
import { ConfirmationService } from '../services/confirmation.service.js';
import { SafeStoreService } from '../services/safe-store.service.js';
import { getRouteParam } from '../utils/request.utils.js';

const router = Router();

router.get('/v2/multisig-transactions/:safeTxHash/', (req, res) => {
  const tx = SafeStoreService.getTransaction(getRouteParam(req.params.safeTxHash));
  if (!tx) {
    res.status(404).json({ detail: 'Not found.' });
    return;
  }

  res.json(tx);
});

router.get('/v1/multisig-transactions/:safeTxHash/confirmations/', (req, res) => {
  const tx = SafeStoreService.getTransaction(getRouteParam(req.params.safeTxHash));
  if (!tx) {
    res.status(404).json({ detail: 'Not found.' });
    return;
  }

  res.json(ConfirmationService.listConfirmations(tx));
});

router.post('/v1/multisig-transactions/:safeTxHash/confirmations/', async (req, res) => {
  const tx = SafeStoreService.getTransaction(getRouteParam(req.params.safeTxHash));
  if (!tx) {
    res.status(404).json({ detail: 'Not found.' });
    return;
  }

  try {
    const result = await ConfirmationService.addConfirmation(tx, req.body || {});
    res.status(201).json(result);
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
    const detail = error instanceof Error ? error.message : 'Invalid request';
    res.status(status).json({ detail });
  }
});

export default router;
