import express from 'express';
import { addAverage, getAverages } from '../controllers/averageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', addAverage);
router.get('/', getAverages);

export default router;
