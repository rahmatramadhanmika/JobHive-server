# OpenAI Integration Documentation

This document details the OpenAI GPT-4 integration for the CV Analyzer module, including prompt engineering, cost optimization, and best practices.

## Overview

The CV Analyzer leverages OpenAI's GPT-4 model to provide intelligent CV analysis, including:
- ATS compatibility assessment
- Skills alignment evaluation
- Experience relevance scoring
- Improvement recommendations
- Market positioning insights

## Service Architecture

### OpenAI Service Class

The `OpenAIService` class (`services/openai.service.js`) handles all interactions with the OpenAI API:

```javascript
class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 4000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3;
  }
}
```

## Prompt Engineering

### Master Prompt Template

The system uses sophisticated prompt engineering to ensure consistent, high-quality analysis:

```javascript
const ANALYSIS_PROMPT = `
You are an expert HR professional and ATS (Applicant Tracking System) specialist with 15+ years of experience in recruitment and career development. Your task is to analyze a CV/resume and provide comprehensive feedback.

ANALYSIS CONTEXT:
- Experience Level: {experienceLevel}
- Field/Major: {major}
- Target Job: {jobTitle} (if provided)
- Job Requirements: {jobRequirements} (if provided)

CV CONTENT TO ANALYZE:
{cvText}

ANALYSIS REQUIREMENTS:
Provide a comprehensive analysis in JSON format with the following structure:

{
  "overallScore": number (0-100),
  "sections": {
    "atsCompatibility": {
      "score": number (0-100),
      "strengths": string[],
      "weaknesses": string[],
      "recommendations": string[]
    },
    "skillsAlignment": {
      "score": number (0-100),
      "presentSkills": string[],
      "missingSkills": string[],
      "suggestions": string[]
    },
    "experienceRelevance": {
      "score": number (0-100),
      "strengths": string[],
      "weaknesses": string[],
      "improvements": string[]
    },
    "achievementQuantification": {
      "score": number (0-100),
      "quantifiedAchievements": string[],
      "unquantifiedAchievements": string[],
      "suggestions": string[]
    },
    "marketPositioning": {
      "score": number (0-100),
      "competitiveStrengths": string[],
      "marketGaps": string[],
      "positioningAdvice": string[]
    }
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "skills|experience|formatting|content",
      "suggestion": "specific actionable advice",
      "impact": "potential positive outcome",
      "timeToImplement": "immediate|short-term|long-term"
    }
  ],
  "skillsAnalysis": {
    "technical": string[],
    "soft": string[],
    "proficiencyLevels": object,
    "trending": string[],
    "obsolete": string[]
  },
  "marketInsights": {
    "salaryRange": "estimated range",
    "demandLevel": "high|medium|low",
    "competitionLevel": "high|medium|low",
    "growthAreas": string[]
  }
}

ANALYSIS GUIDELINES:

1. ATS COMPATIBILITY (Weight: 25%)
   - Evaluate formatting, structure, keyword usage
   - Check for standard sections and clear hierarchy
   - Assess readability by automated systems
   - Identify potential parsing issues

2. SKILLS ALIGNMENT (Weight: 30%)
   - Match skills against job requirements and industry standards
   - Identify skill gaps and oversupply
   - Evaluate skill relevance and currency
   - Suggest trending/in-demand skills

3. EXPERIENCE RELEVANCE (Weight: 25%)
   - Assess career progression and growth
   - Evaluate relevance to target role/industry
   - Check for consistency and logical flow
   - Identify transferable experiences

4. ACHIEVEMENT QUANTIFICATION (Weight: 10%)
   - Look for numbers, percentages, metrics
   - Identify impact-driven statements
   - Suggest quantification opportunities
   - Evaluate achievement credibility

5. MARKET POSITIONING (Weight: 10%)
   - Compare against industry standards
   - Assess competitive advantages
   - Identify unique value propositions
   - Provide market context

SCORING CRITERIA:
- 90-100: Exceptional - Industry leading, minimal improvements needed
- 80-89: Excellent - Strong candidate, minor refinements
- 70-79: Good - Solid foundation, moderate improvements needed
- 60-69: Average - Significant improvements required
- Below 60: Poor - Major restructuring needed

