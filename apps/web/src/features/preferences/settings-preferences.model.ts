import { useTranslation } from "react-i18next";
import { languageOptions, useLanguagePreference } from "./language-selector.model";
import { themeOptions, useThemePreference } from "./theme-selector.model";

export function useSettingsPreferences() {
  const { t, i18n } = useTranslation();
  const { theme, changeTheme } = useThemePreference();
  const { currentOption, selectLanguage } = useLanguagePreference();

  function handleThemeChange(value: string) {
    const option = themeOptions.find((candidate) => candidate.value === value);
    if (option) {
      changeTheme(option.value);
    }
  }

  function handleLanguageChange(value: string) {
    const option = languageOptions.find((candidate) => candidate.value === value);
    if (option) {
      void selectLanguage(option.value);
    }
  }

  const dir = i18n.dir();
  return {
    dir,
    theme: {
      title: t("settings.theme.title"),
      description: t("settings.theme.description"),
      value: theme,
      options: themeOptions.map((option) => ({ ...option, label: t(`settings.theme.${option.value}`) })),
      onValueChange: handleThemeChange,
    },
    language: {
      title: t("common.language.label"),
      description: t("settings.language.description"),
      value: currentOption.value,
      options: languageOptions.map((option) => ({ ...option, label: t(`common.language.${option.value}`) })),
      onValueChange: handleLanguageChange,
    },
  };
}
