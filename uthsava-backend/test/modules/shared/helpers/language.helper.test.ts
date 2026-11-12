import { Request } from "express";
import { getLanguage } from "../../../../src/modules/shared/helpers/language.helper";

describe("Language Helper Unit Tests", () => {
  /* =========================================================================
   * POSITIVE TEST CASES
   * ========================================================================= */
  it("[Positive] should return default 'en' when headers and query parameters are missing", () => {
    const req = {
      headers: {},
      query: {},
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("en");
  });

  it("[Positive] should return 'ar' when accept-language header starts with 'ar'", () => {
    const req = {
      headers: { "accept-language": "ar-AE,ar;q=0.9" },
      query: {},
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("ar");
  });

  it("[Positive] should return 'hi' when accept-language header starts with 'hi'", () => {
    const req = {
      headers: { "accept-language": "hi-IN" },
      query: {},
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("hi");
  });

  it("[Positive] should return 'ar' when query param lang starts with 'ar' and header is missing", () => {
    const req = {
      headers: {},
      query: { lang: "ar" },
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("ar");
  });

  it("[Positive] should return 'hi' when query param lang starts with 'hi' and header is missing", () => {
    const req = {
      headers: {},
      query: { lang: "hi" },
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("hi");
  });

  /* =========================================================================
   * NEGATIVE / VALIDATION TEST CASES
   * ========================================================================= */
  it("[Negative] should return 'en' if lang header or query param is set to an unsupported language like 'fr'", () => {
    const req = {
      headers: { "accept-language": "fr" },
      query: {},
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("en");
  });

  /* =========================================================================
   * EDGE TEST CASES
   * ========================================================================= */
  it("[Edge] should prioritize accept-language header over query param lang", () => {
    const req = {
      headers: { "accept-language": "hi" },
      query: { lang: "ar" },
    } as unknown as Request;

    const result = getLanguage(req);
    expect(result).toBe("hi");
  });
});
