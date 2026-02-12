import express from 'express';
import { resetController, verificationController, passwordChangeController } from '../controllers/resetController.js';
const router = express.Router();

router.post('/', resetController);
router.post('/verify', verificationController);
router.post('/change', passwordChangeController);

export default router;