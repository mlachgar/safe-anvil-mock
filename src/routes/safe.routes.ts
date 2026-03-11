import { Router } from 'express';
import { SafeApiService } from '../services/safe-api.service.js';
import { getRouteParam, toSearchParams } from '../utils/request.utils.js';

const router = Router();

router.get('/v1/safes/:safe/', (req, res) => {
  res.json(SafeApiService.getSafe(getRouteParam(req.params.safe)));
});

router.get('/v2/safes/:safe/multisig-transactions/', (req, res) => {
  res.json(SafeApiService.listTransactions(getRouteParam(req.params.safe), toSearchParams(req.query)));
});

router.post('/v2/safes/:safe/multisig-transactions/', (req, res) => {
  const result = SafeApiService.createTransaction(getRouteParam(req.params.safe), req.body || {});
  res.status(201);
  res.json(result);
});

export default router;
