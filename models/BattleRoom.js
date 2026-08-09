import mongoose, { model, Schema } from 'mongoose';

const solveResultSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    timeMs: { type: Number },          // raw milliseconds
    penalty: {
      type: String,
      enum: ['', '+2', 'DNF'],
      default: '',
    },
    effectiveTime: { type: Number },   // DNF = Infinity, +2 = timeMs + 2000, else timeMs
    submittedAt: { type: Date },
  },
  { _id: false }
);

const battleRoomSchema = new Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BattleChallenge',
    required: true,
  },
  // Always exactly 2 players: [challengerId, challengeeId]
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],

  scramble: { type: String, required: true },   // server-generated, same for both
  puzzleType: { type: String, required: true },

  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed', 'abandoned'],
    default: 'waiting',
  },

  // Tracks who has clicked "Ready" — battle starts when both are in this array
  readyPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  startedAt: { type: Date },

  // Grows 0 → 1 → 2 as players submit their solve times
  results: [solveResultSchema],

  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
  isDraw: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

export const BattleRoomModel = model('BattleRoom', battleRoomSchema);
