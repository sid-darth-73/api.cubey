import dotenv from 'dotenv';
dotenv.config(); 
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import solveRoutes from './routes/solveRoutes.js';
import averageRoutes from './routes/averageRoutes.js';
import learnRoutes from './routes/learnRoutes.js'


const app = express();
app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use('/auth', authRoutes);
app.use('/solves', solveRoutes);
app.use('/averages', averageRoutes);
app.use('/learn', learnRoutes);


const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
