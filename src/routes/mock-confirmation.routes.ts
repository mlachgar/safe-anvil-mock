import { Router } from 'express';
import { MockConfirmationApiService } from '../services/mock-confirmation-api.service.js';
import { getRouteParam } from '../utils/request.utils.js';

const router = Router();

router.post('/mock/transactions/:safeTxHash/confirm/', async (req, res) => {
  const safeTxHash = String(getRouteParam(req.params.safeTxHash) || req.body?.safeTxHash || '');
  try {
    const result = await MockConfirmationApiService.confirmTransaction(safeTxHash, req.body || {});
    if (!result) {
      res.status(404).json({ detail: 'Unknown safeTxHash' });
      return;
    }

    res.json(result);
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
