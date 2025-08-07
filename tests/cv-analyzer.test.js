import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/user.model.js';
import CVAnalysis from '../models/cvanalysis.model.js';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

describe('CV Analyzer API Tests', () => {
  let testUser;
  let authToken;
  let testCVAnalysis;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/jobportal_test');
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await CVAnalysis.deleteMany({});

    // Create test user
    testUser = new User({
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    await testUser.save();

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create test CV analysis
    testCVAnalysis = new CVAnalysis({
      userId: testUser._id,
      originalFilename: 'test_resume.pdf',
      filePath: '/tmp/test_resume.pdf',
      fileSize: 1024,
      extractedText: 'Sample CV content for testing purposes.',
      jobData: {
        experienceLevel: 'mid',
        major: 'Computer Science'
      },
      status: 'completed',
      aiAnalysis: {
        overallScore: 85,
        sections: {
          atsCompatibility: { score: 90 },
          skillsAlignment: { score: 80 }
        }
      }
    });
    await testCVAnalysis.save();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'cv-analyzer');
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file.startsWith('test_')) {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist in test environment
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/v1/cv-analyzer/upload', () => {
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });

    test('should reject request without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should reject invalid experience level', async () => {
      const response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('experienceLevel', 'invalid')
        .field('major', 'Computer Science')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid experience level');
    });

    test('should reject request without CV file', async () => {
      const response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('experienceLevel', 'mid')
        .field('major', 'Computer Science')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No CV file uploaded');
    });

    // Note: File upload testing would require creating test PDF files
    // This is a simplified test structure
  });

  describe('GET /api/v1/cv-analyzer/results/:analysisId', () => {
    test('should return analysis results for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/v1/cv-analyzer/results/${testCVAnalysis._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCVAnalysis._id.toString());
      expect(response.body.data.aiAnalysis.overallScore).toBe(85);
    });

    test('should return 404 for non-existent analysis', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/cv-analyzer/results/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Analysis not found');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/cv-analyzer/results/${testCVAnalysis._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject access to other user\'s analysis', async () => {
      // Create another user
      const otherUser = new User({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'password123'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { userId: otherUser._id, type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v1/cv-analyzer/results/${testCVAnalysis._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Analysis not found');
    });
  });

  describe('GET /api/v1/cv-analyzer/history', () => {
    test('should return user analysis history', async () => {
      const response = await request(app)
        .get('/api/v1/cv-analyzer/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.docs).toHaveLength(1);
      expect(response.body.data.docs[0]._id).toBe(testCVAnalysis._id.toString());
    });

    test('should support pagination', async () => {
      // Create additional test analyses
      for (let i = 0; i < 5; i++) {
        await new CVAnalysis({
          userId: testUser._id,
          originalFilename: `test_resume_${i}.pdf`,
          filePath: `/tmp/test_resume_${i}.pdf`,
          fileSize: 1024,
          extractedText: `Sample CV content ${i}`,
          jobData: {
            experienceLevel: 'mid',
            major: 'Computer Science'
          },
          status: 'completed'
        }).save();
      }

      const response = await request(app)
        .get('/api/v1/cv-analyzer/history?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.docs).toHaveLength(3);
      expect(response.body.data.totalDocs).toBe(6);
      expect(response.body.data.totalPages).toBe(2);
    });

    test('should filter by status', async () => {
      // Create analysis with different status
      await new CVAnalysis({
        userId: testUser._id,
        originalFilename: 'processing_resume.pdf',
        filePath: '/tmp/processing_resume.pdf',
        fileSize: 1024,
        extractedText: 'Processing CV content',
        jobData: {
          experienceLevel: 'senior',
          major: 'Engineering'
        },
        status: 'processing'
      }).save();

      const response = await request(app)
        .get('/api/v1/cv-analyzer/history?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.docs).toHaveLength(1);
      expect(response.body.data.docs[0].status).toBe('completed');
    });
  });

  describe('DELETE /api/v1/cv-analyzer/:analysisId', () => {
    test('should delete analysis successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/cv-analyzer/${testCVAnalysis._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify analysis is deleted
      const deletedAnalysis = await CVAnalysis.findById(testCVAnalysis._id);
      expect(deletedAnalysis).toBeNull();
    });

    test('should return 404 for non-existent analysis', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/v1/cv-analyzer/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Analysis not found');
    });
  });

  describe('GET /api/v1/cv-analyzer/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/cv-analyzer/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('CV Analyzer service is running');
      expect(response.body.services).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Input Validation Tests', () => {
    test('should validate experience level enum', async () => {
      const invalidLevels = ['beginner', 'expert', 'novice'];
      
      for (const level of invalidLevels) {
        const response = await request(app)
          .post('/api/v1/cv-analyzer/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('experienceLevel', level)
          .field('major', 'Computer Science')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid experience level');
      }
    });

    test('should validate major field length', async () => {
      const shortMajor = 'A';
      const longMajor = 'A'.repeat(101);

      // Test short major
      let response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('experienceLevel', 'mid')
        .field('major', shortMajor)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('between 2 and 100 characters');

      // Test long major
      response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('experienceLevel', 'mid')
        .field('major', longMajor)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('between 2 and 100 characters');
    });

    test('should validate ObjectId format for jobId', async () => {
      const response = await request(app)
        .post('/api/v1/cv-analyzer/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('experienceLevel', 'mid')
        .field('major', 'Computer Science')
        .field('jobId', 'invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid job ID format');
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle invalid JSON in reanalyze request', async () => {
      const response = await request(app)
        .post(`/api/v1/cv-analyzer/reanalyze/${testCVAnalysis._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid analysis ID format', async () => {
      const response = await request(app)
        .get('/api/v1/cv-analyzer/results/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ID format');
    });
  });
});

// Mock OpenAI service for testing
jest.mock('../services/openai.service.js', () => {
  return jest.fn().mockImplementation(() => ({
    analyzeCV: jest.fn().mockResolvedValue({
      analysis: {
        overallScore: 85,
        sections: {
          atsCompatibility: { score: 90 },
          skillsAlignment: { score: 80 }
        }
      },
      recommendations: [],
      skillsAnalysis: {},
      matchingScore: { overall: 85 }
    })
  }));
});

// Mock PDF parser service for testing
jest.mock('../services/pdf-parser.service.js', () => {
  return jest.fn().mockImplementation(() => ({
    extractText: jest.fn().mockResolvedValue('Sample extracted CV text for testing')
  }));
});
