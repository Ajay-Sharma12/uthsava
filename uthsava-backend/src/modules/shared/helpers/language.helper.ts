import { Request } from "express";

/**
 * Get language from request headers or default to 'en'
 */
export const getLanguage = (req: Request): "en" | "ar" | "hi" => {
  const lang = req.headers["accept-language"] || req.query.lang || "en";
  return lang.toString().startsWith("ar") ? "ar" : lang.toString().startsWith("hi") ? "hi" : "en";
};
