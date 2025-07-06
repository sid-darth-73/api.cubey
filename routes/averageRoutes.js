import express from 'express';
import { addAverage, getAverages, deleteAverage } from '../controllers/averageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);



router.post('/', addAverage);
router.get('/', getAverages);
router.delete('/:id', deleteAverage);

export default router;
