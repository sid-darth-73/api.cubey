import { SolveModel } from '../models/Solves.js';

export const addSolve = async (req, res) => {
  try {
    const { scramble, timeInSeconds, type, comment } = req.body;
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
      comment,
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
    const { type, sessionNumber, maxTime, comment } = req.query;
    
    let query = { userId: req.user.userId };
    
    if (type) {
      query.type = type;
    }
    
    if (sessionNumber) {
      query.sessionNumber = Number(sessionNumber);
    }
    
    if (maxTime) {
      query.timeInSeconds = { $lt: Number(maxTime) };
    }
    
    if (comment) {
      query.comment = { $regex: comment, $options: 'i' };
    }

    const solves = await SolveModel.find(query);
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

export const addBatchSolves = async (req, res) => {
  try {
    const { solves } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(solves) || solves.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty solves array' });
    }

    const insertedSolves = [];
    
    // We process sequentially to correctly calculate PB
    for (const solve of solves) {
      const { scramble, timeInSeconds, type, sessionNumber, comment } = solve;

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

      const newSolve = await SolveModel.create({
        userId,
        scramble,
        timeInSeconds,
        sessionNumber,
        type,
        comment,
        penalty,
        isPB,
      });

      insertedSolves.push(newSolve);
    }

    res.status(201).json({ message: 'Batch solves added', count: insertedSolves.length, insertedSolves });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add batch solves', errorDesc: err.message });
  }
};

export const resetSession = async (req, res) => {
  try {
    const { sessionNumber } = req.body;
    const userId = req.user.userId;

    if (sessionNumber === undefined) {
      return res.status(400).json({ error: 'Session number is required' });
    }

    // Find and delete all solves for this user and session
    const deleted = await SolveModel.deleteMany({ userId, sessionNumber });

    // We also need to reassign PB for any types that might have had their PB deleted.
    // To do this efficiently, we can just find the best solve for each type and mark as PB.
    // For simplicity, we can do an aggregation or just query distinct types and update.
    const types = await SolveModel.distinct('type', { userId });
    
    // Reset all PBs to false for this user first
    await SolveModel.updateMany({ userId }, { $set: { isPB: false } });

    // Repopulate PBs
    for (const type of types) {
      const best = await SolveModel.findOne({ userId, type }).sort({ timeInSeconds: 1 });
      if (best) {
        best.isPB = true;
        await best.save();
      }
    }

    res.json({ message: 'Session reset', deletedCount: deleted.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset session', errorDesc: err.message });
  }
};
export const updateSolve = async (req, res) => {
  try {
    const { id } = req.params;
    const { penalty, comment } = req.body;
    const userId = req.user.userId;

    const solveToUpdate = await SolveModel.findOne({ _id: id, userId });
    
    if(!solveToUpdate) {
      return res.status(404).json({ error: 'Solve not found' });
    }

    if (penalty !== undefined) solveToUpdate.penalty = penalty;
    if (comment !== undefined) solveToUpdate.comment = comment;

    await solveToUpdate.save();

    // If penalty changed to DNF and it was PB, we need to reassign PB
    if (penalty === 'DNF' && solveToUpdate.isPB) {
      solveToUpdate.isPB = false;
      await solveToUpdate.save();

      const nextBest = await SolveModel
        .findOne({ userId, type: solveToUpdate.type, penalty: { $ne: 'DNF' } })
        .sort({ timeInSeconds: 1 });

      if (nextBest) {
        nextBest.isPB = true;
        await nextBest.save();
      }
    }

    res.json(solveToUpdate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update solve' });
  }
};
