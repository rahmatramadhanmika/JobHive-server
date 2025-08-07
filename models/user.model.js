import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
        maxlength: [100, "Full name cannot exceed 100 characters"],
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
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [3, "Password must be at least 3 characters"],
    },
    phoneNumber: {
        type: String,
        trim: true,
        maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
    profilePicture: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    birthDate: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ["male", "female", "prefer-not-to-say"],
        default: "prefer-not-to-say",
    },
    domicile: {
        type: String,
        trim: true,
    },
    personalSummary: {
        type: String,
        maxlength: [1000, "Personal summary cannot exceed 1000 characters"],
    },
    savedJobs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Job",
    }, ],
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
    },
    passwordResetToken: {
        type: String,
    },
    passwordResetExpire: {
        type: Date,
    },
    skills: [{
        type: String,
        trim: true,
    }, ],
    experience: [{
        company: {
            type: String,
            required: true,
            trim: true,
        },
        position: {
            type: String,
            required: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
        },
        current: {
            type: Boolean,
            default: false,
        },
        description: {
            type: String,
            maxlength: [500, "Description cannot exceed 500 characters"],
        },
    }, ],
    education: [{
        institution: {
            type: String,
            required: true,
            trim: true,
        },
        degree: {
            type: String,
            required: true,
            trim: true,
        },
        fieldOfStudy: {
            type: String,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
        },
        current: {
            type: Boolean,
            default: false,
        },
        grade: {
            type: String,
            trim: true,
        },
    }, ],
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre("save", async function(next) {
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
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save({ validateBeforeSave: false });
};

export default mongoose.model("User", userSchema);