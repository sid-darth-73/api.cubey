import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  sendChallenge,
  getPendingChallenge,
  respondToChallenge,
  markReady,
  submitSolve,
  getRoomState,
  getBattleHistory,
} from '../controllers/battleController.js';

const router = express.Router();

// All battle routes require authentication
router.use(authMiddleware);

router.post('/challenge', sendChallenge);             // POST   /battles/challenge
router.get('/pending', getPendingChallenge);           // GET    /battles/pending
router.post('/:challengeId/respond', respondToChallenge); // POST /battles/:challengeId/respond
router.get('/history', getBattleHistory);             // GET    /battles/history
router.get('/room/:roomId', getRoomState);            // GET    /battles/room/:roomId
router.post('/:roomId/ready', markReady);             // POST   /battles/:roomId/ready
router.post('/:roomId/submit', submitSolve);          // POST   /battles/:roomId/submit

export default router;
