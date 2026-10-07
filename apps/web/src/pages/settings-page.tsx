import { ExportSettingsSection } from "../features/data-export/export-settings-section.tsx";
import { OfflineControls } from "../features/offline/offline-controls.tsx";
import { SettingsPreferences } from "../features/preferences/settings-preferences.tsx";
import { settingsPageStyles } from "./settings-page.styles.ts";
import { useSettingsPage } from "./settings-page.ts";

const styles = settingsPageStyles();

export function SettingsPage() {
  const view = useSettingsPage();
  return (
    <div className={styles.root()}>
      <h1 className={styles.heading()}>{view.title}</h1>
      <OfflineControls />
      <SettingsPreferences />
      <ExportSettingsSection />
    </div>
  );
}
