import { Router } from 'express';
import healthRoutes from '../routes/health.routes.js';
import safeRoutes from '../routes/safe.routes.js';
import transactionRoutes from '../routes/transaction.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(safeRoutes);
router.use(transactionRoutes);

export default router;
