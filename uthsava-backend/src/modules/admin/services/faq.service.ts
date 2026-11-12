import { Faq, FaqStatus } from "../../../models";
import { logger } from "../../../core/constants/logger";

/**
 * FAQ Service
 * Handles business logic for FAQ management
 */
export class FaqService {
  /**
   * Create a new FAQ
   */
  static async createFaq(
    data: {
      question: string;
      answer: string;
      status?: FaqStatus;
      order?: number;
    },
    userId?: string,
  ) {
    const targetOrder = data.order ?? 0;

    // Check if order already exists
    const existingFaq = await Faq.findOne({ order: targetOrder });

    if (existingFaq) {
      // Shift all FAQs with order >= targetOrder up by 1
      await Faq.updateMany(
        { order: { $gte: targetOrder } },
        { $inc: { order: 1 } },
      );
      logger.info(`Shifted FAQs with order >= ${targetOrder} up by 1`);
    }

    const newFaq = new Faq({
      question: data.question,
      answer: data.answer,
      status: data.status || FaqStatus.ACTIVE,
      order: targetOrder,
      createdBy: userId,
      updatedBy: userId,
    });

    await newFaq.save();

    logger.info(`FAQ created: ${newFaq._id} with order ${targetOrder}`);

    return newFaq.toJSON();
  }

  /**
   * Get FAQ by ID
   */
  static async getFaqById(id: string) {
    const faq = await Faq.findById(id);

    if (!faq) {
      throw new Error("error.faqNotFound");
    }

    return faq.toJSON();
  }

  /**
   * Update FAQ
   */
  static async updateFaq(
    id: string,
    data: {
      question?: string;
      answer?: string;
      status?: FaqStatus;
      order?: number;
    },
    userId?: string,
  ) {
    const faq = await Faq.findById(id);
    if (!faq) {
      throw new Error("error.faqNotFound");
    }

    const updateData: any = { updatedBy: userId };

    if (data.question !== undefined) {
      updateData.question = data.question;
    }

    if (data.answer !== undefined) {
      updateData.answer = data.answer;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    // Handle order update with duplicate prevention
    if (data.order !== undefined && data.order !== faq.order) {
      const targetOrder = data.order;

      // Check if target order already exists (excluding current FAQ)
      const existingFaq = await Faq.findOne({
        order: targetOrder,
        _id: { $ne: id },
      });

      if (existingFaq) {
        // Shift FAQs with order >= targetOrder up by 1
        await Faq.updateMany(
          {
            order: { $gte: targetOrder },
            _id: { $ne: id },
          },
          { $inc: { order: 1 } },
        );
        logger.info(`Shifted FAQs with order >= ${targetOrder} up by 1`);
      }

      updateData.order = targetOrder;
    }

    const updatedFaq = await Faq.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!updatedFaq) {
      throw new Error("error.faqNotFound");
    }

    logger.info(`FAQ updated: ${updatedFaq._id}`);

    return updatedFaq.toJSON();
  }

  /**
   * Update FAQ status
   */
  static async updateFaqStatus(id: string, status: FaqStatus, userId?: string) {
    if (!Object.values(FaqStatus).includes(status)) {
      throw new Error("error.invalidStatusValue");
    }

    const faq = await Faq.findByIdAndUpdate(
      id,
      { status, updatedBy: userId },
      { new: true },
    );

    if (!faq) {
      throw new Error("error.faqNotFound");
    }

    logger.info(`FAQ status updated: ${faq._id} -> ${status}`);

    return faq.toJSON();
  }

  /**
   * Delete FAQ (soft delete - set status to deleted)
   */
  static async deleteFaq(id: string, userId?: string) {
    return this.updateFaqStatus(id, FaqStatus.DELETED, userId);
  }
}

export default FaqService;
