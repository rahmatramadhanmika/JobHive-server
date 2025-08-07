import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: [true, 'Job ID is required']
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    domicile: {
        type: String,
        required: [true, 'Domicile is required'],
        trim: true,
        maxlength: [200, 'Domicile cannot exceed 200 characters']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    resume: {
        type: String,
        required: [true, 'Resume is required']
    },
    coverLetter: {
        type: String,
        maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
    },
    // lastEducation: {
    //   institution: {
    //     type: String,
    //     required: [true, 'Institution is required'],
    //     trim: true
    //   },
    //   degree: {
    //     type: String,
    //     required: [true, 'Degree is required'],
    //     trim: true
    //   },
    //   fieldOfStudy: {
    //     type: String,
    //     trim: true
    //   },
    //   graduationYear: {
    //     type: Number,
    //     min: [1950, 'Graduation year must be after 1950'],
    //     max: [new Date().getFullYear() + 10, 'Graduation year cannot be too far in the future']
    //   },
    //   grade: {
    //     type: String,
    //     trim: true
    //   }
    // },
    personalStatement: {
        type: String,
        maxlength: [1000, 'Personal statement cannot exceed 1000 characters']
    },
    experienceLevel: {
        type: String,
        enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Executive'],
        trim: true
    },
    skills: {
        type: String,
        maxlength: [500, 'Skills cannot exceed 500 characters']
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'],
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        note: {
            type: String,
            maxlength: [500, 'Note cannot exceed 500 characters']
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        }
    }],
    companyNotes: [{
        note: {
            type: String,
            required: true,
            maxlength: [1000, 'Note cannot exceed 1000 characters']
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    interviewDetails: {
        scheduledDate: {
            type: Date
        },
        location: {
            type: String,
            trim: true
        },
        type: {
            type: String,
            enum: ['phone', 'video', 'onsite', 'online'],
            default: 'onsite'
        },
        notes: {
            type: String,
            maxlength: [1000, 'Interview notes cannot exceed 1000 characters']
        }
    },
    expectedSalary: {
        amount: {
            type: Number,
            min: [0, 'Expected salary cannot be negative']
        },
        currency: {
            type: String,
            enum: ['USD', 'IDR', 'SGD', 'MYR', 'PHP', 'THB'],
            default: 'USD'
        },
        period: {
            type: String,
            enum: ['hourly', 'monthly', 'yearly'],
            default: 'monthly'
        }
    },
    availableStartDate: {
        type: Date
    },
    additionalDocuments: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['portfolio', 'certificate', 'recommendation', 'other'],
            default: 'other'
        }
    }]
}, {
    timestamps: true
});

// Compound index to prevent duplicate applications
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// Indexes for better query performance
applicationSchema.index({ status: 1 });
applicationSchema.index({ applicationDate: -1 });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ userId: 1, status: 1 });

// Virtual to populate job and user details
applicationSchema.virtual('job', {
    ref: 'Job',
    localField: 'jobId',
    foreignField: '_id',
    justOne: true
});

applicationSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

// Method to update application status
applicationSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null) {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        note,
        updatedBy
    });
    return this.save();
};

// Method to add company note
applicationSchema.methods.addCompanyNote = function(note, createdBy) {
    this.companyNotes.push({
        note,
        createdBy
    });
    return this.save();
};

// Method to check if application is editable
applicationSchema.methods.isEditable = function() {
    return ['pending', 'reviewing'].includes(this.status);
};

// Pre-save middleware to add initial status to history
applicationSchema.pre('save', function(next) {
    if (this.isNew) {
        this.statusHistory.push({
            status: this.status
        });
    }
    next();
});

export default mongoose.model("Application", applicationSchema);