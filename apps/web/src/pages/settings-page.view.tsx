import { ExportSettingsSection } from "../features/data-export/export-settings-section.view";
import { OfflineControls } from "../features/offline/offline-controls.view";
import { SettingsPreferences } from "../features/preferences/settings-preferences.view";
import { useSettingsPage } from "./settings-page.model";
import { settingsPageStyles } from "./settings-page.styles";

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
