import { WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button.view";
import { InfoMessage } from "../../components/ui/info-message.view";
import {
  type OfflineDownloadSettingsProps,
  type OfflineNoticesProps,
  useOfflineControls,
  useOfflineDownloadSettings,
  useOfflineNotices,
} from "./offline-controls.model";
import { offlineControlsStyles } from "./offline-controls.styles";

const styles = offlineControlsStyles();

export function OfflineControls() {
  const controls = useOfflineControls();
  return (
    <section aria-label={controls.title} className={styles.root()}>
      <h2 aria-label={controls.headingLabel} className={styles.heading()}>
        {controls.title}
        {controls.access.isDisconnected && <WifiOff aria-hidden="true" size={18} className={styles.connectionIcon()} />}
      </h2>
      <OfflineNotices
        access={controls.access}
        activeBoardFetchedAt={controls.activeBoardFetchedAt}
        notice={controls.notice}
      />
      <div className={styles.connectionActions()}>
        {controls.canRetryRestoration && (
          <Button variant="outline" size="sm" onClick={controls.retryRestoration}>
            {controls.retryRestorationLabel}
          </Button>
        )}
        {controls.canRetry && (
          <Button variant="outline" size="sm" onClick={controls.retry} disabled={controls.checking}>
            {controls.retryLabel}
          </Button>
        )}
        {!controls.access.readAccountId && (
          <Link to="/login" className={styles.loginLink()}>
            {controls.loginLabel}
          </Link>
        )}
      </div>
      {(controls.access.readAccountId || controls.access.cleanup.status !== "idle") && (
        <OfflineDownloadSettings access={controls.access} />
      )}
    </section>
  );
}

function OfflineNotices(props: OfflineNoticesProps) {
  const notices = useOfflineNotices(props);
  return (
    <>
      <div role={notices.persistentRole} aria-live="polite" className={styles.notices()}>
        {props.access.readAccountId && !props.access.canMutate && (
          <p className={styles.readOnlyNotice()}>{notices.readOnly}</p>
        )}
        {props.access.localLogout && <p className={styles.localLogoutNotice()}>{notices.localLogout}</p>}
        {props.access.updateAvailable && <p className={styles.updateNotice()}>{notices.update}</p>}
        {notices.showReady && <p className={styles.readyNotice()}>{notices.ready}</p>}
        {notices.fetched && <p className={styles.fetchedNotice()}>{notices.fetched}</p>}
        {notices.verificationMessage && !notices.informational && (
          <p className={styles.verificationNotice()}>{notices.verificationMessage}</p>
        )}
        {notices.showFailure && <p className={styles.failureNotice()}>{notices.failure}</p>}
        {notices.showRestorationFailure && <p className={styles.restorationNotice()}>{notices.restorationMessage}</p>}
        {notices.busy && <p className={styles.progressNotice()}>{notices.preparing}</p>}
      </div>
      {notices.informational && (
        <InfoMessage messageId={notices.messageId} className={styles.verificationNotice()}>
          {notices.verificationMessage}
        </InfoMessage>
      )}
    </>
  );
}

function OfflineDownloadSettings(props: OfflineDownloadSettingsProps) {
  const settings = useOfflineDownloadSettings(props);
  return (
    <div className={styles.settings()}>
      {settings.productionOnly && <p className={styles.productionNotice()}>{settings.productionOnlyLabel}</p>}
      <p className={styles.privacyNotice()}>{settings.privacy}</p>
      <p className={styles.coverageNotice()}>{settings.coverage}</p>
      {settings.content === "cleanupPending" && <p className={styles.cleanupNotice()}>{settings.removingLabel}</p>}
      {settings.content === "cleanupFailed" && (
        <div className={styles.cleanupActions()}>
          <p className={styles.cleanupNotice()}>{settings.cleanupFailedLabel}</p>
          <Button variant="outline" size="sm" className={styles.retryCleanupButton()} onClick={settings.retryCleanup}>
            {settings.retryCleanupLabel}
          </Button>
        </div>
      )}
      {settings.content === "download" && (
        <>
          {settings.showRefresh && <p className={styles.refreshNotice()}>{settings.refreshReplacement}</p>}
          <div className={styles.downloadActions()}>
            {settings.showRefresh && (
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
            )}
            <Button variant="outline" size="sm" disabled={settings.busy} onClick={settings.remove}>
              {settings.removeLabel}
            </Button>
          </div>
        </>
      )}
      {settings.content === "enable" && (
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
      )}
    </div>
  );
}
