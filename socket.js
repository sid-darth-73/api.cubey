import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let _io;

/**
 * Attaches Socket.IO to the existing HTTP server.
 * Call this once in server.js before httpServer.listen().
 */
export const setupSocket = (httpServer) => {
  _io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Auth middleware: verify JWT on every connection ──────────────────────
  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  _io.on('connection', (socket) => {
    // Each user joins their own personal room immediately on connect.
    // This is the target we use when sending challenges/notifications to a specific user.
    socket.join(`user:${socket.userId}`);
    console.log(`[socket] User ${socket.userId} connected (${socket.id})`);

    // Client can explicitly join a battle room after navigating to the battle page.
    // This is also done automatically by the server on challenge accept,
    // but this handles reconnects.
    socket.on('battle:join_room', (roomId) => {
      socket.join(`battle:${roomId}`);
      console.log(`[socket] User ${socket.userId} joined battle room ${roomId}`);
    });

    // Forfeit: the forfeiting player loses immediately
    socket.on('battle:forfeit', async ({ roomId }) => {
      try {
        const { BattleRoomModel } = await import('./models/BattleRoom.js');
        const room = await BattleRoomModel.findById(roomId);
        if (!room || room.status !== 'in_progress') return;

        const winnerId = room.players.find(
          (p) => p.toString() !== socket.userId
        );

        room.status = 'abandoned';
        room.winnerId = winnerId;
        room.completedAt = new Date();
        await room.save();

        _io.to(`battle:${roomId}`).emit('battle:result', {
          winnerId,
          isDraw: false,
          forfeitedBy: socket.userId,
          results: room.results,
        });
      } catch (err) {
        console.error('[socket] forfeit error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket] User ${socket.userId} disconnected`);
    });
  });

  return _io;
};

/**
 * Returns the Socket.IO instance. Import this wherever you need to emit events
 * (e.g., battleController.js, battleService.js).
 */
export const getIO = () => {
  if (!_io) throw new Error('Socket.IO not initialised — call setupSocket() first');
  return _io;
};
