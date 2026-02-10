import mongoose, { Mongoose, model, Schema } from "mongoose";
import { nanoid } from "nanoid";
const userSchema = Schema({
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    wcaId: {
    type: String,
    required: false,
    unique: false,
    trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    shareLink: {
      type: String,
      unique: true,
      default: () => nanoid(12)
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
})

export const UserModel = model('Users', userSchema);