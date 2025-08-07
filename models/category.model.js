import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: [true, "Category name is required"],
        trim: true,
        maxlength: [100, "Category name cannot exceed 100 characters"],
        unique: true,
    },
    categoryType: {
        type: String,
        required: [true, "Category type is required"],
        enum: ["major", "type", "workLocation", "location"],
        default: "major",
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// Add methods for filtering functionality
categorySchema.statics.getMajors = function() {
    return this.find({ categoryType: "major", isActive: true }).sort({
        categoryName: 1,
    });
};

categorySchema.statics.getTypes = function() {
    return this.find({ categoryType: "type", isActive: true }).sort({
        categoryName: 1,
    });
};

categorySchema.statics.getLocations = function() {
    return this.find({ categoryType: "location", isActive: true }).sort({
        categoryName: 1,
    });
};

categorySchema.statics.getWorkLocations = function() {
    return this.find({ categoryType: "workLocation", isActive: true }).sort({
        categoryName: 1,
    });
};

export default mongoose.model("Category", categorySchema);