const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * Authentication middleware to protect routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error("User not found");
      }

      // Attach user to request object
      req.user = user;
      req.token = token;

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error during authentication",
    });
  }
};

module.exports = auth;
