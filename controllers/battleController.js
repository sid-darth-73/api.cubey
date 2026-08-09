import { UserModel } from '../models/Users.js';
import { BattleChallengeModel } from '../models/BattleChallenge.js';
import { BattleRoomModel } from '../models/BattleRoom.js';
import { generateScramble } from '../services/scramble-generator.js';
import { getIO } from '../socket.js';

// ── POST /battles/challenge ───────────────────────────────────────────────────
export const sendChallenge = async (req, res) => {
  try {
    const challengerId = req.user.userId;
    const { challengeeId, puzzleType = '3x3' } = req.body;

    if (!challengeeId) {
      return res.status(400).json({ message: 'challengeeId is required' });
    }
    if (challengerId === challengeeId) {
      return res.status(400).json({ message: 'You cannot challenge yourself' });
    }

    // Verify challengee exists
    const challengee = await UserModel.findById(challengeeId).select('email shareLink');
    if (!challengee) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Block duplicate pending challenges between the same two users
    const existing = await BattleChallengeModel.findOne({
      challengerId,
      challengeeId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (existing) {
      return res.status(409).json({ message: 'A pending challenge already exists' });
    }

    const challenge = await BattleChallengeModel.create({
      challengerId,
      challengeeId,
      puzzleType,
    });

    // Fetch challenger info to include in the push event
    const challenger = await UserModel.findById(challengerId).select('email shareLink');

    // Push real-time notification to challengee's personal room
    getIO().to(`user:${challengeeId}`).emit('challenge:incoming', {
      challengeId: challenge._id,
      challenger: {
        id: challenger._id,
        email: challenger.email,
        shareLink: challenger.shareLink,
      },
      puzzleType: challenge.puzzleType,
      expiresAt: challenge.expiresAt,
    });

    return res.status(201).json({
      challengeId: challenge._id,
      expiresAt: challenge.expiresAt,
    });
  } catch (err) {
    console.error('[sendChallenge]', err);
    return res.status(500).json({ error: 'Failed to send challenge' });
  }
};

// ── GET /battles/pending ──────────────────────────────────────────────────────
// Fallback for when a user refreshes the page and may have missed the socket event
export const getPendingChallenge = async (req, res) => {
  try {
    const userId = req.user.userId;

    const challenge = await BattleChallengeModel.findOne({
      challengeeId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 }); // oldest first

    if (!challenge) return res.status(404).json({ message: 'No pending challenges' });

    const challenger = await UserModel.findById(challenge.challengerId).select('email shareLink');

    return res.status(200).json({
      challengeId: challenge._id,
      challenger: {
        id: challenger._id,
        email: challenger.email,
        shareLink: challenger.shareLink,
      },
      puzzleType: challenge.puzzleType,
      expiresAt: challenge.expiresAt,
    });
  } catch (err) {
    console.error('[getPendingChallenge]', err);
    return res.status(500).json({ error: 'Failed to fetch pending challenge' });
  }
};

// ── POST /battles/:challengeId/respond ────────────────────────────────────────
export const respondToChallenge = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { challengeId } = req.params;
    const { accept } = req.body;

    const challenge = await BattleChallengeModel.findById(challengeId);

    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
    if (challenge.challengeeId.toString() !== userId) {
      return res.status(403).json({ message: 'Not your challenge to respond to' });
    }
    if (challenge.status !== 'pending') {
      return res.status(410).json({ message: `Challenge is already ${challenge.status}` });
    }
    if (challenge.expiresAt < new Date()) {
      challenge.status = 'expired';
      await challenge.save();
      return res.status(410).json({ message: 'Challenge has expired' });
    }

    const io = getIO();

    if (!accept) {
      challenge.status = 'rejected';
      await challenge.save();

      io.to(`user:${challenge.challengerId}`).emit('challenge:rejected', {
        challengeId: challenge._id,
      });
      return res.status(200).json({ message: 'Challenge rejected' });
    }

    // ── ACCEPT ───────────────────────────────────────────────────────────────
    challenge.status = 'accepted';
    await challenge.save();

    const scramble = generateScramble(); // server-authoritative

    const room = await BattleRoomModel.create({
      challengeId: challenge._id,
      players: [challenge.challengerId, challenge.challengeeId],
      scramble,
      puzzleType: challenge.puzzleType,
    });

    const roomPayload = {
      roomId: room._id,
      scramble: room.scramble,
      puzzleType: room.puzzleType,
      players: room.players,
    };

    // Add both players to the battle socket room
    io.to(`user:${challenge.challengerId}`).emit('battle:room_created', roomPayload);
    io.to(`user:${challenge.challengeeId}`).emit('battle:room_created', roomPayload);

    return res.status(200).json({ battleRoomId: room._id });
  } catch (err) {
    console.error('[respondToChallenge]', err);
    return res.status(500).json({ error: 'Failed to respond to challenge' });
  }
};

