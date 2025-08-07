import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

/**
 * Enterprise PDF Parser Service for CV text extraction
 * Handles PDF processing with security, validation, and optimization
 */
class PDFParserService {
  constructor() {
    this.maxFileSize = parseInt(process.env.CV_UPLOAD_MAX_SIZE) || 5242880; // 5MB
    this.supportedMimeTypes = ['application/pdf'];
    this.maxTextLength = 50000; // Maximum extracted text length
    this.processingTimeout = 30000; // 30 seconds timeout
  }

  /**
   * Extract text from PDF file with comprehensive validation
   * @param {string} filePath - Path to PDF file
   * @param {Object} fileInfo - File metadata
   * @returns {Promise<Object>} - Extraction result with text and metadata
   */
  async extractTextFromPDF(filePath, fileInfo = {}) {
    try {
      // Validate file before processing
      await this.validateFile(filePath, fileInfo);
      
      console.log(`Starting PDF extraction for: ${filePath}`);
      const startTime = Date.now();
      
      // Read file buffer
      const buffer = await this.readFileWithTimeout(filePath);
      
      // Extract text with timeout protection
      const extractionResult = await this.extractWithTimeout(buffer);
      
      const processingTime = Date.now() - startTime;
      console.log(`PDF extraction completed in ${processingTime}ms`);
      
      // Process and clean extracted text
      const cleanedText = this.cleanExtractedText(extractionResult.text);
      
      // Validate extracted content
      this.validateExtractedContent(cleanedText);
      
      return {
        text: cleanedText,
        metadata: {
          ...extractionResult.metadata,
          processingTime,
          fileSize: fileInfo.size || buffer.length,
          wordCount: this.countWords(cleanedText),
          characterCount: cleanedText.length,
          pageCount: extractionResult.numpages || 0
        },
        success: true
      };
      
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new PDFParserError('Failed to extract text from PDF', error);
    }
  }

  /**
   * Validate file before processing
   * @param {string} filePath - File path
   * @param {Object} fileInfo - File metadata
   * @throws {PDFParserError} - If validation fails
   */
  async validateFile(filePath, fileInfo = {}) {
    try {
      console.log('Validating file at path:', filePath);
      
      // Check if file exists
      try {
        const stats = await fs.stat(filePath);
        console.log('File stats:', { size: stats.size, isFile: stats.isFile() });
        
        // Validate file size
        if (stats.size > this.maxFileSize) {
          throw new Error(`File size ${stats.size} exceeds maximum allowed size ${this.maxFileSize}`);
        }
        
        // Check for empty files
        if (stats.size === 0) {
          throw new Error('File is empty');
        }
        
      } catch (statError) {
        console.error('Failed to get file stats:', statError);
        throw new Error(`File not accessible: ${statError.message}`);
      }
      
      // Validate file extension
      const extension = path.extname(filePath).toLowerCase();
      if (extension !== '.pdf') {
        throw new Error(`Unsupported file extension: ${extension}. Only PDF files are allowed.`);
      }
      
      // Additional MIME type validation if available
      if (fileInfo.mimetype && !this.supportedMimeTypes.includes(fileInfo.mimetype)) {
        throw new Error(`Unsupported MIME type: ${fileInfo.mimetype}`);
      }
      
      // Check if file is readable
      try {
        await fs.access(filePath, fs.constants.R_OK);
        console.log('File validation passed for:', filePath);
      } catch (accessError) {
        console.error('File access check failed:', accessError);
        throw new Error(`File is not readable: ${accessError.message}`);
      }
      
    } catch (error) {
      console.error('File validation failed:', error.message);
      throw new PDFParserError('File validation failed', error);
    }
  }

