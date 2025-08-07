import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./config/passport.js";
import userRouter from "./routers/user.js";
import companyRouter from "./routers/company.js";
import jobRouter from "./routers/job.js";
import applicationRouter from "./routers/application.js";
import cvAnalyzerRouter from "./routers/cv-analyzer.js";
import savedJobRouter from "./routers/savedjob.js";

dotenv.config();

const app = express();

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Serve test files (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static('.')); // Serve files from root directory for testing
}

app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add session middleware BEFORE passport
app.use(
    session({
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Set to true in production with HTTPS
            maxAge: 1000 * 60 * 60 * 24, // 24 hours
        },
    })
);

// Initialize passport AFTER session
app.use(passport.initialize());
app.use(passport.session());

// Routes - back to original structure with saved jobs added
app.use("/auth", userRouter);
app.use("/company", companyRouter);
app.use("/api/jobs", jobRouter); // Legacy route for backward compatibility
app.use("/api/v1/jobs", jobRouter); // New versioned route
app.use("/api/applications", applicationRouter);
app.use("/api/saved-jobs", savedJobRouter);
app.use("/api/v1/cv-analyzer", cvAnalyzerRouter);

// Basic test route
app.get("/", (req, res) => {
    res.json({ message: "Job Portal API is running!" });
});

// Add a test route for saved jobs to debug
app.get("/api/saved-jobs-test", (req, res) => {
    res.json({ message: "Saved jobs endpoint is accessible!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message });
});

// 404 handler for debugging - FIXED: Use proper Express wildcard syntax
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

export default app;