import express from "express";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import passport from "../config/passport.js";
import { authenticateUser } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profiles';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^\d{8,15}$/.test(phone);
}

function validatePassword(password) {
    // At least 6 characters, one uppercase, one lowercase, one number
    return password.length >= 6 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password);
}

// Register
router.post("/register", async(req, res) => {
    try {
        const { fullName, email, password, phoneNumber } = req.body;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Full name, email, and password are required." });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ message: "Invalid email format." });
        }

        if (phoneNumber && !validatePhone(phoneNumber)) {
            return res.status(400).json({ message: "Invalid phone number format. Must be 8-15 digits." });
        }

        // Enhanced password validation
        if (!validatePassword(password)) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number."
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User with this email already exists." });
        }

        console.log("Registering user:", email);

        // Create user - password will be hashed by the pre-save middleware
        const user = new User({
            fullName,
            email,
            password, // Will be hashed automatically
            phoneNumber: phoneNumber || undefined
        });

        await user.save();
        console.log("User saved successfully:", email);

        res.status(201).json({
            message: "User registered successfully.",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Registration error:", err);
        if (err.code === 11000) {
            res.status(409).json({ message: "User with this email already exists." });
        } else {
            res.status(400).json({ message: err.message });
        }
    }
});

// Login
router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        console.log("Login attempt for email:", email);

        // Find user and explicitly select password field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            console.log("User not found for email:", email);
            return res.status(401).json({ message: "Invalid credentials." });
        }

        console.log("User found:", user.email);

        // Use the matchPassword method to compare hashed password
        const isPasswordMatch = await user.matchPassword(password);
        if (!isPasswordMatch) {
            console.log("Password comparison failed for user:", email);
            return res.status(401).json({ message: "Invalid credentials." });
        }

        console.log("Login successful for:", email);

        // Update last login
        await user.updateLastLogin();

        // Issue JWT
        const token = jwt.sign({ userId: user._id, email: user.email, type: "user" },
            process.env.JWT_SECRET, { expiresIn: "7d" } // Extended to 7 days
        );

        res.json({
            message: "Login successful.",
            token,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                type: "user"
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Get user profile
router.get("/profile", authenticateUser, async(req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({
            message: "Profile retrieved successfully.",
            user
        });
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Update user profile
router.put("/profile", authenticateUser, async(req, res) => {
    try {
        const allowedUpdates = [
            'fullName', 'phoneNumber', 'bio', 'birthDate', 'gender',
            'domicile', 'personalSummary', 'skills', 'experience', 'education', 'profilePicture'
        ];

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates, { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({
            message: "Profile updated successfully.",
            user
        });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(400).json({ message: err.message });
    }
});

// Change password endpoint
router.put("/change-password", authenticateUser, async(req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required." });
        }

        // Validate new password
        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                message: "New password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number."
            });
        }

        // Find user with password
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check current password
        const isCurrentPasswordMatch = await user.matchPassword(currentPassword);
        if (!isCurrentPasswordMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        // Update password (will be hashed by pre-save middleware)
        user.password = newPassword;
        await user.save();

        res.json({ message: "Password changed successfully." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Upload profile picture
router.post("/upload-profile-picture", authenticateUser, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        // Update user's profile picture in database
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Delete old profile picture if it exists
        if (user.profilePicture) {
            const oldFilePath = path.join(process.cwd(), user.profilePicture);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Save new profile picture path
        const profilePictureUrl = `uploads/profiles/${req.file.filename}`;
        user.profilePicture = profilePictureUrl;
        await user.save();

        res.json({
            message: "Profile picture uploaded successfully.",
            profilePictureUrl: profilePictureUrl
        });
    } catch (err) {
        console.error("Upload profile picture error:", err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Google OAuth start
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "http://localhost:5173/signin",
    }),
    (req, res) => {
        // Issue JWT for Google OAuth users
        const token = jwt.sign({ userId: req.user._id, email: req.user.email, type: "user" },
            process.env.JWT_SECRET, { expiresIn: "7d" }
        );
        // Redirect to frontend with token
        res.redirect(`http://localhost:5173/signin?token=${token}`);
    }
);

export default router;