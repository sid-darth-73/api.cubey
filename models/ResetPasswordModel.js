import mongoose, { model, Schema} from "mongoose";

const resetPasswordSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 300
  }
});

export const ResetPasswordModel = model('ResetPassoword', resetPasswordSchema)