RESPONSE REQUIREMENTS:
- Provide specific, actionable feedback
- Use industry-standard terminology
- Include quantified impact predictions where possible
- Maintain professional, constructive tone
- Focus on practical improvements
- Consider the candidate's experience level
- Provide market-relevant insights

Return ONLY the JSON response, no additional text or formatting.
`;
```

### Dynamic Prompt Generation

The service dynamically customizes prompts based on:

1. **Experience Level Context**:
   - Entry: Focus on potential and learning ability
   - Mid: Emphasize skill development and project impact
   - Senior: Highlight leadership and strategic contributions
   - Executive: Assess vision, transformation, and business impact

2. **Industry-Specific Analysis**:
   - Technology: Technical skills, certifications, project complexity
   - Business: Leadership, financial impact, strategic thinking
   - Design: Portfolio quality, creativity, tool proficiency
   - Healthcare: Certifications, patient care, compliance

3. **Job-Specific Optimization**:
   - When job data is provided, the analysis focuses on specific requirements
   - Skills are weighted based on job posting priorities
   - Experience relevance is evaluated against role expectations

## API Integration

### Configuration

```javascript
// Environment Variables
OPENAI_API_KEY=sk-...                    // Required: Your OpenAI API key
OPENAI_MODEL=gpt-4                       // Model to use (gpt-4, gpt-4-turbo)
OPENAI_MAX_TOKENS=4000                   // Maximum tokens per request
OPENAI_TEMPERATURE=0.3                   // Creativity level (0.0-1.0)
OPENAI_TIMEOUT=120000                    // Request timeout in milliseconds
```

### Request Flow

1. **Input Validation**:
   ```javascript
   validateInputs(cvText, jobData) {
     if (!cvText || cvText.length < 100) {
       throw new Error('CV text too short for analysis');
     }
     if (cvText.length > 50000) {
       throw new Error('CV text too long - please reduce content');
     }
   }
   ```

2. **Prompt Generation**:
   ```javascript
   generatePrompt(cvText, jobData) {
     return ANALYSIS_PROMPT
       .replace('{experienceLevel}', jobData.experienceLevel)
       .replace('{major}', jobData.major)
       .replace('{jobTitle}', jobData.jobTitle || 'Not specified')
       .replace('{jobRequirements}', this.formatJobRequirements(jobData))
       .replace('{cvText}', this.sanitizeText(cvText));
   }
   ```

3. **API Call**:
   ```javascript
   async makeAPICall(prompt) {
     const response = await this.client.chat.completions.create({
       model: this.model,
       messages: [
         {
           role: 'system',
           content: 'You are an expert HR professional and ATS specialist.'
         },
         {
           role: 'user',
           content: prompt
         }
       ],
       max_tokens: this.maxTokens,
       temperature: this.temperature,
       response_format: { type: 'json_object' }
     });
     return response;
   }
   ```

4. **Response Processing**:
   ```javascript
   processResponse(response) {
     const content = response.choices[0].message.content;
     const analysis = JSON.parse(content);
     
     // Validate response structure
     this.validateAnalysisStructure(analysis);
     
     // Calculate derived metrics
     analysis.matchingScore = this.calculateMatchingScore(analysis);
     
     return analysis;
   }
   ```

## Error Handling

### Retry Logic

```javascript
async analyzeWithRetry(cvText, jobData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.analyzeCV(cvText, jobData);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await this.sleep(delay);
      
      console.warn(`CV Analysis attempt ${attempt} failed, retrying in ${delay}ms`);
    }
  }
}
```

### Error Types and Handling

1. **API Errors**:
   ```javascript
   handleAPIError(error) {
     if (error.status === 429) {
       // Rate limit exceeded
       throw new Error('OpenAI rate limit exceeded. Please try again later.');
     }
     if (error.status === 401) {
       // Invalid API key
       throw new Error('OpenAI API authentication failed.');
     }
     if (error.status >= 500) {
       // Server error
       throw new Error('OpenAI service temporarily unavailable.');
     }
     throw error;
   }
   ```

