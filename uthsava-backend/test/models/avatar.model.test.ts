/// <reference types="jest" />
import { Avatar, AvatarStatus } from "../../src/models/avatar.model";
import { Types } from "mongoose";

describe("Avatar Model Unit Tests", () => {
  it("[Positive] should instantiate avatar document with valid schema values", () => {
    const userId = new Types.ObjectId();
    const avatar = new Avatar({
      category: "Animals",
      images: ["image1.png", "image2.png"],
      isKids: true,
      status: AvatarStatus.ACTIVE,
      createdBy: userId,
    });

    expect(avatar.category).toBe("Animals");
    expect(avatar.images.length).toBe(2);
    expect(avatar.isKids).toBe(true);
    expect(avatar.status).toBe("active");
    expect(avatar.createdBy).toEqual(userId);
  });

  it("[Validation/Negative] should throw validation error when required fields are missing", () => {
    const avatar = new Avatar({});
    const err = avatar.validateSync();

    expect(err).toBeDefined();
    expect(err?.errors.category).toBeDefined();
  });
});
