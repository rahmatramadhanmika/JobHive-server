// Sample script to seed your database with test data
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import Job from '../models/job.model.js';
import Category from '../models/category.model.js';

dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI);

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Job.deleteMany({});
    await Category.deleteMany({});

    // Create sample categories
    const categories = await Category.create([
      { categoryName: 'Technology', description: 'Technology and IT jobs' },
      { categoryName: 'Marketing', description: 'Marketing and advertising jobs' },
      { categoryName: 'Finance', description: 'Finance and accounting jobs' },
      { categoryName: 'Healthcare', description: 'Healthcare and medical jobs' },
    ]);

    // Create sample users
    const users = await User.create([
      {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: '123456',
        phoneNumber: '1234567890',
      },
      {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        password: '123456',
        phoneNumber: '1234567891',
      },
    ]);

    // Create sample companies
    const companies = await Company.create([
      {
        companyName: 'Tech Corp',
        email: 'hr@techcorp.com',
        password: '123456',
        phoneNumber: '1234567892',
        industry: 'Technology',
        mainLocation: 'San Francisco, CA',
      },
      {
        companyName: 'Marketing Plus',
        email: 'hr@marketingplus.com',
        password: '123456',
        phoneNumber: '1234567893',
        industry: 'Marketing',
        mainLocation: 'New York, NY',
      },
    ]);

    // Create sample jobs
    const jobs = await Job.create([
      {
        title: 'Frontend Developer',
        major: 'Computer Science',
        type: 'full-time',
        workLocation: 'hybrid',
        location: 'San Francisco, CA',
        salary: {
          min: 80000,
          max: 120000,
          currency: 'USD',
          period: 'yearly',
        },
        description: 'We are looking for a talented Frontend Developer...',
        requirements: ['Bachelor degree in CS', '3+ years React experience'],
        responsibilities: ['Develop user interfaces', 'Code reviews'],
        skills: ['React', 'JavaScript', 'HTML', 'CSS'],
        benefits: ['Health insurance', '401k'],
        experienceLevel: 'mid',
        category: categories[0]._id,
        companyId: companies[0]._id,
        applicationDeadline: new Date('2025-12-31'),
      },
      {
        title: 'Marketing Manager',
        major: 'Marketing',
        type: 'full-time',
        workLocation: 'onsite',
        location: 'New York, NY',
        salary: {
          min: 70000,
          max: 100000,
          currency: 'USD',
          period: 'yearly',
        },
        description: 'We are seeking an experienced Marketing Manager...',
        requirements: ['Bachelor degree in Marketing', '5+ years experience'],
        responsibilities: ['Develop marketing strategies', 'Manage campaigns'],
        skills: ['Digital Marketing', 'Analytics', 'Strategy'],
        benefits: ['Health insurance', 'Vacation'],
        experienceLevel: 'senior',
        category: categories[1]._id,
        companyId: companies[1]._id,
        applicationDeadline: new Date('2025-12-31'),
      },
    ]);

    console.log('Database seeded successfully!');
    console.log(`Created ${users.length} users`);
    console.log(`Created ${companies.length} companies`);
    console.log(`Created ${jobs.length} jobs`);
    console.log(`Created ${categories.length} categories`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
