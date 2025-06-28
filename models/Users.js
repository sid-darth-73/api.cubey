import mongoose, { Mongoose } from "mongoose";

const userSchema = new mongoose.schema({
    wcaIdOrEmail: {
    type: String,
    required: true,
    unique: true,
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

export default Mongoose.model('Users', userSchema);