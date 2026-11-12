import i18n from "i18n";
import path from "node:path";

i18n.configure({
  locales: ["en", "ar", "hi"],
  defaultLocale: "en",
  directory: path.join(__dirname, "../../locales"),
  autoReload: true,
  updateFiles: false,
  syncFiles: false,
  cookie: "language",
  queryParameter: "lang",
  header: "accept-language",
  register: globalThis,
});

export { default } from "i18n";
