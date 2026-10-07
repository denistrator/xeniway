import { CsvExportButton } from "./csv-export-button.tsx";
import { exportSettingsSectionStyles } from "./export-settings-section.styles.ts";
import { useExportSettingsSection } from "./export-settings-section.ts";

const styles = exportSettingsSectionStyles();

export function ExportSettingsSection() {
  const view = useExportSettingsSection();
  if (!view.visible) {
    return null;
  }
  return (
    <section className={styles.root()} aria-labelledby={view.headingId}>
      <h2 id={view.headingId} className={styles.heading()}>
        {view.title}
      </h2>
      <p className={styles.description()}>{view.description}</p>
      {view.unavailable && (
        <p role="status" className={styles.unavailableNotice()}>
          {view.unavailableNotice}
        </p>
      )}
      <div className={styles.actions()}>
        <CsvExportButton />
      </div>
    </section>
  );
}
