import mongoose, { model, Schema } from 'mongoose';

const battleChallengeSchema = new Schema({
  challengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  challengeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  puzzleType: {
    type: String,
    enum: ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'OH', 'Pyraminx', 'Skewb', 'BLD'],
    default: '3x3',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
    default: 'pending',
  },
  // Challenge must be accepted within 60 seconds
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60_000),
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete documents from MongoDB 5 minutes after expiresAt
battleChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 300 });

export const BattleChallengeModel = model('BattleChallenge', battleChallengeSchema);
