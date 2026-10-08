import { PreferenceSection } from "./preference-section.view";
import { useSettingsPreferences } from "./settings-preferences.model";

export function SettingsPreferences() {
  const view = useSettingsPreferences();
  return (
    <>
      <PreferenceSection {...view.theme} name="theme" dir={view.dir} />
      <PreferenceSection {...view.language} name="language" dir={view.dir} />
    </>
  );
}
