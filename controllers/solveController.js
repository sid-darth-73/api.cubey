import { SolveModel } from '../models/Solves.js';

export const addSolve = async (req, res) => {
  try {
    const { scramble, timeInSeconds, type } = req.body;
    const userId = req.user.userId;

    const currentPB = await SolveModel
      .findOne({ userId, type })
      .sort({ timeInSeconds: 1 });

    const isPB = !currentPB || timeInSeconds < currentPB.timeInSeconds;

    if (isPB && currentPB) {
      await SolveModel.updateOne(
        { _id: currentPB._id },
        { $set: { isPB: false } }
      );
    }

    const solve = await SolveModel.create({
      userId,
      scramble,
      timeInSeconds,
      type,
      isPB,
    });

    res.status(201).json(solve);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add solve', errorDesc: err.message });
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