2. **Response Validation**:
   ```javascript
   validateAnalysisStructure(analysis) {
     const requiredFields = ['overallScore', 'sections', 'recommendations'];
     const missingFields = requiredFields.filter(field => !(field in analysis));
     
     if (missingFields.length > 0) {
       throw new Error(`Invalid analysis structure: missing ${missingFields.join(', ')}`);
     }
     
     if (analysis.overallScore < 0 || analysis.overallScore > 100) {
       throw new Error('Invalid overall score: must be between 0 and 100');
     }
   }
   ```

## Cost Optimization

### Token Management

1. **Input Optimization**:
   ```javascript
   optimizeInputText(cvText) {
     // Remove excessive whitespace
     cvText = cvText.replace(/\s+/g, ' ');
     
     // Remove common resume artifacts
     cvText = cvText.replace(/Page \d+ of \d+/g, '');
     cvText = cvText.replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DATE]');
     
     // Compress repetitive sections
     cvText = this.compressRepetitiveSections(cvText);
     
     return cvText.trim();
   }
   ```

2. **Token Counting**:
   ```javascript
   estimateTokens(text) {
     // Rough estimation: 1 token ≈ 4 characters for English text
     return Math.ceil(text.length / 4);
   }
   
   validateTokenLimit(prompt) {
     const estimatedTokens = this.estimateTokens(prompt);
     const maxInputTokens = this.maxTokens * 0.75; // Reserve 25% for response
     
     if (estimatedTokens > maxInputTokens) {
       throw new Error(`Input too long: ${estimatedTokens} tokens (max: ${maxInputTokens})`);
     }
   }
   ```

3. **Usage Tracking**:
   ```javascript
   async trackUsage(response, userId) {
     const usage = {
       userId,
       timestamp: new Date(),
       model: this.model,
       promptTokens: response.usage.prompt_tokens,
       completionTokens: response.usage.completion_tokens,
       totalTokens: response.usage.total_tokens,
       estimatedCost: this.calculateCost(response.usage)
     };
     
     await this.saveUsageMetrics(usage);
   }
   
   calculateCost(usage) {
     const rates = {
       'gpt-4': { input: 0.03, output: 0.06 }, // Per 1K tokens
       'gpt-4-turbo': { input: 0.01, output: 0.03 }
     };
     
     const rate = rates[this.model];
     return (usage.prompt_tokens * rate.input + usage.completion_tokens * rate.output) / 1000;
   }
   ```

### Caching Strategy

```javascript
class AnalysisCache {
  generateCacheKey(cvText, jobData) {
    const content = crypto
      .createHash('sha256')
      .update(cvText + JSON.stringify(jobData))
      .digest('hex');
    return `cv_analysis:${content}`;
  }
  
  async getCachedAnalysis(cacheKey) {
    // In production, use Redis
    return this.cache.get(cacheKey);
  }
  
  async setCachedAnalysis(cacheKey, analysis, ttl = 3600) {
    // Cache for 1 hour by default
    return this.cache.set(cacheKey, analysis, ttl);
  }
}
```

## Performance Optimization

### Async Processing

```javascript
class CVAnalysisQueue {
  async addAnalysisJob(analysisId, cvText, jobData) {
    const job = {
      id: analysisId,
      type: 'cv_analysis',
      data: { cvText, jobData },
      priority: 'normal',
      attempts: 3,
      delay: 0
    };
    
    await this.queue.add(job);
  }
  
  async processAnalysisJob(job) {
    const { cvText, jobData } = job.data;
    
    try {
      const analysis = await this.openAIService.analyzeCV(cvText, jobData);
      await this.updateAnalysisResult(job.id, analysis);
    } catch (error) {
      await this.markAnalysisAsFailed(job.id, error.message);
      throw error;
    }
  }
}
```

### Response Streaming

```javascript
async analyzeWithStreaming(cvText, jobData) {
  const stream = await this.client.chat.completions.create({
    model: this.model,
    messages: this.buildMessages(cvText, jobData),
    stream: true,
    max_tokens: this.maxTokens
  });
  
  let fullResponse = '';
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    
    // Emit partial updates for real-time UI updates
    this.emit('analysisProgress', {
      analysisId: this.currentAnalysisId,
      partialContent: content,
      isComplete: false
    });
  }
  
  return this.processResponse(fullResponse);
}
```

