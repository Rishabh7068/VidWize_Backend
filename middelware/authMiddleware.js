// middleware/authMiddleware.js
import { auth } from '../firebase/connectToFirebase.js';

export const verifyToken = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      console.log("hereeee");
      return res.status(401).json({ message: "No token provided" });
    }
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
