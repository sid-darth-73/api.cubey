import mongoose, { model, Schema} from "mongoose";

const algoTimeSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  algoId: {
    type: String,
    required: true,
  },
  bestTimeInSeconds: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['3x3', '4x4', '5x5'],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

algoTimeSchema.index({ userId: 1, algoId: 1 }, { unique: true });

export const AlgoTimeModel = model('AlgoTimes', algoTimeSchema);
