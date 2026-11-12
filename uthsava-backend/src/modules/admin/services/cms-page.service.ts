import { CmsPage, PageStatus, PublicationStatus } from "../../../models";
import { logger } from "../../../core/constants/logger";

/**
 * CMS Page Service
 * Handles business logic for CMS page management
 */
export class CmsPageService {
  /**
   * Generate slug from title
   */
  static generateSlug(title: string): string {
    let slug = title
      .toLowerCase()
      .trim()
      .replaceAll(/[^\w\s-]/g, "") // Remove special characters
      .replaceAll(/\s+/g, "-") // Replace spaces with hyphens
      .replaceAll(/-+/g, "-"); // Replace multiple hyphens

    // Remove leading hyphens
    while (slug.startsWith("-")) {
      slug = slug.slice(1);
    }

    // Remove trailing hyphens
    while (slug.endsWith("-")) {
      slug = slug.slice(0, -1);
    }

    return slug;
  }
  /**
   * Ensure slug is unique
   */
  static async ensureUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;
    let existing = true;

    while (existing) {
      const query: any = { slug: uniqueSlug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      existing = !!(await CmsPage.findOne(query));
      if (existing) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
    }

    return uniqueSlug;
  }

  /**
   * Create a new CMS page
   */
  static async createPage(
    data: {
      title: string;
      slug?: string;
      content: string;
      metaTitle?: string;
      metaDescription?: string;
      bannerImage?: string;
      companyWebsiteUrl?: string;
      seoTitle?: string;
      seoDescription?: string;
      publicationStatus?: PublicationStatus;
      status?: PageStatus;
    },
    userId?: string,
  ) {
    // Generate slug from title if not provided
    let slug = data.slug || this.generateSlug(data.title);

    // Ensure slug is unique
    slug = await this.ensureUniqueSlug(slug);

    const newPage = new CmsPage({
      title: data.title,
      slug: slug,
      content: data.content,
      metaTitle: data.metaTitle || data.title,
      metaDescription: data.metaDescription || "",
      bannerImage: data.bannerImage || "",
      companyWebsiteUrl: data.companyWebsiteUrl || "",
      seoTitle: data.seoTitle || data.metaTitle || data.title,
      seoDescription: data.seoDescription || data.metaDescription || "",
      publicationStatus: data.publicationStatus || PublicationStatus.DRAFT,
      status: data.status || PageStatus.ACTIVE,
      createdBy: userId,
      updatedBy: userId,
    });

    await newPage.save();

    logger.info(`CMS page created: ${newPage.slug}`);

    return newPage.toJSON();
  }

  /**
   * Get page by ID with populated createdBy and updatedBy user details
   */
  static async getPageById(id: string) {
    const page = await CmsPage.findById(id)
      .populate("createdBy", "fullName firstName lastName")
      .populate("updatedBy", "fullName firstName lastName");

    if (!page) {
      throw new Error("error.pageNotFound");
    }

    return page.toJSON();
  }

  /**
   * Get page by slug
   */
  static async getPageBySlug(slug: string) {
    const page = await CmsPage.findOne({ slug, status: PageStatus.ACTIVE });

    if (!page) {
      throw new Error("error.pageNotFound");
    }

    return page.toJSON();
  }

  /**
   * Update CMS page
   */
  static async updatePage(
    id: string,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      metaTitle?: string;
      metaDescription?: string;
      bannerImage?: string;
      companyWebsiteUrl?: string;
      seoTitle?: string;
      seoDescription?: string;
      publicationStatus?: PublicationStatus;
      status?: PageStatus;
    },
    userId?: string,
  ) {
    const page = await CmsPage.findById(id);
    if (!page) {
      throw new Error("error.pageNotFound");
    }

    const updateData: any = { updatedBy: userId };

    if (data.title !== undefined) {
      updateData.title = data.title;
      // If title changed and no custom slug provided, regenerate slug
      if (!data.slug && data.title !== page.title) {
        const newSlug = this.generateSlug(data.title);
        updateData.slug = await this.ensureUniqueSlug(newSlug, id);
      }
    }

    if (data.slug !== undefined) {
      // Ensure new slug is unique
      updateData.slug = await this.ensureUniqueSlug(data.slug, id);
    }

    if (data.content !== undefined) {
      updateData.content = data.content;
    }

    if (data.metaTitle !== undefined) {
      updateData.metaTitle = data.metaTitle;
    }

    if (data.metaDescription !== undefined) {
      updateData.metaDescription = data.metaDescription;
    }

    if (data.bannerImage !== undefined) {
      updateData.bannerImage = data.bannerImage;
    }

    if (data.companyWebsiteUrl !== undefined) {
      updateData.companyWebsiteUrl = data.companyWebsiteUrl;
    }

    if (data.seoTitle !== undefined) {
      updateData.seoTitle = data.seoTitle;
    }

    if (data.seoDescription !== undefined) {
      updateData.seoDescription = data.seoDescription;
    }

    if (data.publicationStatus !== undefined) {
      updateData.publicationStatus = data.publicationStatus;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const updatedPage = await CmsPage.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!updatedPage) {
      throw new Error("error.pageNotFound");
    }

    logger.info(`CMS page updated: ${updatedPage.slug}`);

    return updatedPage.toJSON();
  }

  /**
   * Update page status
   */
  static async updatePageStatus(
    id: string,
    status: PageStatus,
    userId?: string,
  ) {
    if (!Object.values(PageStatus).includes(status)) {
      throw new Error("error.invalidStatusValue");
    }

    const page = await CmsPage.findByIdAndUpdate(
      id,
      { status, updatedBy: userId },
      { new: true },
    );

    if (!page) {
      throw new Error("error.pageNotFound");
    }

    logger.info(`CMS page status updated: ${page.slug} -> ${status}`);

    return page.toJSON();
  }

  /**
   * Update page publication status
   */
  static async updatePagePublicationStatus(
    id: string,
    publicationStatus: PublicationStatus,
    userId?: string,
  ) {
    if (!Object.values(PublicationStatus).includes(publicationStatus)) {
      throw new Error("error.invalidStatusValue");
    }

    const page = await CmsPage.findByIdAndUpdate(
      id,
      { publicationStatus, updatedBy: userId },
      { new: true },
    );

    if (!page) {
      throw new Error("error.pageNotFound");
    }

    logger.info(`CMS page publication status updated: ${page.slug} -> ${publicationStatus}`);

    return page.toJSON();
  }

  /**
   * Delete page (soft delete - set status to deleted)
   */
  static async deletePage(id: string, userId?: string) {
    return this.updatePageStatus(id, PageStatus.DELETED, userId);
  }
}

export default CmsPageService;
