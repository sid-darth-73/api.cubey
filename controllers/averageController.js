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

export const deleteAverage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const avgToDelete = await AverageModel.findOne({ _id: id, userId });

    if(!avgToDelete) {
      return res.status(404).json({ error: 'Average not found' });
    }

    const { type, isPB } = avgToDelete;

    await AverageModel.deleteOne({ _id: id, userId });

    // reassign the PB if this was PB
    if (isPB) {
      const nextBestAvg = await AverageModel
        .findOne({ userId, type })
        .sort({ avg: 1 });

      if(nextBestAvg) {
        await AverageModel.updateOne(
          { _id: nextBestAvg._id },
          { $set: { isPB: true } }
        );
      }
    }

    res.json({ message: 'Average deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete average' });
  }
};
