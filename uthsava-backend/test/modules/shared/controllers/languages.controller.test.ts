/// <reference types="jest" />
import { Request, Response } from "express";
import { getLanguages } from "../../../../src/modules/shared/controllers/languages.controller";
import i18n from "../../../../src/core/config/i18n";
import { ResponseHandler } from "../../../../src/common/responses/response.handler";

jest.mock("../../../../src/core/config/i18n", () => ({
  getLocales: jest.fn(),
}));
jest.mock("../../../../src/common/responses/response.handler");
jest.mock("../../../../src/modules/shared/helpers/language.helper", () => ({
  getLanguage: jest.fn().mockReturnValue("en"),
}));
jest.mock("../../../../src/core/constants/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = () => {
  return {} as Request;
};

describe("Languages Controller Unit Tests", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
  });

  it("[Positive] should successfully return formatted languages list configured in i18n", async () => {
    (i18n.getLocales as jest.Mock).mockReturnValue(["en", "hi", "ar"]);

    await getLanguages(req, res);

    expect(i18n.getLocales).toHaveBeenCalled();
    expect(ResponseHandler.success).toHaveBeenCalledWith(
      res,
      {
        languages: [
          { code: "en", name: "English", nativeName: "English" },
          { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
          { code: "ar", name: "Arabic", nativeName: "العربية" },
        ],
      },
      "general.success",
      "en"
    );
  });

  it("[Positive] should fallback to default ['en'] if getLocales is empty or not an array", async () => {
    (i18n.getLocales as jest.Mock).mockReturnValue(null);

    await getLanguages(req, res);

    expect(ResponseHandler.success).toHaveBeenCalledWith(
      res,
      {
        languages: [
          { code: "en", name: "English", nativeName: "English" },
        ],
      },
      "general.success",
      "en"
    );
  });

  it("[Edge] should catch internal errors and return 500 error response", async () => {
    const error = new Error("i18n crash");
    (i18n.getLocales as jest.Mock).mockImplementation(() => {
      throw error;
    });

    await getLanguages(req, res);

    expect(ResponseHandler.error).toHaveBeenCalledWith(
      res,
      "general.error",
      "en",
      500,
      error
    );
  });
});
