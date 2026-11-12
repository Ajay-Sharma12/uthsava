import { buildUserResponse } from "../../../../src/modules/shared/helpers/buildUserResponse";

describe("buildUserResponse Helper Unit Tests", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should successfully map user and tokens to response structure", () => {
    const user = {
      email: "jane@test.com",
      firstName: "Jane",
      lastName: "Smith",
      fullName: "Jane Smith",
      mobile: "9876543210",
      countryCode: 91,
      profileImage: "https://s3.com/jane.jpg",
      role: "PRODUCER",
      status: "ACTIVE",
      userId: "UID-500",
      _id: "60c72b2f9b1d8a25c88c9f12",
      age: 28,
      gender: "Female",
      deviceId: "device-123",
      deviceType: "Mobile",
      deviceToken: "token-abc",
      notificationEnabled: true,
    };

    const tokens = { accessToken: "access-token" };

    const response = buildUserResponse(user, tokens, 0);

    expect(response).toEqual({
      isNewUser: 0,
      expiresIn: "60d",
      token: "access-token",
      email: "jane@test.com",
      firstName: "Jane",
      lastName: "Smith",
      fullName: "Jane Smith",
      mobile: "9876543210",
      countryCode: 91,
      profileImage: "https://s3.com/jane.jpg",
      role: "PRODUCER",
      status: "ACTIVE",
      userId: "UID-500",
      _id: "60c72b2f9b1d8a25c88c9f12",
      age: 28,
      gender: "Female",
      deviceId: "device-123",
      deviceType: "Mobile",
      deviceToken: "token-abc",
      notificationEnabled: true,
    });
  });

  /* =========================================================================
   * EDGE / VALIDATION TEST CASES
   * ========================================================================= */
  it("[Edge] should apply default fallback values for missing optional properties", () => {
    const user = {
      email: "simple@test.com",
      role: "USER",
      status: "ACTIVE",
      userId: "UID-600",
      _id: "60c72b2f9b1d8a25c88c9f13",
      notificationEnabled: false,
    };

    const tokens = { accessToken: "token" };

    const response = buildUserResponse(user, tokens);

    expect(response).toEqual({
      isNewUser: 0,
      expiresIn: "60d",
      token: "token",
      email: "simple@test.com",
      firstName: "",
      lastName: "",
      fullName: "",
      mobile: "",
      countryCode: 0,
      profileImage: "",
      role: "USER",
      status: "ACTIVE",
      userId: "UID-600",
      _id: "60c72b2f9b1d8a25c88c9f13",
      age: null,
      gender: null,
      deviceId: null,
      deviceType: null,
      deviceToken: null,
      notificationEnabled: false,
    });
  });
});
