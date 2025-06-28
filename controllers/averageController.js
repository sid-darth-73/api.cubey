import { AverageModel } from '../models/Averages.js'

export const addAverage = async (req, res) => {
  try {
    const { timeInSeconds, type } = req.body;
    const userId = req.user.userId;

    const currentPB = await AverageModel
      .findOne({ userId, type })
      .sort({ timeInSeconds: 1 });

    const isPB = !currentPB || timeInSeconds < currentPB.timeInSeconds;

    if (isPB && currentPB) {
      await AverageModel.updateOne(
        { _id: currentPB._id },
        { $set: { isPB: false } }
      );
    }

    const average = await AverageModel.create({
      userId,
      timeInSeconds,
      type,
      isPB,
    });

    res.status(201).json(average);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add solve', errorDesc: err.message });
  }
};

export const getAverages = async (req, res) => {
  try {
    const averages = await AverageModel.find({ userId: req.user.userId });
    res.json(averages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch averages' });
  }
};
