import mongoose from "mongoose";
import { config } from "../src/core/config";
import { EmailTemplate } from "../src/models/email-template.model";

const seedEmailTemplates = async () => {
  try {
    // Connect to MongoDB
    // @ts-ignore
    await mongoose.connect(config.mongoUri);

    const templates = [
      {
        title: "Welcome Email",
        subject: "Welcome to Uthsava",
        description:
          "<p>Dear {{name}},</p><p>Welcome to Uthsava! We are excited to have you on board.</p>",
        keyword: "WELCOME_EMAIL",
        status: "active",
        signature: "The Uthsava Team",
        keywordList: ["{{name}}", "{{email}}", "{{site_name}}"],
      },
      {
        title: "Forgot Password",
        subject: "Reset Your Password - Uthsava",
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
        keyword: "FORGOT_PASSWORD",
        status: "active",
        signature: `
                    <p style="color: #555555; font-size: 14px; margin: 0 0 5px 0; font-family: Arial, sans-serif;">
                        Best regards,
                    </p>
                    <p style="color: #333333; font-size: 14px; margin: 0; font-family: Arial, sans-serif; font-weight: bold;">
                        The Uthsava Team
                    </p>
                    <p style="color: #1a1a1a; font-size: 14px; margin: 5px 0 0 0; font-family: Arial, sans-serif;">
                        Uthsava 
                    </p>
                `,
        keywordList: [
          "{{userName}}",
          "{{userEmail}}",
          "{{resetLink}}",
          "{{expiryTime}}",
        ],
      },
      {
        title: "Password Reset OTP",
        subject: "Your Password Reset OTP - Uthsava",
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
        keyword: "PASSWORD_RESET_OTP",
        status: "active",
        signature: `
                    <p style="color: #555555; font-size: 14px; margin: 0 0 5px 0; font-family: Arial, sans-serif;">
                        Best regards,
                    </p>
                    <p style="color: #333333; font-size: 14px; margin: 0; font-family: Arial, sans-serif; font-weight: bold;">
                        The Uthsava Team
                    </p>
                    <p style="color: #667eea; font-size: 14px; margin: 5px 0 0 0; font-family: Arial, sans-serif;">
                        Uthsava
                    </p>
                `,
        keywordList: [
          "{{userName}}",
          "{{userEmail}}",
          "{{otp}}",
          "{{expiryTime}}",
        ],
      },
      {
        title: "New Subadmin Account",
        subject: "Your Subadmin Account Created",
        description:
          '<p>Dear {{name}},</p><p>A new subadmin account has been created for you. Your login credentials are below:</p><ul><li>Email: {{email}}</li><li>Password: {{password}}</li></ul><p><strong>Login URL:</strong> <a href="{{login_url}}">{{login_url}}</a></p><p><strong>Assigned admin access:</strong> {{access_modules}}</p><p>Please change your password after logging in.</p>',
        keyword: "NEW_ACCOUNT_SUBADMIN",
        status: "active",
        signature: "The Uthsava Team",
        keywordList: [
          "{{name}}",
          "{{email}}",
          "{{password}}",
          "{{login_url}}",
          "{{access_modules}}",
          "{{site_name}}",
        ],
      },
    ];

    for (const template of templates) {
      const existing = await EmailTemplate.findOne({
        keyword: template.keyword,
      });
      if (existing) {
        // Update missing fields for existing templates
        existing.description = template.description;
        existing.keywordList = template.keywordList;
        await existing.save();
      } else {
        await EmailTemplate.create(template);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding email templates:", error);
    process.exit(1);
  }
};

seedEmailTemplates();
