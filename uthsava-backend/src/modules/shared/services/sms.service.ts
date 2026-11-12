import { logger } from "../../../core/constants/logger";

/**
 * SMS Service
 *
 * Provides a provider-agnostic interface for sending SMS messages.
 * Currently implemented as a stub that logs the message — wire up a real
 * provider (Twilio, AWS SNS, MSG91, etc.) by replacing the body of `sendSms`.
 *
 * To integrate Twilio, for example:
 *   1. npm install twilio
 *   2. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to .env
 *   3. Replace the stub body below with the Twilio client call.
 */

export interface SmsResult {
  success: boolean;
  to: string;
  messageId?: string;
  error?: string;
}

/**
 * Send a single SMS message.
 *
 * @param to      - Recipient phone number in E.164 format, e.g. "+919876543210"
 * @param message - Plain-text message body (max ~160 chars for single segment)
 */
export const sendSms = async (
  to: string,
  message: string,
): Promise<SmsResult> => {
  try {
    if (!to || !message) {
      return {
        success: false,
        to,
        error: "Recipient number and message are required",
      };
    }

    // ─── Stub implementation ──────────────────────────────────────────────────
    // Replace this block with your SMS provider SDK call.
    // Example (Twilio):
    //   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    //   const msg = await client.messages.create({
    //     body: message,
    //     from: process.env.TWILIO_FROM_NUMBER,
    //     to,
    //   });
    //   return { success: true, to, messageId: msg.sid };
    // ─────────────────────────────────────────────────────────────────────────

    logger.info(`[SMS] Sending to ${to}: ${message}`);

    // Simulate success for now
    return { success: true, to, messageId: `stub-${Date.now()}` };
  } catch (error: any) {
    logger.error(`[SMS] Failed to send to ${to}:`, error);
    return { success: false, to, error: error?.message || "Unknown error" };
  }
};

/**
 * Send the same SMS to multiple recipients.
 *
 * @param recipients - Array of phone numbers in E.164 format
 * @param message    - Plain-text message body
 */
export const sendBulkSms = async (
  recipients: string[],
  message: string,
): Promise<{ total: number; succeeded: number; failed: number }> => {
  if (!recipients.length) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    recipients.map((to) => sendSms(to, message)),
  );

  const succeeded = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;

  return {
    total: recipients.length,
    succeeded,
    failed: recipients.length - succeeded,
  };
};
