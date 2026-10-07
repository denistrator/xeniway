import { Button } from "../../components/ui/button.tsx";
import { offlineControlsStyles } from "./offline-controls.styles.ts";
import {
  type OfflineDownloadSettingsProps,
  type OfflineNoticesProps,
  useOfflineControls,
  useOfflineDownloadSettings,
  useOfflineNotices,
} from "./offline-controls.ts";

const styles = offlineControlsStyles();

export function OfflineControls() {
  const controls = useOfflineControls();
  if (!controls.visible) {
    return null;
  }
  return (
    <section aria-label={controls.title} className={styles.root()}>
      <OfflineNotices access={controls.access} downloadedAt={controls.downloadedAt} notice={controls.notice} />
      {controls.canRetry && (
        <Button variant="outline" size="sm" onClick={controls.retry}>
          {controls.retryLabel}
        </Button>
      )}
      {controls.access.readAccountId && <OfflineDownloadSettings access={controls.access} />}
    </section>
  );
}

function OfflineNotices(props: OfflineNoticesProps) {
  const notices = useOfflineNotices(props);
  return (
    <div role={props.notice ? "status" : undefined} aria-live="polite" className={styles.notices()}>
      {props.access.readAccountId && !props.access.canMutate && (
        <p className={styles.readOnlyNotice()}>{notices.readOnly}</p>
      )}
      {props.access.localLogout && <p className={styles.localLogoutNotice()}>{notices.localLogout}</p>}
      {props.access.updateAvailable && <p className={styles.updateNotice()}>{notices.update}</p>}
      {notices.showReady && (
        <p className={styles.readyNotice()}>
          {notices.ready} {notices.downloaded}
        </p>
      )}
      {(notices.failed || props.access.storageError) && <p className={styles.failureNotice()}>{notices.failure}</p>}
      {notices.busy && <p className={styles.progressNotice()}>{notices.preparing}</p>}
    </div>
  );
}

function OfflineDownloadSettings(props: OfflineDownloadSettingsProps) {
  const settings = useOfflineDownloadSettings(props);
  return (
    <details className={styles.settings()}>
      <summary className={styles.summary()}>{settings.title}</summary>
      {settings.productionOnly && <p className={styles.productionNotice()}>{settings.productionOnlyLabel}</p>}
      <p className={styles.privacyNotice()}>{settings.privacy}</p>
      <p className={styles.coverageNotice()}>{settings.coverage}</p>
      {settings.hasDownload ? (
        <>
          {settings.showRefresh && (
            <>
              <p className={styles.refreshNotice()}>{settings.refreshReplacement}</p>
              <Button
                variant="outline"
                size="sm"
                className={styles.refreshButton()}
                disabled={!settings.canPrepare}
                aria-disabled={settings.busy || !settings.canPrepare}
                onClick={settings.refresh}
              >
                {settings.refreshLabel}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" disabled={settings.busy} onClick={settings.remove}>
            {settings.removeLabel}
          </Button>
        </>
      ) : (
        settings.showEnable && (
          <>
            <label className={styles.consentLabel()}>
              <input
                type="checkbox"
                name="offlineConsent"
                className={styles.consentInput()}
                checked={settings.consent}
                onChange={settings.changeConsent}
              />
              {settings.consentLabel}
            </label>
            <Button
              variant="outline"
              size="sm"
              className={styles.enableButton()}
              disabled={!settings.consent || settings.busy || !settings.canPrepare}
              onClick={settings.enable}
            >
              {settings.enableLabel}
            </Button>
          </>
        )
      )}
    </details>
  );
}
