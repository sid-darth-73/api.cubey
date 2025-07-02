import { AlgoTimeModel } from "../models/AlgoTimeModel.js";

export const updateBestTime = async (req, res)=>{
  const { algoId, bestTimeInSeconds, type } = req.body;

  if(!algoId || !bestTimeInSeconds || !type) {
    return res.status(400).json({ message: "Missing fields" });
  }
  try {
    const existing = await AlgoTimeModel.findOne({
      userId: req.user.userId, algoId,
    });
    if(!existing) { // first time ye algorithm train kr rha hai
      const newEntry = await AlgoTimeModel.create({
        userId: req.user.userId,
        algoId,
        bestTimeInSeconds,
        type,
      });
      return res.status(201).json(newEntry);
    }

    if(bestTimeInSeconds < existing.bestTimeInSeconds) { // new PB for that algorithm
      existing.bestTimeInSeconds = bestTimeInSeconds;
      existing.updatedAt = Date.now();
      await existing.save();
    }

    return res.status(200).json(existing);
  } catch(err) {
    console.error("Failed to update best time:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



export const getAllBestTimes = async (req, res)=>{
  try {
    const times = await AlgoTimeModel.find({ userId: req.user.userId });
    res.json(times);
  } catch(err) {
    console.error("Error fetching best times:", err);
    res.status(500).json({ error: "Failed to get best times" });
  }
};

export const getBestTimeForAlgo = async (req, res)=>{
  const { algoId } = req.params;
  try {
    const time = await AlgoTimeModel.findOne({
      userId: req.user.userId,
      algoId,
    });

    if(!time) return res.status(404).json({ message: "No time recorded yet" });

    res.json(time);
  } catch (err) {
    console.error("Error fetching best time:", err);
    res.status(500).json({ error: "Failed to get best time" });
  }
};