## Quality Assurance

### Response Validation

```javascript
validateAnalysisQuality(analysis) {
  const qualityChecks = [
    {
      name: 'Score Consistency',
      check: () => this.validateScoreConsistency(analysis),
      weight: 0.3
    },
    {
      name: 'Recommendation Relevance',
      check: () => this.validateRecommendations(analysis),
      weight: 0.3
    },
    {
      name: 'Content Completeness',
      check: () => this.validateCompleteness(analysis),
      weight: 0.4
    }
  ];
  
  const qualityScore = qualityChecks.reduce((score, check) => {
    return score + (check.check() * check.weight);
  }, 0);
  
  if (qualityScore < 0.7) {
    throw new Error('Analysis quality below threshold');
  }
  
  return qualityScore;
}
```

### A/B Testing

```javascript
class PromptTesting {
  async runAnalysisVariant(cvText, jobData, variant = 'default') {
    const prompt = this.getPromptVariant(variant);
    const analysis = await this.analyzeWithPrompt(cvText, jobData, prompt);
    
    // Track variant performance
    await this.trackVariantMetrics(variant, analysis);
    
    return analysis;
  }
  
  getPromptVariant(variant) {
    const variants = {
      'default': this.defaultPrompt,
      'detailed': this.detailedPrompt,
      'concise': this.concisePrompt,
      'industry_specific': this.industrySpecificPrompt
    };
    
    return variants[variant] || variants.default;
  }
}
```

## Monitoring and Analytics

### Usage Metrics

```javascript
class OpenAIMetrics {
  async logAPICall(request, response, duration) {
    const metrics = {
      timestamp: new Date(),
      model: request.model,
      tokens: response.usage,
      duration,
      cost: this.calculateCost(response.usage),
      success: true
    };
    
    await this.saveMetrics(metrics);
  }
  
  async getDailyUsage(date) {
    return this.aggregateMetrics('daily', date);
  }
  
  async getCostAnalysis(startDate, endDate) {
    return this.aggregateMetrics('cost', { startDate, endDate });
  }
}
```

### Performance Monitoring

```javascript
class PerformanceMonitor {
  async trackAnalysisPerformance(analysisId, startTime, endTime, quality) {
    const performance = {
      analysisId,
      duration: endTime - startTime,
      qualityScore: quality,
      timestamp: new Date()
    };
    
    await this.savePerformanceMetrics(performance);
    
    // Alert if performance degrades
    if (performance.duration > this.thresholds.maxDuration) {
      await this.sendAlert('Performance degradation detected');
    }
  }
}
```

## Security Considerations

### API Key Management

```javascript
class SecurityManager {
  validateAPIKey() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
  }
  
  rotateAPIKey() {
    // Implement key rotation logic for production
    console.log('API key rotation not implemented in development');
  }
}
```

### Data Sanitization

```javascript
sanitizeForAI(text) {
  // Remove sensitive information before sending to OpenAI
  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN
    /\b\d{16}\b/g,                      // Credit card
    /\b[\w.-]+@[\w.-]+\.\w+\b/g,        // Email (optional)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g    // Phone numbers
  ];
  
  patterns.forEach(pattern => {
    text = text.replace(pattern, '[REDACTED]');
  });
  
  return text;
}
```

## Best Practices

### 1. Prompt Design
- Use specific, detailed instructions
- Include examples and expected formats
- Define clear scoring criteria
- Consider edge cases and error handling

### 2. Cost Management
- Implement token counting and limits
- Use caching for similar requests
- Monitor usage and set alerts
- Consider model selection based on complexity

### 3. Quality Control
- Validate response structure
- Implement quality scoring
- Use A/B testing for prompt optimization
- Monitor and improve over time

### 4. Performance
- Use async processing for long operations
- Implement proper retry logic
- Cache frequent requests
- Monitor response times

### 5. Security
- Sanitize sensitive data
- Secure API key storage
- Implement rate limiting
- Audit AI interactions
