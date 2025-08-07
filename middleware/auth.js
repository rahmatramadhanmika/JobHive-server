import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Company from "../models/company.model.js";

// Middleware to authenticate users
export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || 
                  req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== "user") {
      return res.status(403).json({ message: "Access denied. Invalid token type." });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Invalid token. User not found." });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

// Middleware to authenticate companies
export const authenticateCompany = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || 
                  req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== "company") {
      return res.status(403).json({ message: "Access denied. Invalid token type." });
    }

    const company = await Company.findById(decoded.companyId).select("-password");
    if (!company) {
      return res.status(401).json({ message: "Invalid token. Company not found." });
    }

    req.company = company;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

// Middleware to authenticate either user or company
export const authenticateAny = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || 
                  req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === "user") {
      const user = await User.findById(decoded.userId).select("-password");
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid token or deactivated account." });
      }
      req.user = user;
      req.userType = "user";
    } else if (decoded.type === "company") {
      const company = await Company.findById(decoded.companyId).select("-password");
      if (!company) {
        return res.status(401).json({ message: "Invalid token. Company not found." });
      }
      req.company = company;
      req.userType = "company";
    } else {
      return res.status(403).json({ message: "Access denied. Invalid token type." });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || 
                  req.cookies.token;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === "user") {
      const user = await User.findById(decoded.userId).select("-password");
      if (user && user.isActive) {
        req.user = user;
        req.userType = "user";
      }
    } else if (decoded.type === "company") {
      const company = await Company.findById(decoded.companyId).select("-password");
      if (company) {
        req.company = company;
        req.userType = "company";
      }
    }

    next();
  } catch (error) {
    // Invalid token, but continue without authentication
    next();
  }
};
