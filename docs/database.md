# Database Schema & ERD

## Entity Relationship Diagram

```mermaid
erDiagram
    User {
        ObjectId _id PK
        string fullName
        string email UK
        string password
        string phoneNumber
        string profilePicture
        string bio
        date birthDate
        enum gender
        string domicile
        string personalSummary
        array skills
        array experience
        array education
        array savedJobs
        boolean isActive
        date lastLogin
        boolean emailVerified
        string emailVerificationToken
        string passwordResetToken
        date passwordResetExpire
        date createdAt
        date updatedAt
    }

    Company {
        ObjectId _id PK
        string companyName
        string email UK
        string password
        string phoneNumber
        string profilePicture
        string bannerPicture
        string website
        string industry
        string mainLocation
        string description
        date lastLogin
        date createdAt
        date updatedAt
    }

    Job {
        ObjectId _id PK
        string title
        string major
        enum type
        enum workLocation
        string location
        object salary
        string description
        array requirements
        array responsibilities
        array skills
        array benefits
        enum experienceLevel
        ObjectId category FK
        ObjectId companyId FK
        date datePosted
        date applicationDeadline
        boolean isActive
        boolean isFeatured
        number views
        number applicationsCount
        array tags
        string contactEmail
        string contactPhone
        date createdAt
        date updatedAt
    }

    Category {
        ObjectId _id PK
        string categoryName UK
        enum categoryType
        string description
        boolean isActive
        date createdAt
        date updatedAt
    }

    Application {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId jobId FK
        string fullName
        string domicile
        string phoneNumber
        string email
        string resume
        string coverLetter
        string personalStatement
        date applicationDate
        enum status
        array statusHistory
        array companyNotes
        object interviewDetails
        object expectedSalary
        date availableStartDate
        array additionalDocuments
        date createdAt
        date updatedAt
    }

    SavedJob {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId jobId FK
        string note
        date dateSaved
        array tags
        enum priority
        date reminderDate
        boolean isActive
        date createdAt
        date updatedAt
    }

    User ||--o{ Application : "submits"
    User ||--o{ SavedJob : "saves"
    Company ||--o{ Job : "posts"
    Job ||--o{ Application : "receives"
    Job ||--o{ SavedJob : "is saved as"
    Category ||--o{ Job : "categorizes"
    Job }o--|| Company : "belongs to"
```

## Table Schemas

