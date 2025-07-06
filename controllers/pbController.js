import { UserModel } from '../models/Users.js';
import { SolveModel } from '../models/Solves.js';
import { AverageModel } from '../models/Averages.js';


export const getPbs = async (req, res) => {
  const { shareLink } = req.params;
  try {
    console.log("Incoming shareLink:", shareLink);

    const user = await UserModel.findOne({ shareLink });
    if(!user) {
      console.log("No user found for shareLink");
      return res.status(404).json({ message: "User not found" });
    }

    const userId = user._id;
    console.log("Found userId:", userId);

    const solves = await SolveModel.find({ userId: userId, isPB: true });
    const averages = await AverageModel.find({ userId: userId, isPB: true });

    res.json({
      username: user.wcaIdOrEmail,
      shareLink,
      pbSolves: solves,
      averages
    });
  } catch (err) {
    console.error("Error in shareLink route:", err);
    res.status(500).json({ message: "Server error here", userid: userId });
  }
}
