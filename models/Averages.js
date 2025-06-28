import mongoose, { Mongoose } from "mongoose";

const averageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timeInSeconds: {
        type: Number, 
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['2x2', '3x3', '4x4', '5x5', 'OH', 'Pyraminx', 'Skewb', 'BLD', 'Other']
    },
    isPB: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export default Mongoose.model('Averages', averageSchema);