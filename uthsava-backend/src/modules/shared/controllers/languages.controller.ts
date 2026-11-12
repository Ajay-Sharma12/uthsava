import { Request, Response } from "express";
import i18n from "../../../core/config/i18n";
import { ResponseHandler } from "../../../common/responses/response.handler";
import { getLanguage } from "../helpers/language.helper";
import { logger } from "../../../core/constants/logger";
import { HTTP_STATUS } from "../../../core/constants/app.constants";

const LANGUAGE_DISPLAY: Record<string, { name: string; nativeName?: string }> =
  {
    en: { name: "English", nativeName: "English" },
    hi: { name: "Hindi", nativeName: "हिन्दी" },
    ar: { name: "Arabic", nativeName: "العربية" },
  };

export const getLanguages = async (req: Request, res: Response) => {
  try {
    const lang = getLanguage(req);

    // Try to read configured locales from i18n, fallback to directory listing
    let locales: string[] = [];
    if (typeof (i18n as any).getLocales === "function") {
      locales = (i18n as any).getLocales();
    }

    if (!Array.isArray(locales) || locales.length === 0) {
      locales = ["en"];
    }

    const languages = locales.map((code) => ({
      code,
      name: LANGUAGE_DISPLAY[code]?.name || code,
      nativeName: LANGUAGE_DISPLAY[code]?.nativeName || undefined,
    }));

    return ResponseHandler.success(res, { languages }, "general.success", lang);
  } catch (error: any) {
    logger.error("Get languages error:", error);
    const lang = getLanguage(req);
    return ResponseHandler.error(
      res,
      "general.error",
      lang,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }
};