### users Collection
```javascript
{
  _id: ObjectId,
  fullName: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /regex_pattern/
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  phoneNumber: {
    type: String,
    maxlength: 20,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    maxlength: 500
  },
  birthDate: Date,
  gender: {
    type: String,
    enum: ["male", "female", "prefer-not-to-say"],
    default: "prefer-not-to-say"
  },
  domicile: {
    type: String,
    trim: true
  },
  personalSummary: {
    type: String,
    maxlength: 1000
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: [{
    company: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    current: { type: Boolean, default: false },
    description: { type: String, maxlength: 500 }
  }],
  education: [{
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    current: { type: Boolean, default: false },
    grade: { type: String, trim: true }
  }],
  savedJobs: [{
    type: Schema.Types.ObjectId,
    ref: "Job"
  }],
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpire: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### companies Collection
```javascript
{
  _id: ObjectId,
  companyName: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /regex_pattern/
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  phoneNumber: {
    type: String,
    maxlength: 20,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ""
  },
  bannerPicture: String,
  website: {
    type: String,
    trim: true,
    match: /^https?:\/\/.+/
  },
  industry: {
    type: String,
    maxlength: 100,
    trim: true
  },
  mainLocation: {
    type: String,
    maxlength: 200,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000
  },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### jobs Collection
```javascript
{
  _id: ObjectId,
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  major: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ["full-time", "part-time", "contract", "internship", "freelance"],
    default: "full-time"
  },
  workLocation: {
    type: String,
    required: true,
    enum: ["onsite", "remote", "hybrid"],
    default: "onsite"
  },
  location: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  salary: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: {
      type: String,
      enum: ["USD", "IDR", "SGD", "MYR", "PHP", "THB"],
      default: "USD"
    },
    period: {
      type: String,
      enum: ["hourly", "monthly", "yearly"],
      default: "monthly"
    }
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  requirements: [{
    type: String,
    trim: true,
    required: true
  }],
  responsibilities: [{
    type: String,
    trim: true,
    required: true
  }],
  skills: [{ type: String, trim: true }],
  benefits: [{ type: String, trim: true }],
  experienceLevel: {
    type: String,
    enum: ["entry", "mid", "senior", "lead", "executive"],
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  datePosted: { type: Date, default: Date.now },
  applicationDeadline: Date,
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  applicationsCount: { type: Number, default: 0 },
  tags: [{ type: String, trim: true }],
  contactEmail: {
    type: String,
    trim: true,
    match: /regex_pattern/
  },
  contactPhone: {
    type: String,
    maxlength: 20,
    trim: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### categories Collection
```javascript
{
  _id: ObjectId,
  categoryName: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
    trim: true
  },
  categoryType: {
    type: String,
    required: true,
    enum: ["major", "type", "workLocation", "location"],
    default: "major"
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### applications Collection
```javascript
{
  _id: ObjectId,
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },
  fullName: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  domicile: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    maxlength: 20,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    match: /regex_pattern/
  },
  resume: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  personalStatement: {
    type: String,
    maxlength: 1000
  },
  applicationDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "reviewing", "shortlisted", "interview", "offered", "rejected", "withdrawn"],
    default: "pending"
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ["pending", "reviewing", "shortlisted", "interview", "offered", "rejected", "withdrawn"],
      required: true
    },
    date: { type: Date, default: Date.now },
    note: { type: String, maxlength: 500 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Company" }
  }],
  companyNotes: [{
    note: { type: String, required: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  interviewDetails: {
    scheduledDate: Date,
    location: { type: String, trim: true },
    type: {
      type: String,
      enum: ["phone", "video", "onsite", "online"],
      default: "onsite"
    },
    notes: { type: String, maxlength: 1000 }
  },
  expectedSalary: {
    amount: { type: Number, min: 0 },
    currency: {
      type: String,
      enum: ["USD", "IDR", "SGD", "MYR", "PHP", "THB"],
      default: "USD"
    },
    period: {
      type: String,
      enum: ["hourly", "monthly", "yearly"],
      default: "monthly"
    }
  },
  availableStartDate: Date,
  additionalDocuments: [{
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ["portfolio", "certificate", "recommendation", "other"],
      default: "other"
    }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### savedjobs Collection
```javascript
{
  _id: ObjectId,
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: "Job",
    required: true
  },
  note: {
    type: String,
    maxlength: 500,
    trim: true
  },
  dateSaved: { type: Date, default: Date.now },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium"
  },
  reminderDate: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

## Database Indexes

### Performance Indexes

#### users Collection
```javascript
// Unique indexes
{ email: 1 }

// Query optimization indexes
{ isActive: 1 }
{ lastLogin: -1 }
{ "skills": 1 }
```

#### companies Collection
```javascript
// Unique indexes
{ email: 1 }

// Query optimization indexes
{ industry: 1 }
{ mainLocation: 1 }
{ lastLogin: -1 }
```

#### jobs Collection
```javascript
// Text search index
{ title: "text", description: "text", major: "text" }

// Query optimization indexes
{ location: 1 }
{ type: 1 }
{ workLocation: 1 }
{ experienceLevel: 1 }
{ datePosted: -1 }
{ isActive: 1 }
{ companyId: 1 }
{ category: 1 }
{ isFeatured: 1 }

// Compound indexes for common queries
{ isActive: 1, datePosted: -1 }
{ companyId: 1, isActive: 1 }
{ category: 1, isActive: 1 }
{ type: 1, workLocation: 1, isActive: 1 }
```

#### categories Collection
```javascript
// Unique indexes
{ categoryName: 1 }

// Query optimization indexes
{ categoryType: 1, isActive: 1 }
{ isActive: 1 }
```

#### applications Collection
```javascript
// Unique constraint to prevent duplicate applications
{ userId: 1, jobId: 1 }

// Query optimization indexes
{ status: 1 }
{ applicationDate: -1 }
{ userId: 1, status: 1 }

// Compound indexes for common queries
{ jobId: 1, status: 1 }
{ userId: 1, applicationDate: -1 }
```

#### savedjobs Collection
```javascript
// Unique constraint to prevent duplicate saves
{ userId: 1, jobId: 1 }

// Query optimization indexes
{ userId: 1, isActive: 1 }
{ dateSaved: -1 }
{ priority: 1 }
{ reminderDate: 1 }

// Compound indexes
{ userId: 1, dateSaved: -1 }
{ userId: 1, priority: 1, isActive: 1 }
```

## Data Relationships

### One-to-Many Relationships

1. **Company → Jobs**
   - One company can post multiple jobs
   - Foreign key: `jobs.companyId` references `companies._id`

2. **Category → Jobs**
   - One category can have multiple jobs
   - Foreign key: `jobs.category` references `categories._id`

3. **User → Applications**
   - One user can submit multiple applications
   - Foreign key: `applications.userId` references `users._id`

4. **Job → Applications**
   - One job can receive multiple applications
   - Foreign key: `applications.jobId` references `jobs._id`

5. **User → SavedJobs**
   - One user can save multiple jobs
   - Foreign key: `savedjobs.userId` references `users._id`

6. **Job → SavedJobs**
   - One job can be saved by multiple users
   - Foreign key: `savedjobs.jobId` references `jobs._id`

### Many-to-Many Relationships

1. **Users ↔ Jobs (through SavedJobs)**
   - Users can save multiple jobs
   - Jobs can be saved by multiple users
   - Junction table: `savedjobs`

2. **Users ↔ Jobs (through Applications)**
   - Users can apply to multiple jobs
   - Jobs can receive applications from multiple users
   - Junction table: `applications`

## Virtual Fields

### users Virtual Fields
```javascript
// Virtual for getting user's applications
userSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'userId'
});
```

### companies Virtual Fields
```javascript
// Virtual for counting posted jobs
companySchema.virtual('jobsCount', {
  ref: 'Job',
  localField: '_id',
  foreignField: 'companyId',
  count: true
});
```

### jobs Virtual Fields
```javascript
// Virtual for getting job applications
jobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'jobId'
});
```

### savedjobs Virtual Fields
```javascript
// Virtual to populate job details
savedJobSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});
```

### applications Virtual Fields
```javascript
// Virtual to populate job details
applicationSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate user details
applicationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});
```

## Database Connection Configuration

### MongoDB Connection String
```javascript
const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://username:password@cluster.mongodb.net/database_name";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Connection Options
```javascript
const options = {
  maxPoolSize: 10,        // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000,  // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0,    // Disable mongoose buffering
  bufferCommands: false,  // Disable mongoose buffering
};
```

## Data Migration Scripts

### Initial Categories Seeder
```javascript
const seedCategories = async () => {
  const categories = [
    { categoryName: "Technology", categoryType: "major" },
    { categoryName: "Healthcare", categoryType: "major" },
    { categoryName: "Finance", categoryType: "major" },
    { categoryName: "Education", categoryType: "major" },
    { categoryName: "Marketing", categoryType: "major" },
    { categoryName: "Full-time", categoryType: "type" },
    { categoryName: "Part-time", categoryType: "type" },
    { categoryName: "Contract", categoryType: "type" },
    { categoryName: "Remote", categoryType: "workLocation" },
    { categoryName: "Hybrid", categoryType: "workLocation" },
    { categoryName: "Onsite", categoryType: "workLocation" }
  ];

  await Category.insertMany(categories);
};
```

### Sample Data Generator
```javascript
const generateSampleData = async () => {
  // Create sample companies
  const companies = await createSampleCompanies();
  
  // Create sample categories
  await seedCategories();
  
  // Create sample jobs
  const jobs = await createSampleJobs(companies);
  
  // Create sample users
  const users = await createSampleUsers();
  
  // Create sample applications
  await createSampleApplications(users, jobs);
};
```

---

*Last updated: July 31, 2025*
