import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Add lastLogin field to schema
const companySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, "Company name is required"],
        trim: true,
        maxlength: [200, "Company name cannot exceed 200 characters"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please enter a valid email",
        ],
    },
    phoneNumber: {
        type: String,
        trim: true,
        maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [3, "Password must be at least 3 characters"],
    },
    profilePicture: {
        type: String,
        default: "",
    },
    bannerPicture: String,
    website: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, "Please enter a valid website URL"],
    },
    industry: {
        type: String,
        trim: true,
        maxlength: [100, "Industry cannot exceed 100 characters"],
    },
    mainLocation: {
        type: String,
        trim: true,
        maxlength: [200, "Main location cannot exceed 200 characters"],
    },
    description: {
        type: String,
        maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    lastLogin: {
        type: Date,
    },
    // credentialFile: String,
    // credentialStatus: {
    //   type: String,
    // ,
    //   default: "pending",
    // },
    // credentialReviewDate: Date,
    // adminNotes: String,
    // ===============================================
    // socialMedia: {
    //   linkedin: {
    //     type: String,
    //     trim: true
    //   },
    //   twitter: {
    //     type: String,
    //     trim: true
    //   },
    //   facebook: {
    //     type: String,
    //     trim: true
    //   },
    //   instagram: {
    //     type: String,
    //     trim: true
    //   }
    // },
}, {
    timestamps: true,
});

// Virtual for getting posted jobs count
companySchema.virtual("jobsCount", {
    ref: "Job",
    localField: "_id",
    foreignField: "companyId",
    count: true,
});

// Hash password before saving
companySchema.pre("save", async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified("password")) return next();

    try {
        // Hash password with cost of 12
        const hashedPassword = await bcrypt.hash(this.password, 12);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
companySchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login method
companySchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save({ validateBeforeSave: false });
};

export default mongoose.model("Company", companySchema);