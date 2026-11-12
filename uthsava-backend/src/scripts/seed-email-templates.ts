import mongoose from "mongoose";
import dotenv from "dotenv";
import { EmailTemplate } from "../models/email-template.model";
import { logger } from "../core/constants/logger";

dotenv.config();

const templates = [
  {
    title: "Welcome Email",
    keyword: "WELCOME_EMAIL",
    description: "<p>Welcome to Uthsava, {{User Name}}!</p><p>Login here: <a href=\"{{Login URL}}\">{{Login URL}}</a></p>",
    subject: "Welcome to Uthsava!",
    keywordList: ["User Name", "Platform Name", "Login URL"],
    status: "active"
  },
  {
    title: "OTP Verification Email",
    keyword: "OTP_VERIFICATION",
    description: "<p>Your OTP is <strong>{{OTP Code}}</strong>.</p><p>It is valid for {{Expiry Duration}}.</p>",
    subject: "Your OTP Code",
    keywordList: ["OTP Code", "Expiry Duration"],
    status: "active"
  },
  {
    title: "Subscription Confirmation Email",
    keyword: "SUBSCRIPTION_CONFIRMATION",
    description: "<p>You have successfully subscribed to <strong>{{Plan Name}}</strong> for <strong>{{Amount Paid}}</strong>.</p><p>Expires on {{Expiry Date}}.</p><p>Invoice: <a href=\"{{Invoice Link}}\">{{Invoice Link}}</a></p>",
    subject: "Subscription Successful",
    keywordList: ["Plan Name", "Amount Paid", "Expiry Date", "Invoice Link"],
    status: "active"
  },
  {
    title: "Subscription Expiry Reminder Email",
    keyword: "SUBSCRIPTION_EXPIRY_REMINDER",
    description: "<p>Hi {{User Name}},</p><p>your subscription expires on {{Expiry Date}}.</p><p>Renew here: <a href=\"{{Renewal Link}}\">{{Renewal Link}}</a></p>",
    subject: "Subscription Expiring Soon",
    keywordList: ["User Name", "Expiry Date", "Renewal Link"],
    status: "active"
  },
  {
    title: "Password Reset OTP",
    keyword: "PASSWORD_RESET_OTP",
    description: `
                    <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                        Dear <strong>{{userName}}</strong>,
                    </p>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 24px; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                        We received a request to reset the password for your account (<strong>{{userEmail}}</strong>).
                    </p>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif;">
                        Your One-Time Password (OTP) is:
                    </p>
                    
                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                            <td align="center" style="background-color: #f5f5f5; padding: 30px; border-radius: 8px; border: 2px solid #667eea;">
                                <p style="color: #667eea; font-size: 48px; font-weight: bold; margin: 0; font-family: Arial, monospace; letter-spacing: 8px;">
                                    {{otp}}
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Warning Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <tr>
                            <td style="padding: 15px;">
                                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 21px; font-family: Arial, sans-serif;">
                                    <strong>⏱️ Important:</strong> This OTP will expire in <strong>{{expiryTime}}</strong> for security reasons.
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="color: #555555; font-size: 14px; line-height: 21px; margin: 20px 0 0 0; font-family: Arial, sans-serif;">
                        Enter this code on the password reset page to proceed.
                    </p>
                    
                    <!-- Security Note -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #eeeeee; margin-top: 30px;">
                        <tr>
                            <td style="padding-top: 20px;">
                                <p style="color: #999999; font-size: 13px; line-height: 20px; margin: 0; font-family: Arial, sans-serif;">
                                    <strong>🔒 Security Note:</strong> If you did not request this OTP, please ignore this email. Your account is secure.
                                </p>
                            </td>
                        </tr>
                    </table>
                `,
    subject: "Your Password Reset OTP - Uthsava",
    keywordList: ["userName", "userEmail", "otp", "expiryTime"],
    status: "active"
  },
  {
    title: "Forgot Password",
    keyword: "FORGOT_PASSWORD",
    description: `
                    <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                        Dear <strong>{{userName}}</strong>,
                    </p>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 24px; margin: 0 0 25px 0; font-family: Arial, sans-serif;">
                        We received a request to reset the password for your account (<strong>{{userEmail}}</strong>).
                    </p>
                    
                    <p style="color: #555555; font-size: 15px; line-height: 24px; margin: 0 0 30px 0; font-family: Arial, sans-serif;">
                        Click the button below to create a new password:
                    </p>
                    
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                            <td align="center">
                                <a href="{{resetLink}}" style="display: inline-block; padding: 16px 48px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                                    Reset Password
                                </a>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Warning Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <tr>
                            <td style="padding: 15px;">
                                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 21px; font-family: Arial, sans-serif;">
                                    <strong>⏱️ Important:</strong> This link will expire in <strong>{{expiryTime}}</strong> for security reasons.
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="color: #777777; font-size: 14px; line-height: 21px; margin: 30px 0 10px 0; font-family: Arial, sans-serif;">
                        If the button above doesn't work, copy and paste this link into your browser:
                    </p>
                    
                    <p style="color: #1a1a1a; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 5px; margin: 0 0 25px 0; font-family: Arial, monospace;">
                        {{resetLink}}
                    </p>
                    
                    <!-- Security Note -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #eeeeee; margin-top: 30px;">
                        <tr>
                            <td style="padding-top: 20px;">
                                <p style="color: #999999; font-size: 13px; line-height: 20px; margin: 0; font-family: Arial, sans-serif;">
                                    <strong>🔒 Security Note:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account is secure.
                                </p>
                            </td>
                        </tr>
                    </table>
                `,
    subject: "Reset Your Password - Uthsava",
    keywordList: ["userName", "userEmail", "resetLink", "expiryTime"],
    status: "active"
  },
  {
    title: "New Subadmin Account",
    keyword: "NEW_ACCOUNT_SUBADMIN",
    subject: "Your Subadmin Account Created",
    description:
      '<p>Dear {{name}},</p><p>A new subadmin account has been created for you. Your login credentials are below:</p><ul><li>Email: {{email}}</li><li>Password: {{password}}</li></ul><p><strong>Login URL:</strong> <a href="{{login_url}}">{{login_url}}</a></p><p><strong>Assigned admin access:</strong> {{access_modules}}</p><p>Please change your password after logging in.</p>',
    keywordList: ["name", "email", "password", "login_url", "access_modules", "site_name"],
    status: "active"
  },
  {
    title: "Producer Credentials Email",
    keyword: "PRODUCER_CREDENTIALS",
    description: "<p>Hello {{Producer Name}},</p><p>Your producer account has been created successfully. Your login credentials are below:</p><ul><li><strong>Email:</strong> {{Email ID}}</li><li><strong>Password:</strong> {{Auto-generated Password}}</li></ul><p><strong>Login URL:</strong> <a href=\"{{Login URL}}\">{{Login URL}}</a></p><p>Please change your password after logging in.</p>",
    subject: "Your Producer Account Credentials",
    keywordList: ["Producer Name", "Email ID", "Auto-generated Password", "Login URL"],
    status: "active"
  },
  {
    title: "Content Approval Email",
    keyword: "CONTENT_APPROVAL",
    description: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;"><h2 style="color: #28a745;">Your Content Has Been Approved</h2><p>Hello,</p><p>Great news! Your submitted content <strong>{{Content Title}}</strong> has been reviewed and approved on {{Approved Date}}.</p><p><a href="{{Platform URL}}" style="display: inline-block; padding: 12px 24px; background-color: #e50914; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View Content</a></p></div>`,
    subject: "Content Approved",
    keywordList: ["Content Title", "Approved Date", "Platform URL"],
    status: "active"
  },
  {
    title: "Content Rejection Email",
    keyword: "CONTENT_REJECTION",
    description: "<p>Your content <strong>'{{Content Title}}'</strong> has been rejected.</p><p><strong>Reason:</strong> {{Rejection Reason}}</p><p>Edit & resubmit here: <a href=\"{{Edit & Resubmit URL}}\">{{Edit & Resubmit URL}}</a></p>",
    subject: "Content Rejected",
    keywordList: ["Content Title", "Rejection Reason", "Edit & Resubmit URL"],
    status: "active"
  },
  {
    title: "Earnings Settlement Email",
    keyword: "EARNINGS_SETTLEMENT",
    description: "<p>Hello {{Producer Name}},</p><p>Your payout of <strong>{{Settlement Amount}}</strong> for {{Settlement Period}} has been processed.</p><p><strong>Reference Number:</strong> {{Reference Number}}</p>",
    subject: "Earnings Settlement Processed",
    keywordList: ["Producer Name", "Settlement Amount", "Settlement Period", "Reference Number"],
    status: "active"
  },
  {
    title: "New Content Alert Email",
    keyword: "NEW_CONTENT_ALERT",
    description: "New content alert! '{{Content Title}}' is now available. {{Content Thumbnail}}. Watch now: {{Watch Now URL}}",
    subject: "New Content Available",
    keywordList: ["Content Title", "Content Thumbnail", "Watch Now URL"],
    status: "active"
  },
  {
    title: "Payment Success Receipt",
    keyword: "PAYMENT_SUCCESS_RECEIPT",
    description: "Hi {{User Name}}, we have received your payment of {{Amount}} on {{Date}}. Transaction ID: {{Transaction ID}}.",
    subject: "Payment Success Receipt",
    keywordList: ["User Name", "Amount", "Transaction ID", "Date"],
    status: "active"
  },
  {
    title: "Payment Failure Alert",
    keyword: "PAYMENT_FAILURE_ALERT",
    description: "Hi {{User Name}}, your payment of {{Amount}} on {{Date}} failed. Transaction ID: {{Transaction ID}}. Retry here: {{Retry Link}}.",
    subject: "Payment Failure Alert",
    keywordList: ["User Name", "Amount", "Transaction ID", "Date", "Retry Link"],
    status: "active"
  },
  {
    title: "Invoice Email",
    keyword: "INVOICE_EMAIL",
    description: "Hi {{User Name}}, here is your invoice #{{Invoice Number}} for {{Amount}} dated {{Date}}. Link: {{Invoice Link}}.",
    subject: "Your Invoice",
    keywordList: ["User Name", "Invoice Number", "Amount", "Date", "Invoice Link"],
    status: "active"
  },
  {
    title: "Subscription Expired Email",
    keyword: "SUBSCRIPTION_EXPIRED",
    description: "Hi {{User Name}}, your subscription to {{Plan Name}} has expired. Renew here: {{Renewal Link}}.",
    subject: "Subscription Expired",
    keywordList: ["User Name", "Plan Name", "Renewal Link"],
    status: "active"
  },
  {
    title: "Auto Renewal Success",
    keyword: "AUTO_RENEWAL_SUCCESS",
    description: "Hi {{User Name}}, your subscription to {{Plan Name}} was auto-renewed for {{Amount}}. Next renewal date: {{Next Renewal Date}}.",
    subject: "Auto Renewal Successful",
    keywordList: ["User Name", "Plan Name", "Amount", "Next Renewal Date"],
    status: "active"
  },
  {
    title: "Auto Renewal Failure",
    keyword: "AUTO_RENEWAL_FAILURE",
    description: "Hi {{User Name}}, we could not auto-renew your subscription to {{Plan Name}}. Please update your payment method: {{Retry Link}}.",
    subject: "Auto Renewal Failed",
    keywordList: ["User Name", "Plan Name", "Retry Link"],
    status: "active"
  },
  {
    title: "Coupon Offer Email",
    keyword: "COUPON_OFFER",
    description: "Hi {{User Name}}, use code {{Coupon Code}} for {{Discount Details}} off! Expires on {{Expiry Date}}.",
    subject: "Special Coupon Offer for You",
    keywordList: ["User Name", "Coupon Code", "Discount Details", "Expiry Date"],
    status: "active"
  },
  {
    title: "Ticket Created",
    keyword: "TICKET_CREATED",
    description: "Hi {{User Name}}, your support ticket #{{Ticket ID}} regarding '{{Subject}}' has been created.",
    subject: "Support Ticket Created",
    keywordList: ["User Name", "Ticket ID", "Subject"],
    status: "active"
  },
  {
    title: "Ticket Resolved",
    keyword: "TICKET_RESOLVED",
    description: "Hi {{User Name}}, your support ticket #{{Ticket ID}} has been resolved. Notes: {{Resolution Notes}}.",
    subject: "Support Ticket Resolved",
    keywordList: ["User Name", "Ticket ID", "Resolution Notes"],
    status: "active"
  },
  {
    title: "Account Deactivation Email",
    keyword: "ACCOUNT_DEACTIVATION",
    description: "Hi {{User Name}}, your account was deactivated on {{Deactivation Date}}. Reactivate here: {{Reactivation Link}}.",
    subject: "Account Deactivated",
    keywordList: ["User Name", "Deactivation Date", "Reactivation Link"],
    status: "active"
  },
  {
    title: "Account Deletion Confirmation",
    keyword: "ACCOUNT_DELETION",
    description: "Hi {{User Name}}, your account has been permanently deleted as of {{Deletion Date}}.",
    subject: "Account Deletion Confirmation",
    keywordList: ["User Name", "Deletion Date"],
    status: "active"
  },
  {
    title: "Content Submitted Confirmation",
    keyword: "CONTENT_SUBMITTED",
    description: "Hi {{Producer Name}}, your content '{{Content Title}}' was successfully submitted for review on {{Submission Date}}.",
    subject: "Content Submitted for Review",
    keywordList: ["Producer Name", "Content Title", "Submission Date"],
    status: "active"
  },
  {
    title: "New Content Submission (Admin Notification)",
    keyword: "NEW_CONTENT_SUBMISSION_ADMIN",
    description: "Hello {{Admin Name}}, a new content request '{{Content Title}}' ({{Content Type}}) was submitted by producer {{Producer Name}} on {{Submitted Date}}. Please log in to review and approve or reject this submission.",
    subject: "New Content Submitted for Review: {{Content Title}}",
    keywordList: ["Admin Name", "Content Title", "Content Type", "Producer Name", "Submitted Date", "Platform Name"],
    status: "active"
  },
  {
    title: "Content Published Email",
    keyword: "CONTENT_PUBLISHED",
    description: "Hi {{Producer Name}}, your content '{{Content Title}}' has been published on {{Published Date}}. Link: {{Content Link}}.",
    subject: "Your Content is Live",
    keywordList: ["Producer Name", "Content Title", "Published Date", "Content Link"],
    status: "active"
  },
  {
    title: "Earnings Statement Email",
    keyword: "EARNINGS_STATEMENT",
    description: "Hi {{Producer Name}}, your earnings statement for {{Statement Month}} is ready. Total Earnings: {{Total Earnings}}. View statement: {{Statement Link}}.",
    subject: "Monthly Earnings Statement",
    keywordList: ["Producer Name", "Statement Month", "Total Earnings", "Statement Link"],
    status: "active"
  },
  {
    title: "Payout Processed Email",
    keyword: "PAYOUT_PROCESSED",
    description: "Hi {{Producer Name}}, a payout of {{Amount}} was processed on {{Date}} to your bank account ending in {{Bank Account Last 4}}.",
    subject: "Payout Processed",
    keywordList: ["Producer Name", "Amount", "Bank Account Last 4", "Date"],
    status: "active"
  },
  {
    title: "Payout Delayed Email",
    keyword: "PAYOUT_DELAYED",
    description: "Hi {{Producer Name}}, your payout of {{Amount}} has been delayed. Reason: {{Reason}}. Expected date: {{Expected Date}}.",
    subject: "Payout Delayed",
    keywordList: ["Producer Name", "Amount", "Reason", "Expected Date"],
    status: "active"
  },
  {
    title: "Sub-Admin Role Updated",
    keyword: "UPDATE_SUBADMIN_ROLE",
    description: `
      <div style="font-family: 'Inter', Arial, sans-serif; color: #1f2937; max-width: 600px; line-height: 1.6;">
        <h2 style="color: #111827; margin-top: 0;">Your Administrative Access Has Been Updated</h2>
        <p>Hello <strong>{{User Name}}</strong>,</p>
        <p>Your administrative role and permissions on the <strong>{{Platform Name}} Admin Portal</strong> have been updated by a platform administrator.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Assigned Role:</strong> <span style="color: #4f46e5; font-weight: 700;">{{Role Name}}</span></p>
          <p style="margin: 0 0 10px 0;"><strong>Email Address:</strong> {{Email}}</p>
          <p style="margin: 0 0 10px 0;"><strong>Portal Login URL:</strong> <a href="{{Login URL}}" style="color: #6366f1; text-decoration: underline; font-weight: 600;">{{Login URL}}</a></p>
          <p style="margin: 0;"><strong>Active Permissions:</strong> {{Access Modules}}</p>
        </div>

        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
          🔒 <em>If you are currently logged in, please refresh your session or log in again to activate your updated permissions.</em>
        </p>
      </div>
    `,
    subject: "Your {{Platform Name}} Admin Role & Permissions Have Been Updated",
    keywordList: ["User Name", "Platform Name", "Role Name", "Email", "Login URL", "Access Modules"],
    status: "active"
  }
];

const seedEmailTemplates = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in env");
    }

    logger.info("Connecting to Database to seed email templates...");
    await mongoose.connect(mongoUri);

    for (const tpl of templates) {
      const existing = await EmailTemplate.findOne({ keyword: tpl.keyword });
      if (!existing) {
        await EmailTemplate.create(tpl);
        logger.info(`Created new email template: ${tpl.keyword}`);
      } else {
        // Force update fields to sync core templates and dynamic placeholders
        await EmailTemplate.updateOne(
          { keyword: tpl.keyword },
          {
            $set: {
              title: tpl.title,
              subject: tpl.subject,
              description: tpl.description,
              keywordList: tpl.keywordList,
              status: tpl.status,
            },
          },
        );
        logger.info(`Template ${tpl.keyword} updated.`);
      }
    }

    logger.info("Email templates seeded successfully.");
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding email templates:", error);
    process.exit(1);
  }
};

seedEmailTemplates();
