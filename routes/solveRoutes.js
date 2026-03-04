import express from 'express';
import { addSolve, getSolves, deleteSolve, addBatchSolves, resetSession, updateSolve } from '../controllers/solveController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware); 



router.post('/', addSolve);
router.post('/batch', addBatchSolves);
router.post('/reset', resetSession);
router.get('/', getSolves);
router.delete('/:id', deleteSolve);
router.patch('/:id', updateSolve);

export default router;
