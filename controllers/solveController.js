import { SolveModel } from '../models/Solves.js';

export const addSolve = async (req, res) => {
  try {
    const { scramble, timeInSeconds, type } = req.body;

    const solve = await SolveModel.create({
      userId: req.user.userId,
      scramble,
      timeInSeconds,
      type
    });

    res.status(201).json(solve);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add solve' });
  }
};

export const getSolves = async (req, res) => {
  try {
    const solves = await SolveModel.find({ userId: req.user.userId });
    res.json(solves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch solves' });
  }
};

export const deleteSolve = async (req, res) => {
  try {
    const { id } = req.params;
    await SolveModel.deleteOne({ _id: id, userId: req.user.userId });
    res.json({ message: 'Solve deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete solve' });
  }
};