// ── POST /battles/:roomId/ready ───────────────────────────────────────────────
export const markReady = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const room = await BattleRoomModel.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Battle room not found' });

    const isPlayer = room.players.some((p) => p.toString() === userId);
    if (!isPlayer) return res.status(403).json({ message: 'You are not in this battle' });

    if (room.status !== 'waiting') {
      return res.status(409).json({ message: 'Battle already started or finished' });
    }

    const alreadyReady = room.readyPlayers.some((p) => p.toString() === userId);
    if (!alreadyReady) {
      room.readyPlayers.push(userId);
    }

    const io = getIO();
    io.to(`battle:${roomId}`).emit('battle:opponent_ready', { userId });

    // Both players ready — start the battle
    if (room.readyPlayers.length === 2) {
      room.status = 'in_progress';
      room.startedAt = new Date();
      await room.save();

      io.to(`battle:${roomId}`).emit('battle:start', {
        startedAt: room.startedAt,
        scramble: room.scramble,
      });
    } else {
      await room.save();
    }

    return res.status(200).json({ message: 'Marked as ready' });
  } catch (err) {
    console.error('[markReady]', err);
    return res.status(500).json({ error: 'Failed to mark ready' });
  }
};

// ── POST /battles/:roomId/submit ──────────────────────────────────────────────
export const submitSolve = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { timeMs, penalty = '' } = req.body;

    const room = await BattleRoomModel.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Battle room not found' });

    const isPlayer = room.players.some((p) => p.toString() === userId);
    if (!isPlayer) return res.status(403).json({ message: 'You are not in this battle' });

    if (room.status !== 'in_progress') {
      return res.status(409).json({ message: 'Battle is not in progress' });
    }

    const alreadySubmitted = room.results.some((r) => r.userId.toString() === userId);
    if (alreadySubmitted) {
      return res.status(409).json({ message: 'You have already submitted' });
    }

    // Basic anti-cheat: reject inhumanly fast times
    if (penalty !== 'DNF' && timeMs < 300) {
      return res.status(400).json({ message: 'Invalid time submitted' });
    }

    // Compute effective time for winner determination
    let effectiveTime;
    if (penalty === 'DNF') effectiveTime = Infinity;
    else if (penalty === '+2') effectiveTime = timeMs + 2000;
    else effectiveTime = timeMs;

    room.results.push({ userId, timeMs, penalty, effectiveTime, submittedAt: new Date() });

    const io = getIO();

    // Notify opponent that this player has finished (without revealing the time yet)
    io.to(`battle:${roomId}`).emit('battle:opponent_submitted', { userId });

    // Both players have submitted — determine winner
    if (room.results.length === 2) {
      const [r1, r2] = room.results;

      if (r1.effectiveTime === r2.effectiveTime) {
        room.isDraw = true;
      } else {
        const winner = r1.effectiveTime < r2.effectiveTime ? r1 : r2;
        room.winnerId = winner.userId;
      }

      room.status = 'completed';
      room.completedAt = new Date();
      await room.save();

      io.to(`battle:${roomId}`).emit('battle:result', {
        winnerId: room.winnerId,
        isDraw: room.isDraw,
        results: room.results.map((r) => ({
          userId: r.userId,
          timeMs: r.timeMs,
          penalty: r.penalty,
          effectiveTime: r.effectiveTime,
        })),
      });

      return res.status(200).json({
        message: 'Battle complete',
        waitingForOpponent: false,
      });
    }

    await room.save();
    return res.status(200).json({ message: 'Solve submitted', waitingForOpponent: true });
  } catch (err) {
    console.error('[submitSolve]', err);
    return res.status(500).json({ error: 'Failed to submit solve' });
  }
};

// ── GET /battles/room/:roomId ─────────────────────────────────────────────────
// Used for reconnect — fetches full current room state
export const getRoomState = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const room = await BattleRoomModel.findById(roomId).lean();
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isPlayer = room.players.some((p) => p.toString() === userId);
    if (!isPlayer) return res.status(403).json({ message: 'Access denied' });

    return res.status(200).json(room);
  } catch (err) {
    console.error('[getRoomState]', err);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }
};

// ── GET /battles/history ──────────────────────────────────────────────────────
export const getBattleHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const battles = await BattleRoomModel.find({
      players: userId,
      status: { $in: ['completed', 'abandoned'] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({ battles, page, limit });
  } catch (err) {
    console.error('[getBattleHistory]', err);
    return res.status(500).json({ error: 'Failed to fetch battle history' });
  }
};
