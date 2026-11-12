import { EmailTemplate } from "../../../models/email-template.model";
import { QueueService } from "./queue.service";
import { logger } from "../../../core/constants/logger";

export class NotificationDispatcher {
  /**
   * Dispatches an email using a database template via BullMQ
   * @param userEmail - The recipient's email address
   * @param userId - The recipient's user ID
   * @param templateKeyword - The keyword corresponding to the EmailTemplate
   * @param placeholders - Object containing placeholder replacements
   */
  static async dispatchEmail(
    userEmail: string,
    userId: string,
    templateKeyword: string,
    placeholders: Record<string, string>
  ): Promise<void> {
    try {
      if (!userEmail) {
        logger.warn(`No email provided for dispatchEmail for keyword: ${templateKeyword}`);
        return;
      }

      const template = await EmailTemplate.findOne({ keyword: templateKeyword });
      if (!template) {
        logger.warn(`Email template with keyword ${templateKeyword} not found. Ensure it exists in the database.`);
        return;
      }

      let subject = template.subject || "Uthsava Notification";
      let body = template.description || "";

      // Replace all placeholders in both subject and body
      for (const [key, value] of Object.entries(placeholders)) {
        body = body.replaceAll(`{{${key}}}`, value || "");
        subject = subject.replaceAll(`{{${key}}}`, value || "");
      }

      subject = subject
        .replaceAll("{{Platform Name}}", "Uthsava")
        .replaceAll("{{platformName}}", "Uthsava")
        .replaceAll("{{Platform_Name}}", "Uthsava")
        .replaceAll("{{site_name}}", "Uthsava");

      body = body
        .replaceAll("{{Platform Name}}", "Uthsava")
        .replaceAll("{{platformName}}", "Uthsava")
        .replaceAll("{{Platform_Name}}", "Uthsava")
        .replaceAll("{{site_name}}", "Uthsava");

      // Enqueue job to BullMQ
      const jobId = `email-${templateKeyword}-${userId}-${Date.now()}`;
      await QueueService.addEmailJob(jobId, {
        to: userEmail,
        subject,
        html: body,
      });

      logger.info(`Enqueued email job: ${jobId} for ${userEmail}`);
    } catch (error) {
      logger.error(`Error dispatching email for ${templateKeyword}:`, error);
    }
  }
}
