/**
 * Verify email templates in MongoDB
 */

import mongoose from 'mongoose';
import { EmailTemplate } from '../src/models/email-template.model';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
  try {
    const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/uthsava';    
    await mongoose.connect(mongoUrl);
    const templates = await EmailTemplate.find({ 
      keyword: { $in: ['CONTENT_APPROVAL', 'CONTENT_REJECTION'] } 
    });
    if (templates.length === 0) {
      await mongoose.disconnect();
      process.exit(1);
    }    
    templates.forEach((t: any) => {
      console.log('');
    });    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying templates:', error);
    process.exit(1);
  }
}

verify();
