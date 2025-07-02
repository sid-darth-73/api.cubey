import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if(!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains userId
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// export const authMiddleware = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) return res.status(401).json({ message: 'No token provided' });

//   const token = authHeader.split(' ')[1]; // extract after "Bearer"

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // contains userId
//     next();
//   } catch (err) {
//     res.status(401).json({ message: 'Invalid token' });
//   }
// };