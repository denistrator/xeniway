import { changeLocale, initializeI18n } from "../i18n/i18n";

/** Reset the shared i18n instance without changing global test startup behavior. */
export async function initializeTestI18n() {
  await initializeI18n();
  await changeLocale("en");
}
