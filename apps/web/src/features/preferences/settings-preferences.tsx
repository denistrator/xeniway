import { PreferenceSection } from "./preference-section.tsx";
import { useSettingsPreferences } from "./settings-preferences.ts";

export function SettingsPreferences() {
  const view = useSettingsPreferences();
  return (
    <>
      <PreferenceSection {...view.theme} name="theme" dir={view.dir} />
      <PreferenceSection {...view.language} name="language" dir={view.dir} />
    </>
  );
}
