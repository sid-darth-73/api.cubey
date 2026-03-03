import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
dotenv.config(); 
import './passport-setup.js'
import jwt from 'jsonwebtoken';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import solveRoutes from './routes/solveRoutes.js';
import averageRoutes from './routes/averageRoutes.js';
import learnRoutes from './routes/learnRoutes.js'
import pbRoutes from './routes/pbRoutes.js'
import resetRoutes from './routes/resetRoutes.js'

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
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true
}));

// 2. Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use('/auth', authRoutes);
app.use('/solves', solveRoutes);
app.use('/averages', averageRoutes);
app.use('/learn', learnRoutes);
app.use('/pb', pbRoutes)

app.use('/auth/reset', resetRoutes)


// 3. AUTH ROUTES
// Step A: Redirect user to Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Step B: Google sends user back to this URL
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signin` }),
  (req, res) => {
    // Generate JWT for the authenticated user
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const shareLink = req.user.shareLink;
    const email = req.user.email;
    
    // Redirect to frontend with token in the URL parameters
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/timer?token=${token}&shareLink=${shareLink}&user=${encodeURIComponent(email)}`);
  }
);

// 4. PROTECTED ROUTE
app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        res.send(`Welcome ${req.user.displayName}!`);
    } else {
        res.redirect('/auth/google');
    }
});
app.get('/', (req, res)=>{
  res.send('server healthy')
})
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
