import { AverageModel } from '../models/Averages.js'

export const addAverage = async (req, res) => {
  try {
    const { timeInSeconds, type } = req.body;

    const average = await AverageModel.create({
      userId: req.user.userId,
      timeInSeconds,
      type
    });

    res.status(201).json(average);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add average' });
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
