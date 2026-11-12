/// <reference types="jest" />
import { CmsPage, PageStatus, PublicationStatus } from "../../src/models/cms-page.model";

describe("CmsPage Model Schema Validation", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const page = new CmsPage({
      title: "About Us",
      slug: "about-us",
      content: "This is the about us page content.",
    });

    const error = page.validateSync();
    expect(error).toBeUndefined();
    expect(page.status).toBe(PageStatus.ACTIVE);
    expect(page.publicationStatus).toBe(PublicationStatus.DRAFT);
  });

  it("[Positive] should validate with all optional fields provided", () => {
    const page = new CmsPage({
      title: "Privacy Policy",
      slug: "privacy-policy",
      content: "Full privacy policy content here.",
      metaTitle: "Privacy Policy | Uthsava",
      metaDescription: "Read our privacy policy.",
      bannerImage: "https://cdn.example.com/banner.jpg",
      companyWebsiteUrl: "https://uthsava.com",
      seoTitle: "Privacy Policy SEO Title",
      seoDescription: "SEO description for privacy page.",
      publicationStatus: PublicationStatus.PUBLISHED,
      status: PageStatus.ACTIVE,
    });

    const error = page.validateSync();
    expect(error).toBeUndefined();
    expect(page.publicationStatus).toBe(PublicationStatus.PUBLISHED);
  });

  it("[Positive] should default publicationStatus to DRAFT", () => {
    const page = new CmsPage({
      title: "Terms",
      slug: "terms",
      content: "Terms content",
    });
    expect(page.publicationStatus).toBe(PublicationStatus.DRAFT);
  });

  it("[Positive] should default status to ACTIVE", () => {
    const page = new CmsPage({
      title: "FAQ",
      slug: "faq",
      content: "FAQ content",
    });
    expect(page.status).toBe(PageStatus.ACTIVE);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when title is missing", () => {
    const page = new CmsPage({
      slug: "about-us",
      content: "Some content",
    } as any);

    const error = page.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["title"]).toBeDefined();
  });

  it("[Negative] should fail validation when slug is missing", () => {
    const page = new CmsPage({
      title: "About Us",
      content: "Some content",
    } as any);

    const error = page.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["slug"]).toBeDefined();
  });

  it("[Negative] should fail validation when content is missing", () => {
    const page = new CmsPage({
      title: "About Us",
      slug: "about-us",
    } as any);

    const error = page.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["content"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail validation with invalid publicationStatus enum value", () => {
    const page = new CmsPage({
      title: "About Us",
      slug: "about-us",
      content: "Content here",
      publicationStatus: "scheduled" as any,
    });

    const error = page.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["publicationStatus"]).toBeDefined();
  });

  it("[Validation] should fail validation with invalid status enum value", () => {
    const page = new CmsPage({
      title: "About Us",
      slug: "about-us",
      content: "Content here",
      status: "archived" as any,
    });

    const error = page.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["status"]).toBeDefined();
  });

  it("[Edge] should accept DELETED status value", () => {
    const page = new CmsPage({
      title: "About Us",
      slug: "about-us",
      content: "Content here",
      status: PageStatus.DELETED,
    });

    const error = page.validateSync();
    expect(error).toBeUndefined();
    expect(page.status).toBe(PageStatus.DELETED);
  });
});
