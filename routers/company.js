import express from "express";
import Company from "../models/company.model.js";
import multer from "multer";
import path from "path";
import jwt from "jsonwebtoken";

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

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

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = (req.header("Authorization") || "").replace("Bearer ", "");

    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.company = decoded;
        next();
    } catch (error) {
        return res.status(400).json({ message: "Invalid token." });
    }
};

// Register (with credential file)
router.post("/register", upload.single("credentialFile"), async(req, res) => {
    try {
        const { companyName, email, password, phoneNumber } = req.body;

        // Validate required fields
        if (!companyName || !email || !password) {
            return res.status(400).json({ message: "Company name, email, and password are required." });
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

        // Check if company already exists
        const existingCompany = await Company.findOne({ email });
        if (existingCompany) {
            return res.status(409).json({ message: "Company with this email already exists." });
        }

        // Create company - password will be hashed by the pre-save middleware
        const company = new Company({
            companyName,
            email,
            password, // Will be hashed automatically
            phoneNumber,
        });

        await company.save();

        res.status(201).json({
            message: "Company registered successfully.",
            company: {
                _id: company._id,
                companyName: company.companyName,
                email: company.email
            }
        });
    } catch (err) {
        console.error("Company registration error:", err);
        if (err.code === 11000) {
            res.status(409).json({ message: "Company with this email already exists." });
        } else {
            res.status(400).json({ message: err.message });
        }
    }
});

// Login
router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required." });
        }

        console.log("Company login attempt for email:", email);

        // Find company and explicitly select password field
        const company = await Company.findOne({ email }).select('+password');
        if (!company) {
            console.log("Company not found for email:", email);
            return res.status(401).json({ message: "Invalid credentials." });
        }

        console.log("Company found:", company.email);

        // Use the matchPassword method to compare hashed password
        const isPasswordMatch = await company.matchPassword(password);
        if (!isPasswordMatch) {
            console.log("Password comparison failed for company:", email);
            return res.status(401).json({ message: "Invalid credentials." });
        }

        console.log("Company login successful for:", email);

        // Update last login
        await company.updateLastLogin();

        // Issue JWT for company
        const token = jwt.sign({ companyId: company._id, email: company.email, type: "company" },
            process.env.JWT_SECRET, { expiresIn: "7d" } // Extended to 7 days
        );

        res.json({
            message: "Login successful.",
            token,
            company: {
                _id: company._id,
                companyName: company.companyName,
                email: company.email,
                type: "company"
            },
        });
    } catch (err) {
        console.error("Company login error:", err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Change password endpoint for companies
router.put("/change-password", verifyToken, async(req, res) => {
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

        // Find company with password
        const company = await Company.findById(req.company.companyId).select('+password');
        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }

        // Check current password
        const isCurrentPasswordMatch = await company.matchPassword(currentPassword);
        if (!isCurrentPasswordMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        // Update password (will be hashed by pre-save middleware)
        company.password = newPassword;
        await company.save();

        res.json({ message: "Password changed successfully." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Company validation endpoint (admin only)
router.post("/validate/:id", async(req, res) => {
    const adminToken = process.env.ADMIN_TOKEN;
    if (req.headers.authorization !== `Bearer ${adminToken}`) {
        return res.status(403).json({ message: "Forbidden" });
    }
    try {
        const { status, adminNotes } = req.body;
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }
        const company = await Company.findByIdAndUpdate(
            req.params.id, {
                credentialStatus: status,
                credentialReviewDate: new Date(),
                adminNotes: adminNotes || "",
            }, { new: true }
        ).select("-password");

        if (!company)
            return res.status(404).json({ message: "Company not found." });
        res.json({ message: `Company credential ${status}.`, company });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get company profile
router.get("/profile/:id", verifyToken, async(req, res) => {
    try {
        const company = await Company.findById(req.params.id).select("-password");
        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }
        res.json(company);
    } catch (err) {
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Update company profile
router.put(
    "/profile/:id",
    verifyToken,
    upload.fields([
        { name: "profilePicture", maxCount: 1 },
        { name: "bannerPicture", maxCount: 1 },
    ]),
    async(req, res) => {
        try {
            const updateData = {...req.body };

            // Handle file uploads
            if (req.files) {
                if (req.files.profilePicture) {
                    updateData.profilePicture = req.files.profilePicture[0].path;
                }
                if (req.files.bannerPicture) {
                    updateData.bannerPicture = req.files.bannerPicture[0].path;
                }
            }

            const company = await Company.findByIdAndUpdate(
                req.params.id,
                updateData, { new: true, runValidators: true }
            ).select("-password");

            if (!company) {
                return res.status(404).json({ message: "Company not found." });
            }

            res.json({ message: "Profile updated successfully.", company });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
);

// Get all companies (public endpoint)
router.get("/", async(req, res) => {
    try {
        const {
            page = 1,
                limit = 12,
                search = '',
                industry = '',
                location = ''
        } = req.query;

        // Build filter object
        const filter = {};

        if (search) {
            filter.$or = [
                { companyName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (industry) {
            filter.industry = { $regex: industry, $options: 'i' };
        }

        if (location) {
            filter.mainLocation = { $regex: location, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const companies = await Company.find(filter)
            .select('-password') // Exclude password field
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Company.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            companies,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCompanies: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (err) {
        console.error('Error fetching companies:', err);
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

// Get single company by ID (public endpoint)
router.get("/:id", async(req, res) => {
    try {
        const company = await Company.findById(req.params.id)
            .select('-password'); // Exclude password field

        if (!company) {
            return res.status(404).json({ message: "Company not found." });
        }

        res.json(company);
    } catch (err) {
        console.error('Error fetching company:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid company ID format." });
        }
        res.status(500).json({ message: "Internal server error. Please try again." });
    }
});

export default router;