/**
 * Script to create email templates for content approval/rejection
 * Run with: npx ts-node scripts/create-email-templates.ts
 */

import mongoose from 'mongoose';
import { EmailTemplate } from '../src/models/email-template.model';
import dotenv from 'dotenv';

dotenv.config();

const TEMPLATES = [
  {
    title: 'Content Approval Notification',
    keyword: 'CONTENT_APPROVAL',
    subject: 'Your Content "{{Content Title}}" Has Been Approved! 🎉',
    description: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4CAF50; padding-bottom: 20px;">
      <h1 style="color: #4CAF50; margin: 0; font-size: 28px;">✓ Content Approved</h1>
      <p style="color: #666; margin: 10px 0 0 0;">Great news from Uthsava Platform</p>
    </div>

    <!-- Body -->
    <div style="color: #333; line-height: 1.6;">
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hi <strong>Producer</strong>,
      </p>

      <p style="font-size: 15px; margin-bottom: 20px;">
        We're delighted to inform you that your content <strong>"{{Content Title}}"</strong> has been <span style="color: #4CAF50; font-weight: bold;">successfully approved</span> by our admin team!
      </p>

      <div style="background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Content Details:</strong><br/>
          Title: {{Content Title}}<br/>
          Approval Date: {{Approved Date}}<br/>
          Status: <span style="color: #4CAF50; font-weight: bold;">APPROVED</span>
        </p>
      </div>

      <p style="font-size: 15px; margin-bottom: 20px;">
        Your content is now live and visible to the Uthsava audience. Thank you for your excellent contribution!
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

      <!-- Additional Info -->
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        <strong>What's Next?</strong>
      </p>
      <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
        <li>Your content is now available for viewers</li>
        <li>Monitor views and engagement on your dashboard</li>
        <li>Continue uploading more quality content</li>
      </ul>

      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        If you have any questions or need support, please contact us at <strong>support@uthsava.com</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f5; padding: 20px; margin-top: 30px; border-radius: 4px; text-align: center; font-size: 12px; color: #999;">
      <p style="margin: 0;">© 2026 Uthsava Entertainment. All rights reserved.</p>
    </div>

  </div>
</div>
    `,
    type: 'PRODUCER',
    status: 'active',
    createdAt: new Date(),
  },
  {
    title: 'New Content Submission Notification for Admin',
    keyword: 'NEW_CONTENT_SUBMISSION_ADMIN',
    subject: 'New {{Content Type}} Submitted: "{{Content Title}}" - Requires Review',
    description: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2196F3; padding-bottom: 20px;">
      <h1 style="color: #2196F3; margin: 0; font-size: 28px;">📢 New {{Content Type}} Submission</h1>
      <p style="color: #666; margin: 10px 0 0 0;">A producer has uploaded new content requiring your review</p>
    </div>

    <!-- Body -->
    <div style="color: #333; line-height: 1.6;">
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hi Admin,
      </p>

      <p style="font-size: 15px; margin-bottom: 20px;">
        A new <strong>{{Content Type}}</strong> has been submitted on the Uthsava platform and is awaiting your review and approval.
      </p>

      <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Content Details:</strong><br/>
          Title: {{Content Title}}<br/>
          Type: {{Content Type}}<br/>
          Producer: {{Producer Name}}<br/>
          Submitted Date: {{Submitted Date}}<br/>
          Status: <span style="color: #2196F3; font-weight: bold;">PENDING REVIEW</span>
        </p>
      </div>

      <p style="font-size: 15px; margin-bottom: 20px;">
        Please log in to the admin panel to review and approve or reject this content submission.
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

      <!-- Additional Info -->
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        <strong>Next Steps:</strong>
      </p>
      <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
        <li>Log in to your admin dashboard</li>
        <li>Navigate to Content Approval section</li>
        <li>Review the content details and media</li>
        <li>Approve or request changes from the producer</li>
      </ul>

      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        For more information, contact support at <strong>support@uthsava.com</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f5; padding: 20px; margin-top: 30px; border-radius: 4px; text-align: center; font-size: 12px; color: #999;">
      <p style="margin: 0;">© 2026 Uthsava Entertainment. All rights reserved.</p>
    </div>

  </div>
</div>
    `,
    type: 'ADMIN',
    status: 'active',
    createdAt: new Date(),
  },
  {
    title: 'Content Rejection Notification',
    keyword: 'CONTENT_REJECTION',
    subject: 'Review Needed for Your Content "{{Content Title}}"',
    description: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #ff9800; padding-bottom: 20px;">
      <h1 style="color: #ff9800; margin: 0; font-size: 28px;">⚠ Content Review Required</h1>
      <p style="color: #666; margin: 10px 0 0 0;">Important Update About Your Content</p>
    </div>

    <!-- Body -->
    <div style="color: #333; line-height: 1.6;">
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hi <strong>Producer</strong>,
      </p>

      <p style="font-size: 15px; margin-bottom: 20px;">
        Thank you for submitting your content <strong>"{{Content Title}}"</strong>. Our admin team has reviewed it and requires some modifications before approval.
      </p>

      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Rejection Reason:</strong><br/>
          {{Rejection Reason}}
        </p>
      </div>

      <p style="font-size: 15px; margin-bottom: 20px;">
        We believe that with the suggested improvements, your content can meet our quality standards. Please make the necessary changes and resubmit your content.
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

      <!-- Additional Info -->
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        <strong>Need Help?</strong>
      </p>
      <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
        <li>Review the rejection reason above carefully</li>
        <li>Check our content guidelines for more information</li>
        <li>Contact support if you need clarification</li>
      </ul>

      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        If you have questions about the rejection or need assistance, please reach out to <strong>support@uthsava.com</strong>
      </p>

      <p style="font-size: 14px; color: #666; margin-top: 15px;">
        <strong>Timeline:</strong> You can resubmit your content anytime. Each resubmission will be reviewed within 24-48 hours.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f5f5f5; padding: 20px; margin-top: 30px; border-radius: 4px; text-align: center; font-size: 12px; color: #999;">
      <p style="margin: 0;">© 2026 Uthsava Entertainment. All rights reserved.</p>
    </div>

  </div>
</div>
    `,
    type: 'PRODUCER',
    status: 'active',
    createdAt: new Date(),
  },
];

async function createTemplates() {
  try {
    const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/uthsava';
    await mongoose.connect(mongoUrl);
    for (const template of TEMPLATES) {
      const exists = await EmailTemplate.findOne({ keyword: template.keyword });
      if (exists) {
        await EmailTemplate.updateOne(
          { keyword: template.keyword },
          { $set: template }
        );
      } else {
        await EmailTemplate.create(template);
      }
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create email templates:', error);
    process.exit(1);
  }
}

createTemplates();
