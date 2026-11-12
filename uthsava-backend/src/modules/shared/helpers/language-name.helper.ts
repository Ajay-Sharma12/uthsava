const LANGUAGE_CODE_TO_FULL_NAME: Record<string, string> = {
  EN: "English",
  ENGLISH: "English",
  HI: "Hindi",
  HINDI: "Hindi",
  AR: "Arabic",
  ARABIC: "Arabic",
  TA: "Tamil",
  TAMIL: "Tamil",
  TE: "Telugu",
  TELUGU: "Telugu",
  KN: "Kannada",
  KANNADA: "Kannada",
  ML: "Malayalam",
  MALAYALAM: "Malayalam",
  MR: "Marathi",
  MARATHI: "Marathi",
  GU: "Gujarati",
  GUJARATI: "Gujarati",
  PA: "Punjabi",
  PUNJABI: "Punjabi",
  BN: "Bengali",
  BENGALI: "Bengali",
  ES: "Spanish",
  SPANISH: "Spanish",
  FR: "French",
  FRENCH: "French",
  DE: "German",
  GERMAN: "German",
  IT: "Italian",
  ITALIAN: "Italian",
  JA: "Japanese",
  JAPANESE: "Japanese",
  KO: "Korean",
  KOREAN: "Korean",
  ZH: "Chinese",
  CHINESE: "Chinese",
  RU: "Russian",
  RUSSIAN: "Russian",
  PT: "Portuguese",
  PORTUGUESE: "Portuguese",
};

const FULL_NAME_TO_2LETTER_CODE: Record<string, string> = {
  ENGLISH: "EN",
  EN: "EN",
  HINDI: "HI",
  HI: "HI",
  ARABIC: "AR",
  AR: "AR",
  TAMIL: "TA",
  TA: "TA",
  TELUGU: "TE",
  TE: "TE",
  KANNADA: "KN",
  KN: "KN",
  MALAYALAM: "ML",
  ML: "ML",
  MARATHI: "MR",
  MR: "MR",
  GUJARATI: "GU",
  GU: "GU",
  PUNJABI: "PA",
  PA: "PA",
  BENGALI: "BN",
  BN: "BN",
  SPANISH: "ES",
  ES: "ES",
  FRENCH: "FR",
  FR: "FR",
  GERMAN: "DE",
  DE: "DE",
  ITALIAN: "IT",
  IT: "IT",
  JAPANESE: "JA",
  JA: "JA",
  KOREAN: "KO",
  KO: "KO",
  CHINESE: "ZH",
  ZH: "ZH",
  RUSSIAN: "RU",
  RU: "RU",
  PORTUGUESE: "PT",
  PT: "PT",
};

/**
 * Returns the full human-readable language name for a given name/code pair.
 * Examples: ("En", "EN") -> "English", ("Ar", "AR") -> "Arabic", ("Hi", "HI") -> "Hindi"
 */
export const getFullLanguageName = (name?: string, code?: string): string => {
  const codeKey = code ? String(code).trim().toUpperCase() : "";
  if (codeKey && LANGUAGE_CODE_TO_FULL_NAME[codeKey]) {
    return LANGUAGE_CODE_TO_FULL_NAME[codeKey];
  }

  const nameKey = name ? String(name).trim().toUpperCase() : "";
  if (nameKey && LANGUAGE_CODE_TO_FULL_NAME[nameKey]) {
    return LANGUAGE_CODE_TO_FULL_NAME[nameKey];
  }

  if (name && name.trim().length > 2) {
    return name.trim();
  }

  return name ? name.trim() : code ? String(code).trim().toUpperCase() : "English";
};

/**
 * Returns the standard 2-letter uppercase ISO language code for a given code/name pair.
 * Examples: ("ENGLISH", "English") -> "EN", ("ARABIC", "Arabic") -> "AR", ("HI", "Hindi") -> "HI"
 */
export const get2LetterLanguageCode = (code?: string, name?: string): string => {
  const codeKey = code ? String(code).trim().toUpperCase() : "";
  if (codeKey && FULL_NAME_TO_2LETTER_CODE[codeKey]) {
    return FULL_NAME_TO_2LETTER_CODE[codeKey];
  }

  const nameKey = name ? String(name).trim().toUpperCase() : "";
  if (nameKey && FULL_NAME_TO_2LETTER_CODE[nameKey]) {
    return FULL_NAME_TO_2LETTER_CODE[nameKey];
  }

  if (codeKey && codeKey.length === 2) {
    return codeKey;
  }

  if (nameKey && nameKey.length >= 2) {
    return nameKey.slice(0, 2);
  }

  return "EN";
};
