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
    const userId = req.user.userId;

    const solveToDelete = await SolveModel.findOne({ _id: id, userId });

    if(!solveToDelete) {
      return res.status(404).json({ error: 'Solve not found' });
    }

    const { type, isPB } = solveToDelete;

    await SolveModel.deleteOne({ _id: id, userId });

    // reassign the pb if this was PB
    if(isPB) {
      const nextBest = await SolveModel
        .findOne({ userId, type })
        .sort({ timeInSeconds: 1 });

      if(nextBest) {
        await SolveModel.updateOne(
          { _id: nextBest._id },
          { $set: { isPB: true } }
        );
      }
    }

    res.json({ message: 'Solve deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete solve' });
  }
};

