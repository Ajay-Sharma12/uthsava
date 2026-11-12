import mongoose from "mongoose";
import { config } from "../src/core/config";
import { CmsPage, PageStatus } from "../src/models/cms-page.model";

const staticPages = [
  {
    title: "About Us",
    slug: "about-us",
    content:
      "<h1>About Us</h1><p>Welcome to our platform. This page is managed via the admin CMS.</p>",
    metaTitle: "About Us",
    metaDescription: "Learn more about us.",
    status: PageStatus.ACTIVE,
  },
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    content:
      "<h1>Privacy Policy</h1><p>Your privacy is important to us. This page is managed via the admin CMS.</p>",
    metaTitle: "Privacy Policy",
    metaDescription: "Read our privacy policy.",
    status: PageStatus.ACTIVE,
  },
  {
    title: "Terms and Conditions",
    slug: "terms-and-conditions",
    content:
      "<h1>Terms and Conditions</h1><p>Please read these terms carefully. This page is managed via the admin CMS.</p>",
    metaTitle: "Terms and Conditions",
    metaDescription: "Read our terms and conditions.",
    status: PageStatus.ACTIVE,
  },
];

const seedStaticPages = async () => {
  try {
    // @ts-ignore
    await mongoose.connect(config.mongoUri);

    for (const page of staticPages) {
      const existing = await CmsPage.findOne({ slug: page.slug });
      if (existing) {
        console.log(`Page already exists, skipping: ${page.slug}`);
      } else {
        await CmsPage.create(page);
      }
    }

    p;
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding static pages:", error);
    process.exit(1);
  }
};

seedStaticPages();
