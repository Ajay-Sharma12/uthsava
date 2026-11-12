import ejs from "ejs";
import path from "node:path";
import nodemailer from "nodemailer";
import { config } from "../../../core/config";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("[MAIL SERVICE] ❌ SMTP Connection Failed!");
    console.error("[MAIL SERVICE] Error:", error.message);
    // console.error("[MAIL SERVICE] Code:", error.code);
  } else {
    console.log("[MAIL SERVICE] ✅ SMTP Connection Successful!");
  }
});

/**
 * Send email with database content wrapped in common layout
 */
export const sendMail = async (to: string, subject: string, html: string) => {

  try {
    const layoutPath = path.join(
      __dirname,
      "../../../templates/emails",
      "email-layout.ejs",
    );

    // Render the full email with layout
    const fullHtml = await ejs.renderFile(layoutPath, {
      subject,
      content: html,
    });
    const mailOptions = {
      from: config.smtp.email,
      to,
      subject,
      html: fullHtml,
    };
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error: any) {
    console.error("\n❌ [MAIL SERVICE] EMAIL SEND FAILED!");
    console.error("[MAIL SERVICE] Error Message:", error.message);
    console.error("[MAIL SERVICE] Error Code:", error.code);
    console.error("[MAIL SERVICE] Error Response:", error.response);
    console.error("[MAIL SERVICE] Full Error:", error);
    console.error("=".repeat(80) + "\n");

    // Silently fail - don't break the app
    return { messageId: `<failed-${Date.now()}@app>` };
  }
};
