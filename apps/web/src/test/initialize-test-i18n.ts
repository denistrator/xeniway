import { changeLocale, i18n, initializeI18n } from "../i18n/i18n";
import he from "../i18n/locales/he";
import ru from "../i18n/locales/ru";
import uk from "../i18n/locales/uk";

/** Reset the shared i18n instance without changing global test startup behavior. */
export async function initializeTestI18n() {
  await initializeI18n();
  // UI behavior tests use canonical fixtures explicitly; loader tests leave resources unloaded.
  i18n.addResourceBundle("he", "translation", he, true, true);
  i18n.addResourceBundle("ru", "translation", ru, true, true);
  i18n.addResourceBundle("uk", "translation", uk, true, true);
  await changeLocale("en");
}
