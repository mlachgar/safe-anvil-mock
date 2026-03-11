import { Router } from 'express';
import healthRoutes from '../routes/health.routes.js';
import mockConfirmationRoutes from '../routes/mock-confirmation.routes.js';
import safeRoutes from '../routes/safe.routes.js';
import safeTransactionRoutes from '../routes/safe-transaction.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(safeRoutes);
router.use(safeTransactionRoutes);
router.use(mockConfirmationRoutes);

export default router;
