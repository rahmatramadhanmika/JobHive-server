import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const cvAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // File Information
  originalFilename: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true,
    maxlength: [255, 'Filename cannot exceed 255 characters']
  },
  
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  
  // Extracted Content
  extractedText: {
    type: String,
    required: [true, 'Extracted text is required'],
    maxlength: [50000, 'Extracted text too long']
  },
  
  // Job Context
  jobData: {
    experienceLevel: {
      type: String,
      required: [true, 'Experience level is required'],
      enum: ['entry', 'mid', 'senior', 'executive']
    },
    major: {
      type: String,
      required: [true, 'Major field is required'],
      trim: true,
      maxlength: [100, 'Major cannot exceed 100 characters']
    },
    targetJobTitle: {
      type: String,
      trim: true,
      maxlength: [200, 'Target job title cannot exceed 200 characters']
    },
    targetJobDescriptions: [{
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Job title cannot exceed 200 characters']
      },
      company: {
        type: String,
        trim: true,
        maxlength: [200, 'Company name cannot exceed 200 characters']
      },
      description: {
        type: String,
        required: true,
        maxlength: [10000, 'Job description cannot exceed 10000 characters']
      },
      requirements: [{
        type: String,
        trim: true
      }]
    }]
  },
  
  // Analysis Results (populated after AI analysis)
  overallScore: {
    type: Number,
    min: [0, 'Score cannot be negative'],
    max: [100, 'Score cannot exceed 100']
  },
  
  // Summary Analysis (populated after AI analysis)
  summary: {
    strengths: {
      type: String,
      trim: true,
      maxlength: [1000, 'Strengths summary cannot exceed 1000 characters']
    },
    areasOfImprovement: {
      type: String,
      trim: true,
      maxlength: [1000, 'Areas of improvement summary cannot exceed 1000 characters']
    },
    keyFindings: {
      type: String,
      trim: true,
      maxlength: [1000, 'Key findings cannot exceed 1000 characters']
    }
  },
  
  // Simplified sections structure (optional)
  sections: {
    type: Object,
    default: {}
  },
  
  // Recommendations (populated after AI analysis)
  recommendations: [{
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters']
    },
    suggestion: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Suggestion cannot exceed 1000 characters']
    },
    impact: {
      type: String,
      trim: true,
      maxlength: [500, 'Impact description cannot exceed 500 characters']
    }
  }],
  
  // Job Matching Results (populated after AI analysis)
  jobMatching: {
    type: Object,
    default: {}
  },
  
  // Market Insights (populated after AI analysis)
  marketInsights: {
    type: Object,
    default: {}
  },
  
  // Processing Information
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  
  // Error handling
  errorMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Error message cannot exceed 500 characters']
  },
  
  // Processing stages (optional detailed tracking)
  processingStages: [{
    stage: {
      type: String,
      enum: ['upload', 'parsing', 'extraction', 'analysis', 'completion']
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed'],
      default: 'pending'
    },
    startTime: Date,
    endTime: Date,
    error: String
  }],
  
  // OpenAI Processing Details
  openaiProcessing: {
    model: {
      type: String,
      default: 'gpt-4'
    },
    tokensUsed: {
      type: Number,
      min: [0, 'Tokens used cannot be negative']
    },
    processingTime: {
      type: Number, // in milliseconds
      min: [0, 'Processing time cannot be negative']
    },
    cost: {
      type: Number, // in USD
      min: [0, 'Cost cannot be negative']
    }
  },
  
  // Analytics & Tracking
  analytics: {
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative']
    },
    lastViewed: Date,
    shared: {
      type: Boolean,
      default: false
    },
    downloaded: {
      type: Boolean,
      default: false
    },
    improvementsImplemented: [{
      recommendationId: mongoose.Schema.Types.ObjectId,
      implementedAt: {
        type: Date,
        default: Date.now
      },
      userFeedback: {
        type: String,
        enum: ['helpful', 'somewhat-helpful', 'not-helpful']
      }
    }]
  },
  
  // Version Control
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  
  // Soft Delete
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
cvAnalysisSchema.index({ userId: 1, createdAt: -1 });
cvAnalysisSchema.index({ processingStatus: 1 });
cvAnalysisSchema.index({ overallScore: -1 });
cvAnalysisSchema.index({ 'jobData.experienceLevel': 1 });
cvAnalysisSchema.index({ 'jobData.major': 1 });
cvAnalysisSchema.index({ isActive: 1, createdAt: -1 });

// Virtual for user details
cvAnalysisSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Instance Methods
cvAnalysisSchema.methods.markAsCompleted = function() {
  this.processingStatus = 'completed';
  this.processingStages.forEach(stage => {
    if (stage.status === 'in-progress') {
      stage.status = 'completed';
      stage.endTime = new Date();
    }
  });
  return this.save();
};

cvAnalysisSchema.methods.markAsFailed = function(error) {
  this.processingStatus = 'failed';
  const currentStage = this.processingStages.find(stage => stage.status === 'in-progress');
  if (currentStage) {
    currentStage.status = 'failed';
    currentStage.endTime = new Date();
    currentStage.error = error.message;
  }
  return this.save();
};

cvAnalysisSchema.methods.updateStage = function(stageName, status, error = null) {
  const stage = this.processingStages.find(s => s.stage === stageName);
  if (stage) {
    stage.status = status;
    if (status === 'in-progress') {
      stage.startTime = new Date();
    } else if (status === 'completed' || status === 'failed') {
      stage.endTime = new Date();
      if (error) stage.error = error;
    }
  }
  return this.save();
};

cvAnalysisSchema.methods.incrementViews = function() {
  this.analytics.viewCount += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

cvAnalysisSchema.methods.softDelete = function() {
  this.isActive = false;
  this.deletedAt = new Date();
  return this.save();
};

// Static Methods
cvAnalysisSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, isActive: true };
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 10)
    .skip(options.skip || 0)
    .populate(options.populate || '');
};

cvAnalysisSchema.statics.findCompletedAnalyses = function(userId) {
  return this.find({
    userId,
    processingStatus: 'completed',
    isActive: true
  }).sort({ createdAt: -1 });
};

cvAnalysisSchema.statics.getAnalyticsData = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$processingStatus"
        },
        count: { $sum: 1 },
        avgScore: { $avg: "$overallScore" }
      }
    }
  ]);
};

// Pre-save middleware
cvAnalysisSchema.pre('save', function(next) {
  // Simple validation - no automatic processing stages creation
  if (this.isNew && !this.processingStatus) {
    this.processingStatus = 'pending';
  }
  next();
});

// Post-save middleware for notifications
cvAnalysisSchema.post('save', function(doc) {
  if (doc.processingStatus === 'completed') {
    // Trigger notification service
    // This would integrate with your existing notification system
    console.log(`CV Analysis completed for user ${doc.userId}`);
  }
});

// Add pagination plugin
cvAnalysisSchema.plugin(mongoosePaginate);

export default mongoose.model('CVAnalysis', cvAnalysisSchema);
