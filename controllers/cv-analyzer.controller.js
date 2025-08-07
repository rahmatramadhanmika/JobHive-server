import CVAnalysis from "../models/cvanalysis.model.js";
import User from "../models/user.model.js";
import Job from "../models/job.model.js";
import OpenAIService from "../services/openai.service.js";
import PDFParserService from "../services/pdf-parser.service.js";
import fs from "fs/promises";
import path from "path";

/**
 * CV Analyzer Controller
 * Handles all CV analysis operations including upload, analysis, and results management
 */
class CVAnalyzerController {
  constructor() {
    this.openAIService = new OpenAIService();
    this.pdfParserService = new PDFParserService();
  }

  /**
   * Upload and analyze CV
   * POST /api/v1/cv-analyzer/upload
   */
  uploadAndAnalyzeCV = async (req, res) => {
    try {
      const { experienceLevel, major, targetJobTitle } = req.body;
      const userId = req.user._id;
      
      // Validate required fields
      if (!experienceLevel || !major) {
        return res.status(400).json({
          success: false,
          message: "Experience level and major are required"
        });
      }

      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No CV file uploaded"
        });
      }

      console.log('Processing uploaded file:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Get job data with target job title if provided
      let jobData = {
        experienceLevel,
        major
      };

      if (targetJobTitle && targetJobTitle.trim()) {
        jobData.targetJobTitle = targetJobTitle.trim();
      }

      // Create initial analysis record WITHOUT extracting text yet
      // We'll extract text during the actual analysis to avoid storing large text in DB
      const analysis = new CVAnalysis({
        userId,
        originalFilename: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        extractedText: "Processing...", // Placeholder - will be replaced during analysis
        jobData,
        processingStatus: 'processing'
      });

      await analysis.save();
      console.log('Analysis record created with ID:', analysis._id);
      console.log('File will be processed from:', req.file.path);

      // Add a small delay to ensure file is fully written
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start async analysis
      console.log('Starting async analysis process...');
      this.performAnalysis(analysis._id).catch(error => {
        console.error(`Analysis failed for ${analysis._id}:`, error);
        this.markAnalysisAsFailed(analysis._id, error.message);
      });

      res.status(202).json({
        success: true,
        message: "CV uploaded successfully. Analysis is in progress.",
        data: {
          analysisId: analysis._id,
          status: analysis.processingStatus,
          estimatedCompletionTime: "2-3 minutes"
        }
      });

    } catch (error) {
      console.error("CV upload error:", error);
      
      // Clean up uploaded file if exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("File cleanup error:", cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: "Failed to upload and analyze CV",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Get analysis results
   * GET /api/v1/cv-analyzer/results/:analysisId
   */
  getAnalysisResults = async (req, res) => {
    try {
      const { analysisId } = req.params;
      const userId = req.user._id;

      const analysis = await CVAnalysis.findOne({
        _id: analysisId,
        userId
      }).populate('userId', 'fullName email');

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: "Analysis not found"
        });
      }

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve analysis results",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Get user's analysis history
   * GET /api/v1/cv-analyzer/history
   */
  getAnalysisHistory = async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status } = req.query;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: '-extractedText -aiAnalysis.rawResponse'
      };

      const analyses = await CVAnalysis.paginate(query, options);

      res.json({
        success: true,
        data: analyses
      });

    } catch (error) {
      console.error("Get history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve analysis history",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Reanalyze existing CV
   * POST /api/v1/cv-analyzer/reanalyze/:analysisId
   */
  reanalyzeCV = async (req, res) => {
    try {
      const { analysisId } = req.params;
      const { experienceLevel, major, targetJobTitle } = req.body;
      const userId = req.user._id;

      const analysis = await CVAnalysis.findOne({
        _id: analysisId,
        userId
      });

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: "Analysis not found"
        });
      }

      // Update job data if provided
      if (experienceLevel || major || targetJobTitle) {
        let jobData = { ...analysis.jobData };
        
        if (experienceLevel) jobData.experienceLevel = experienceLevel;
        if (major) jobData.major = major;
        
        if (targetJobTitle !== undefined) {
          if (targetJobTitle && targetJobTitle.trim()) {
            jobData.targetJobTitle = targetJobTitle.trim();
          } else {
            // Remove targetJobTitle if empty string is provided
            delete jobData.targetJobTitle;
          }
        }
        
        analysis.jobData = jobData;
      }

      // Reset analysis status and clear previous results
      analysis.processingStatus = 'processing';
      analysis.overallScore = undefined;
      analysis.summary = undefined;
      analysis.sections = {};
      analysis.recommendations = [];
      analysis.jobMatching = {};
      analysis.marketInsights = {};
      analysis.openaiProcessing = undefined;
      analysis.errorMessage = undefined;

      await analysis.save();

      // Start async reanalysis
      this.performAnalysis(analysis._id).catch(error => {
        console.error(`Reanalysis failed for ${analysis._id}:`, error);
        this.markAnalysisAsFailed(analysis._id, error.message);
      });

      res.json({
        success: true,
        message: "CV reanalysis started successfully",
        data: {
          analysisId: analysis._id,
          status: analysis.processingStatus
        }
      });

    } catch (error) {
      console.error("Reanalyze error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reanalyze CV",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Delete analysis
   * DELETE /api/v1/cv-analyzer/:analysisId
   */
  deleteAnalysis = async (req, res) => {
    try {
      const { analysisId } = req.params;
      const userId = req.user._id;

      const analysis = await CVAnalysis.findOne({
        _id: analysisId,
        userId
      });

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: "Analysis not found"
        });
      }

      // Delete associated file
      try {
        await fs.unlink(analysis.filePath);
      } catch (fileError) {
        console.warn(`Failed to delete file ${analysis.filePath}:`, fileError.message);
      }

      // Delete analysis record
      await CVAnalysis.findByIdAndDelete(analysisId);

      res.json({
        success: true,
        message: "Analysis deleted successfully"
      });

    } catch (error) {
      console.error("Delete analysis error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete analysis",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Get analytics and insights
   * GET /api/v1/cv-analyzer/analytics
   */
  getAnalytics = async (req, res) => {
    try {
      const userId = req.user._id;
      const { timeframe = '30d' } = req.query;

      const analytics = await CVAnalysis.getAnalytics(userId, timeframe);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve analytics",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Perform AI analysis (async)
   * @private
   */
  async performAnalysis(analysisId) {
    try {
      console.log(`Starting analysis for ID: ${analysisId}`);
      
      const analysis = await CVAnalysis.findById(analysisId);
      if (!analysis) {
        throw new Error("Analysis record not found");
      }

      console.log(`Found analysis record, file path: ${analysis.filePath}`);

      // Extract text from PDF file during analysis (not during upload)
      console.log('Starting PDF text extraction during analysis...');
      let extractedText;
      
      try {
        const extractionResult = await this.pdfParserService.extractTextFromPDF(analysis.filePath, {
          size: analysis.fileSize,
          mimetype: 'application/pdf'
        });
        extractedText = extractionResult.text;
        console.log('PDF text extraction completed, text length:', extractedText.length);
        
        // Update the analysis record with extracted text
        analysis.extractedText = extractedText;
        await analysis.save();
        
      } catch (extractionError) {
        console.error('PDF extraction failed during analysis:', extractionError);
        throw new Error(`Failed to extract text from CV: ${extractionError.message}`);
      }

      // Verify we have content to analyze
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content found in the uploaded CV');
      }

      console.log('Starting OpenAI analysis with text length:', extractedText.length);

      // Perform OpenAI analysis
      const aiResult = await this.openAIService.analyzeCV(
        extractedText,
        analysis.jobData
      );

      console.log('OpenAI analysis completed successfully');

      // Update analysis with results
      analysis.overallScore = aiResult.analysis?.overallScore;
      analysis.summary = aiResult.analysis?.summary;
      if (aiResult.analysis?.sections) {
        analysis.sections = aiResult.analysis.sections;
      }
      if (aiResult.recommendations) {
        analysis.recommendations = aiResult.recommendations;
      }
      if (aiResult.jobMatching) {
        analysis.jobMatching = aiResult.jobMatching;
      }
      if (aiResult.marketInsights) {
        analysis.marketInsights = aiResult.marketInsights;
      }
      if (aiResult.openaiProcessing) {
        analysis.openaiProcessing = aiResult.openaiProcessing;
      }
      analysis.processingStatus = 'completed';

      await analysis.save();

      console.log(`Analysis completed successfully for ${analysisId}`);

    } catch (error) {
      console.error(`Analysis failed for ${analysisId}:`, error);
      await this.markAnalysisAsFailed(analysisId, error.message);
      throw error;
    }
  }

  /**
   * Mark analysis as failed
   * @private
   */
  async markAnalysisAsFailed(analysisId, errorMessage) {
    try {
      console.log(`Marking analysis ${analysisId} as failed with error: ${errorMessage}`);
      await CVAnalysis.findByIdAndUpdate(analysisId, {
        processingStatus: 'failed',
        errorMessage: errorMessage
      });
      console.log(`Analysis ${analysisId} marked as failed`);
    } catch (updateError) {
      console.error(`Failed to update analysis status for ${analysisId}:`, updateError);
    }
  }
}

export default new CVAnalyzerController();
