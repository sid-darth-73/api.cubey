import express from 'express';
import { updateBestTime, getAllBestTimes, getBestTimeForAlgo, resetBestTime } from '../controllers/learnController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();



router.use(authMiddleware);

router.post("/update", updateBestTime);
router.get("/all", getAllBestTimes);
router.get("/:algoId", getBestTimeForAlgo);
router.delete("/reset/:algoId", resetBestTime);

export default router;
