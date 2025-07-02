import express from 'express';
import { addSolve, getSolves, deleteSolve } from '../controllers/solveController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware); 



router.post('/', addSolve);
router.get('/', getSolves);
router.delete('/:id', deleteSolve);

export default router;
