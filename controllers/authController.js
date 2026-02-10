import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/Users.js';

export const signup = async (req, res) => {
  try {
    const { email, wcaId, password } = req.body;
    const existingUser = await UserModel.findOne({ email });

    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await UserModel.create({ email, wcaId, passwordHash });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token: token, shareLink: user.shareLink });
  } catch (err) {
    console.error('Signup Error:', err); 
    res.status(500).json({ error: 'Signup failed' });
  }
};


export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token: token, shareLink: user.shareLink });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};
