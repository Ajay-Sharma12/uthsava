/// <reference types="jest" />
import { ProducerProfile } from "../../src/models/producer-profile.model";
import mongoose from "mongoose";

describe("ProducerProfile Model Schema Validation", () => {
  const validUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should validate successfully with all required fields", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Uthsava Productions",
      description: "A leading content production house.",
      verificationDocuments: [],
    });

    const error = profile.validateSync();
    expect(error).toBeUndefined();
    expect(profile.payoutFrequency).toBe("monthly");
    expect(profile.revenueShare).toBe(50);
  });

  it("[Positive] should validate with all optional fields", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Cinematic Arts",
      description: "Premium content producer.",
      gstNumber: "22AAAAA0000A1Z5",
      logo: "https://cdn.example.com/logo.png",
      verificationDocuments: ["doc1.pdf", "doc2.pdf"],
      signedContract: "contract.pdf",
      bankAccountHolderName: "John Doe",
      bankName: "HDFC Bank",
      accountNumber: "1234567890",
      ifscCode: "HDFC0001234",
      payoutFrequency: "weekly",
      revenueShare: 60,
      website: "https://cinematicarts.com",
    });

    const error = profile.validateSync();
    expect(error).toBeUndefined();
    expect(profile.payoutFrequency).toBe("weekly");
    expect(profile.revenueShare).toBe(60);
  });

  it("[Positive] should default payoutFrequency to monthly", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "Test description",
      verificationDocuments: [],
    });
    expect(profile.payoutFrequency).toBe("monthly");
  });

  it("[Positive] should default revenueShare to 50", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "Test description",
      verificationDocuments: [],
    });
    expect(profile.revenueShare).toBe(50);
  });

  /* =========================================================================
   * NEGATIVE TEST CASES
   * ========================================================================= */
  it("[Negative] should fail validation when userId is missing", () => {
    const profile = new ProducerProfile({
      companyName: "Test Studio",
      description: "Test desc",
    } as any);

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["userId"]).toBeDefined();
  });

  it("[Negative] should fail validation when companyName is missing", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      description: "Test desc",
    } as any);

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["companyName"]).toBeDefined();
  });

  it("[Negative] should fail validation when companyName exceeds 200 chars", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "A".repeat(201),
      description: "Test desc",
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["companyName"]).toBeDefined();
  });

  it("[Negative] should fail validation when revenueShare is below min (0)", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "Test desc",
      revenueShare: -1,
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["revenueShare"]).toBeDefined();
  });

  it("[Negative] should fail validation when revenueShare exceeds max (100)", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "Test desc",
      revenueShare: 101,
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["revenueShare"]).toBeDefined();
  });

  /* =========================================================================
   * VALIDATION & EDGE TEST CASES
   * ========================================================================= */
  it("[Validation] should fail with invalid payoutFrequency enum", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "Test desc",
      payoutFrequency: "daily" as any,
    });

    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["payoutFrequency"]).toBeDefined();
  });

  it("[Edge] should accept revenueShare at boundary values 0 and 100", () => {
    [0, 100].forEach((revenueShare) => {
      const profile = new ProducerProfile({
        userId: validUserId,
        companyName: "Test Studio",
        description: "Test desc",
        revenueShare,
      });
      const error = profile.validateSync();
      expect(error).toBeUndefined();
    });
  });

  it("[Edge] should accept description up to 500 chars", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "D".repeat(500),
    });
    const error = profile.validateSync();
    expect(error).toBeUndefined();
  });

  it("[Edge] should fail when description exceeds 500 chars", () => {
    const profile = new ProducerProfile({
      userId: validUserId,
      companyName: "Test Studio",
      description: "D".repeat(501),
    });
    const error = profile.validateSync();
    expect(error).toBeDefined();
    expect(error?.errors["description"]).toBeDefined();
  });
});
