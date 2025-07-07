import dotenv from 'dotenv';
dotenv.config(); 
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import solveRoutes from './routes/solveRoutes.js';
import averageRoutes from './routes/averageRoutes.js';
import learnRoutes from './routes/learnRoutes.js'
import pbRoutes from './routes/pbRoutes.js'

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 100,    
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    status: 429,
    error: 'Too many requests. Please try again later.'
  }
});

const app = express();

app.use(apiLimiter);

app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use('/auth', authRoutes);
app.use('/solves', solveRoutes);
app.use('/averages', averageRoutes);
app.use('/learn', learnRoutes);
app.use('/pb', pbRoutes)

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
