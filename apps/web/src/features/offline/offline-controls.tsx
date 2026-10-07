import { notifyManager, type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { applicationKeys } from "../../lib/api";
import { useOfflineAccess, useVerifiedUser } from "./offline-access";

type OfflineAccess = ReturnType<typeof useOfflineAccess>;

function getRouteQueryKey(pathname: string, owner: number | null): QueryKey | null {
  if (!owner) {
    return null;
  }
  const detailId = /^\/applications\/(\d+)\/?$/.exec(pathname)?.[1];
  if (detailId) {
    return applicationKeys.detail(owner, Number(detailId));
  }
  switch (pathname) {
    case "/":
      return applicationKeys.list(owner, "active");
    case "/archive":
      return applicationKeys.list(owner, "archive");
    case "/blacklist":
      return applicationKeys.list(owner, "blacklist");
    default:
      return null;
  }
}

export function OfflineControls() {
  const { t } = useTranslation();
  const access = useOfflineAccess();
  const client = useQueryClient();
  const { pathname } = useLocation();
  const queryKey = getRouteQueryKey(pathname, access.readAccountId);
  const subscribe = useCallback(
    (listener: () => void) => client.getQueryCache().subscribe(notifyManager.batchCalls(listener)),
    [client],
  );
  const downloadedAt = useSyncExternalStore(subscribe, () =>
    queryKey ? (client.getQueryState(queryKey)?.dataUpdatedAt ?? 0) : 0,
  );

  const failed = access.download.status === "failed";
  const readOnly = Boolean(access.readAccountId && !access.canMutate);
  const hasDownloadNotice = Boolean(access.account || failed || access.download.status === "preparing");
  const hasDeviceNotice = access.localLogout || access.storageError || access.updateAvailable;
  const notice = hasDownloadNotice || hasDeviceNotice || readOnly;
  const canRetry = Boolean(access.readAccountId || failed) && !access.canMutate;
  if (!access.readAccountId && !notice) {
    return null;
  }
  return (
    <section aria-label={t("offline.title")} className="mx-auto w-full max-w-7xl px-6 pt-4 text-sm">
      <OfflineNotices access={access} downloadedAt={downloadedAt} notice={notice} />
      {canRetry && (
        <Button variant="outline" size="sm" onClick={() => void access.retryConnection().catch(() => {})}>
          {t("common.actions.retry")}
        </Button>
      )}
      {access.readAccountId && <OfflineDownloadSettings access={access} />}
    </section>
  );
}

function OfflineNotices({
  access,
  downloadedAt,
  notice,
}: {
  access: OfflineAccess;
  downloadedAt: number;
  notice: boolean;
}) {
  const { t, i18n } = useTranslation();
  const busy = access.download.status === "preparing";
  const failed = access.download.status === "failed";
  const progress = access.download.status === "preparing" ? access.download.progress : null;
  return (
    <div role={notice ? "status" : undefined} aria-live="polite" className="space-y-2">
      {access.readAccountId && !access.canMutate && <p>{t("offline.readOnly")}</p>}
      {access.localLogout && <p>{t("offline.localLogout")}</p>}
      {access.updateAvailable && <p>{t("offline.update")}</p>}
      {access.account && !busy && !failed && (
        <p>
          {t("offline.ready", { date: new Date(access.account.expiresAt).toLocaleString(i18n.resolvedLanguage) })}{" "}
          {downloadedAt > 0 &&
            t("offline.downloaded", {
              date: new Date(downloadedAt).toLocaleString(i18n.resolvedLanguage),
            })}
        </p>
      )}
      {(failed || access.storageError) && <p>{t("offline.failed")}</p>}
      {busy && <p>{progress ? t("offline.progress", progress) : t("offline.preparing")}</p>}
    </div>
  );
}

function OfflineDownloadSettings({ access }: { access: OfflineAccess }) {
  const { t } = useTranslation();
  const user = useVerifiedUser();
  const [consentSelection, setConsent] = useState({ userId: user?.id, checked: false });
  const consent = consentSelection.userId === user?.id && consentSelection.checked;
  useEffect(() => {
    setConsent({ userId: user?.id, checked: false });
  }, [user?.id]);

  const download = access.download;
  const busy = download.status === "preparing";
  const refreshing = busy && download.refresh;
  const sameOwnerDownload = Boolean(access.account && access.account.userId === user?.id);
  const canPrepare = Boolean(user && access.readAccountId === user.id && access.canMutate);
  const hasDownload = Boolean(access.account || refreshing);
  const canRefreshDownload = sameOwnerDownload || refreshing;
  const showRefresh = canRefreshDownload && !import.meta.env.DEV;
  const showEnable = access.canMutate && !import.meta.env.DEV;

  function prepare(refresh = false) {
    if (import.meta.env.DEV || busy || !canPrepare || !(refresh ? sameOwnerDownload : consent)) {
      return;
    }
    if (refresh) {
      setConsent({ userId: user?.id, checked: true });
    }
    void access.prepareDownload({ consent: refresh || consent, ...(refresh ? { refresh: true } : {}) }).catch(() => {});
  }

  return (
    <details className="mt-2 rounded-xl border border-line bg-surface p-3">
      <summary className="cursor-pointer font-semibold focus-visible:outline-2">{t("offline.title")}</summary>
      {import.meta.env.DEV && <p className="my-3">{t("offline.productionOnly")}</p>}
      <p className="my-3">{t("offline.privacy")}</p>
      <p className="my-3">{t("offline.coverage")}</p>
      {hasDownload ? (
        <>
          {showRefresh && (
            <>
              <p className="my-3">{t("offline.refreshReplacement")}</p>
              <Button
                variant="outline"
                size="sm"
                className="aria-disabled:opacity-50"
                disabled={!canPrepare}
                aria-disabled={busy || !canPrepare}
                onClick={() => void prepare(true)}
              >
                {t("offline.refresh")}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              void access.removeDownload().catch(() => {});
            }}
          >
            {t("offline.remove")}
          </Button>
        </>
      ) : (
        showEnable && (
          <>
            <label className="flex gap-2">
              <input
                type="checkbox"
                name="offlineConsent"
                checked={consent}
                onChange={(event) => setConsent({ userId: user?.id, checked: event.target.checked })}
              />
              {t("offline.consent")}
            </label>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={!consent || busy || !canPrepare}
              onClick={() => void prepare()}
            >
              {t("offline.enable")}
            </Button>
          </>
        )
      )}
    </details>
  );
}