  /**
   * Read file with timeout protection
   * @param {string} filePath - File path
   * @returns {Promise<Buffer>} - File buffer
   */
  async readFileWithTimeout(filePath) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('File read timeout'));
      }, this.processingTimeout);
      
      try {
        const buffer = await fs.readFile(filePath);
        clearTimeout(timeout);
        resolve(buffer);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Extract text with timeout protection
   * @param {Buffer} buffer - PDF buffer
   * @returns {Promise<Object>} - Extraction result
   */
  async extractWithTimeout(buffer) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF extraction timeout'));
      }, this.processingTimeout);
      
      try {
        console.log('Starting PDF parsing with pdf-parse...');
        
        // PDF parsing options for better text extraction
        const options = {
          // Normalize whitespace
          normalizeWhitespace: true,
          // Disable image extraction for security
          disableCombineTextItems: false,
          // Maximum pages to process (security measure)
          max: 20
        };
        
        const result = await pdfParse(buffer, options);
        clearTimeout(timeout);
        console.log('PDF parsing completed successfully');
        resolve(result);
        
      } catch (error) {
        clearTimeout(timeout);
        console.error('PDF parsing failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Clean and normalize extracted text
   * @param {string} rawText - Raw extracted text
   * @returns {string} - Cleaned text
   */
  cleanExtractedText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Invalid text input for cleaning');
    }
    
    let cleanedText = rawText;
    
    // Remove excessive whitespace and normalize line breaks
    cleanedText = cleanedText.replace(/\r\n/g, '\n');
    cleanedText = cleanedText.replace(/\r/g, '\n');
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
    cleanedText = cleanedText.replace(/[ \t]{2,}/g, ' ');
    
    // Remove common PDF artifacts
    cleanedText = cleanedText.replace(/[\\u0000-\\u001F]/g, ''); // Control characters
    cleanedText = cleanedText.replace(/\\[nrt]/g, ' '); // Escaped characters
    
    // Fix common encoding issues
    cleanedText = cleanedText.replace(/â€™/g, "'"); // Smart apostrophe
    cleanedText = cleanedText.replace(/â€œ/g, '"'); // Smart quote left
    cleanedText = cleanedText.replace(/â€/g, '"'); // Smart quote right
    cleanedText = cleanedText.replace(/â€¢/g, '•'); // Bullet point
    
    // Normalize spacing around common separators
    cleanedText = cleanedText.replace(/\s*([•·▪▫-])\s*/g, ' $1 ');
    cleanedText = cleanedText.replace(/\s*([:|;])\s*/g, '$1 ');
    
    // Remove header/footer patterns (common in PDFs)
    const lines = cleanedText.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      // Remove likely header/footer content
      return !(
        trimmedLine.length < 5 || // Very short lines
        /^Page\s+\d+/.test(trimmedLine) || // Page numbers
        /^\d+$/.test(trimmedLine) || // Standalone numbers
        /^[A-Z\s]{2,}$/.test(trimmedLine) && trimmedLine.length < 30 // All caps headers
      );
    });
    
    cleanedText = filteredLines.join('\n');
    
    // Final cleanup
    cleanedText = cleanedText.trim();
    cleanedText = cleanedText.replace(/\n{2,}/g, '\n\n');
    
    return cleanedText;
  }

  /**
   * Validate extracted content quality
   * @param {string} text - Extracted text
   * @throws {PDFParserError} - If content is invalid
   */
  validateExtractedContent(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('No text extracted from PDF');
    }
    
    if (text.length < 50) {
      throw new Error('Extracted text too short - possible parsing error');
    }
    
    if (text.length > this.maxTextLength) {
      throw new Error(`Extracted text too long (${text.length} > ${this.maxTextLength})`);
    }
    
    // Check for reasonable text-to-gibberish ratio
    const words = text.split(/\s+/);
    const validWords = words.filter(word => 
      /^[a-zA-Z0-9@.-]{2,}$/.test(word) && word.length < 50
    );
    
    const validWordRatio = validWords.length / words.length;
    if (validWordRatio < 0.5) {
      throw new Error('Low quality text extraction - possible corrupted PDF');
    }
    
    // Check for CV-like content indicators
    const cvIndicators = [
      /experience/i, /education/i, /skills/i, /work/i,
      /resume/i, /curriculum/i, /vitae/i, /contact/i,
      /email/i, /phone/i, /address/i, /university/i,
      /college/i, /degree/i, /certification/i, /project/i
    ];
    
    const foundIndicators = cvIndicators.filter(pattern => pattern.test(text));
    if (foundIndicators.length < 2) {
      console.warn('Warning: Document may not be a typical CV/resume');
    }
  }

  /**
   * Count words in text
   * @param {string} text - Input text
   * @returns {number} - Word count
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract structured sections from CV text
   * @param {string} text - CV text
   * @returns {Object} - Structured sections
   */
  extractStructuredSections(text) {
    const sections = {
      contact: '',
      summary: '',
      experience: '',
      education: '',
      skills: '',
      projects: '',
      certifications: '',
      other: ''
    };
    
    try {
      const lines = text.split('\n').map(line => line.trim());
      let currentSection = 'other';
      let sectionContent = [];
      
      for (const line of lines) {
        // Detect section headers
        const lowerLine = line.toLowerCase();
        
        if (this.isContactSection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'contact';
          sectionContent = [];
        } else if (this.isSummarySection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'summary';
          sectionContent = [];
        } else if (this.isExperienceSection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'experience';
          sectionContent = [];
        } else if (this.isEducationSection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'education';
          sectionContent = [];
        } else if (this.isSkillsSection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'skills';
          sectionContent = [];
        } else if (this.isProjectsSection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'projects';
          sectionContent = [];
        } else if (this.isCertificationsSection(lowerLine)) {
          this.saveCurrentSection(sections, currentSection, sectionContent);
          currentSection = 'certifications';
          sectionContent = [];
        } else if (line.length > 0) {
          sectionContent.push(line);
        }
      }
      
      // Save the last section
      this.saveCurrentSection(sections, currentSection, sectionContent);
      
      return sections;
    } catch (error) {
      console.warn('Failed to extract structured sections:', error);
      return sections;
    }
  }

  /**
   * Save current section content
   * @param {Object} sections - Sections object
   * @param {string} sectionName - Current section name
   * @param {Array} content - Section content lines
   */
  saveCurrentSection(sections, sectionName, content) {
    if (content.length > 0) {
      sections[sectionName] = content.join('\n').trim();
    }
  }

  // Section detection helpers
  isContactSection(line) {
    return /^(contact|personal\s+information|personal\s+details)/.test(line);
  }

  isSummarySection(line) {
    return /^(summary|profile|overview|objective|personal\s+statement)/.test(line);
  }

  isExperienceSection(line) {
    return /^(experience|work\s+experience|employment|career|professional\s+experience)/.test(line);
  }

  isEducationSection(line) {
    return /^(education|academic|qualifications|degrees)/.test(line);
  }

  isSkillsSection(line) {
    return /^(skills|technical\s+skills|competencies|expertise|abilities)/.test(line);
  }

  isProjectsSection(line) {
    return /^(projects|personal\s+projects|key\s+projects|achievements)/.test(line);
  }

  isCertificationsSection(line) {
    return /^(certifications?|certificates?|licenses?|credentials?)/.test(line);
  }

  /**
   * Get file processing statistics
   * @returns {Object} - Processing statistics
   */
  getProcessingStats() {
    return {
      maxFileSize: this.maxFileSize,
      supportedTypes: this.supportedMimeTypes,
      maxTextLength: this.maxTextLength,
      processingTimeout: this.processingTimeout
    };
  }

  /**
   * Health check for PDF parser service
   * @returns {boolean} - Service health status
   */
  async healthCheck() {
    try {
      // Load pdf-parse dynamically
      const pdfParser = await loadPdfParse();
      
      // Test with minimal PDF buffer (just check if pdf-parse is working)
      const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n%%EOF');
      await pdfParser(testBuffer);
      return true;
    } catch (error) {
      console.error('PDF parser health check failed:', error);
      return false;
    }
  }
}

/**
 * Custom error class for PDF parser errors
 */
class PDFParserError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'PDFParserError';
    this.originalError = originalError;
    
    if (originalError) {
      this.details = originalError.message;
      this.stack = originalError.stack;
    }
  }
}

export default PDFParserService;
export { PDFParserError };
