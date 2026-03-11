import type { Request, Response } from 'express';
import { Router } from 'express';
import { SafeExecutionService } from '../services/safe-execution.service.js';
import { SafeStoreService } from '../services/safe-store.service.js';
import { SafeTransactionService } from '../services/safe-transaction.service.js';

const router = Router();

router.get('/v2/multisig-transactions/:safeTxHash/', (req, res) => {
  const tx = SafeStoreService.getTransaction(req.params.safeTxHash);
  if (!tx) {
    res.status(404).json({ detail: 'Not found.' });
    return;
  }

  res.json(tx);
});


router.post('/transactions/:safeTxHash/confirm/', confirmTransaction);

async function confirmTransaction(req: Request, res: Response) {
  const body = req.body || {};
  const safeTxHash = String(req.params.safeTxHash || body.safeTxHash || '');
  const tx = SafeStoreService.getTransaction(safeTxHash);

  if (!tx) {
    res.status(404).json({ detail: 'Unknown safeTxHash' });
    return;
  }

  if (tx.isExecuted) {
    res.json(tx);
    return;
  }

  try {
    const input = SafeTransactionService.getConfirmationInput(body);
    let owner: string | null = null;
    let signature: string | null = null;

    if (input.signature) {
      owner = SafeTransactionService.validateConfirmation(SafeStoreService.ensureSafe(tx.safe), tx.safeTxHash, input.owner, input.signature);
      signature = input.signature;
    } else if (tx.confirmations.length < tx.confirmationsRequired) {
      const autoConfirmation = await SafeExecutionService.buildAutoConfirmation(tx);
      owner = autoConfirmation.owner;
      signature = autoConfirmation.signature;
    }

    if (owner && signature) {
      SafeTransactionService.addConfirmation(tx, owner, signature);
    }

    if (tx.confirmations.length >= tx.confirmationsRequired) {
      await SafeExecutionService.executeTransaction(tx);
    }
  } catch (error) {
    res.status(400).json({ detail: error instanceof Error ? error.message : 'Invalid request' });
    return;
  }

  res.json(tx);
}


export default router;
