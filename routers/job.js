import express from "express";
import Job from "../models/job.model.js";
import { authenticateCompany, authenticateUser } from "../middleware/auth.js";
import Category from "../models/category.model.js";

const router = express.Router();

// Get all categories
router.get("/categories", async(req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({
            categoryName: 1,
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all jobs with filtering and pagination
router.get("/", async(req, res) => {
    try {
        const {
            page = 1,
                limit = 10,
                title,
                location,
                type,
                workLocation,
                experienceLevel,
                category,
                companyId,
                search,
                includeInactive = 'true', // Changed default to 'true' as string
        } = req.query;

        console.log('Query params:', { includeInactive, page, limit }); // Debug log

        // Update jobs with passed deadlines before fetching
        await Job.updateJobsWithPassedDeadlines(); // Fixed method name

        // Base query - include both active and inactive jobs by default
        const query = {};

        // Only filter out inactive jobs if explicitly requested
        if (includeInactive === 'false') {
            query.isActive = true;
        }

        // Build query filters
        if (title) query.title = { $regex: title, $options: "i" };
        if (location) query.location = { $regex: location, $options: "i" };
        if (type) query.type = type;
        if (workLocation) query.workLocation = workLocation;
        if (experienceLevel) query.experienceLevel = experienceLevel;
        if (category) query.category = category;
        if (companyId) query.companyId = companyId;

        // Text search across multiple fields
        if (search) {
            query.$text = { $search: search };
        }

        console.log('Final query:', query); // Debug log

        // Sort criteria - active jobs first, then by date posted
        const sortCriteria = {
            isActive: -1, // Active jobs first (1 = true, 0 = false, so -1 puts true first)
            datePosted: -1 // Then by newest first
        };

        const jobs = await Job.find(query)
            .populate("category", "categoryName")
            .populate("companyId", "companyName profilePicture")
            .sort(sortCriteria)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        console.log('Found jobs count:', jobs.length); // Debug log

        const total = await Job.countDocuments(query);

        // Add status to each job (removed isExpired logic)
        const jobsWithStatus = jobs.map(job => {
            const jobObj = job.toObject();
            jobObj.canApply = job.isActive; // Simplified - only check if active
            return jobObj;
        });

        res.json({
            jobs: jobsWithStatus,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
        });
    } catch (error) {
        console.error('Error in GET /api/jobs:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single job by ID
router.get("/:id", async(req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate("category")
            .populate("companyId", "-password");

        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Update job status if deadline has passed (removed isExpired logic)
        if (job.applicationDeadline && job.applicationDeadline < new Date() && job.isActive) {
            job.isActive = false;
            await job.save();
        }

        // Increment view count for all jobs (active and inactive)
        await job.incrementViews();

        // Add additional status information (simplified)
        const jobObj = job.toObject();
        jobObj.canApply = job.isActive; // Simplified - only check if active

        res.json(jobObj);
    } catch (error) {
        console.error('Error in GET /api/jobs/:id:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create new job (Company only)
router.post("/", authenticateCompany, async(req, res) => {
    try {
        const jobData = {
            ...req.body,
            companyId: req.company._id,
        };

        const job = new Job(jobData);
        await job.save();

        await job.populate("category");
        await job.populate("companyId", "companyName");

        res.status(201).json(job);
    } catch (error) {
        console.error('Error in POST /api/jobs:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update job (Company only - own jobs)
router.put("/:id", authenticateCompany, async(req, res) => {
    try {
        const job = await Job.findOne({
            _id: req.params.id,
            companyId: req.company._id,
        });

        if (!job) {
            return res.status(404).json({ message: "Job not found or unauthorized" });
        }

        Object.assign(job, req.body);
        await job.save();

        await job.populate("category");
        await job.populate("companyId", "companyName");

        res.json(job);
    } catch (error) {
        console.error('Error in PUT /api/jobs/:id:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete job (Company only - own jobs)
router.delete("/:id", authenticateCompany, async(req, res) => {
    try {
        const job = await Job.findOneAndDelete({
            _id: req.params.id,
            companyId: req.company._id,
        });

        if (!job) {
            return res.status(404).json({ message: "Job not found or unauthorized" });
        }

        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        console.error('Error in DELETE /api/jobs/:id:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get jobs by company - FIXED
router.get("/company/:companyId", async(req, res) => {
    try {
        const { page = 1, limit = 10, includeInactive = 'true' } = req.query; // Default to showing all jobs for company view

        console.log('Company jobs query params:', { companyId: req.params.companyId, includeInactive, page, limit }); // Debug log

        // Update jobs with passed deadlines before fetching
        await Job.updateJobsWithPassedDeadlines(); // Fixed method name

        // Build query - for company view, show all jobs by default (including inactive)
        const query = { companyId: req.params.companyId };

        // Only filter out inactive jobs if explicitly requested
        if (includeInactive === 'false') {
            query.isActive = true;
        }

        console.log('Company jobs final query:', query); // Debug log

        // Sort criteria - active jobs first, then by date posted
        const sortCriteria = {
            isActive: -1, // Active jobs first
            datePosted: -1 // Then by newest first
        };

        const jobs = await Job.find(query)
            .populate("category", "categoryName")
            .sort(sortCriteria)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        console.log('Company jobs found:', jobs.length); // Debug log

        const total = await Job.countDocuments(query);

        // Add status to each job (removed isExpired logic)
        const jobsWithStatus = jobs.map(job => {
            const jobObj = job.toObject();
            jobObj.canApply = job.isActive; // Simplified - only check if active
            return jobObj;
        });

        res.json({
            jobs: jobsWithStatus,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
        });
    } catch (error) {
        console.error('Error in GET /api/jobs/company/:companyId:', error);
        res.status(500).json({ message: error.message });
    }
});

export default router;