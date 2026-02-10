import express from 'express';
import { resetController } from '../controllers/resetController.js';
const router = express.Router();

router.post('/', resetController);


export default router;