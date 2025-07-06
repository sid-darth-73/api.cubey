import express from 'express';
import { getPbs } from '../controllers/pbController.js';
const router = express.Router();

router.get("/:shareLink", getPbs);

export default router;