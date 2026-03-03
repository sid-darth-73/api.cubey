import passport from 'passport'
import dotenv from 'dotenv';
dotenv.config();
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from './models/Users.js';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

// How passport "saves" the user into the session
passport.serializeUser((user, done) => {
    done(null, user); 
});

// How passport "retrieves" the user from the session
passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/auth/google/callback` : "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let user = await UserModel.findOne({ email });

      if (!user) {
        // Create a user with a random unguessable password if they sign in with Google for the first time
        const randomPassword = nanoid(20);
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = await UserModel.create({
          email,
          passwordHash
        });
      }
      return done(null, user);
    } catch (err) {
      console.error("Google Auth Error:", err);
      return done(err, null);
    }
  }
));