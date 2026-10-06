import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { applicationKeys } from "../../lib/api";
import { useOfflineAccess, useVerifiedUser } from "./offline-access";

export function OfflineControls() {
  const { t, i18n } = useTranslation();
  const access = useOfflineAccess();
  const user = useVerifiedUser();
  const client = useQueryClient();
  const { pathname } = useLocation();
  const owner = access.readAccountId;
  const detailId = /^\/applications\/(\d+)\/?$/.exec(pathname)?.[1];
  const queryKey = owner
    ? detailId
      ? applicationKeys.detail(owner, Number(detailId))
      : ["/", "/archive", "/blacklist"].includes(pathname)
        ? applicationKeys.list(
            owner,
            pathname === "/archive" ? "archive" : pathname === "/blacklist" ? "blacklist" : "active",
          )
        : null
    : null;
  const subscribe = useCallback(
    (listener: () => void) => client.getQueryCache().subscribe(notifyManager.batchCalls(listener)),
    [client],
  );
  const downloadedAt = useSyncExternalStore(subscribe, () =>
    queryKey ? (client.getQueryState(queryKey)?.dataUpdatedAt ?? 0) : 0,
  );
  const [consentSelection, setConsent] = useState({ userId: user?.id, checked: false });
  const consent = consentSelection.userId === user?.id && consentSelection.checked;
  useEffect(() => {
    setConsent({ userId: user?.id, checked: false });
  }, [user?.id]);

  const download = access.download;
  const busy = download.status === "preparing";
  const refreshing = busy && download.refresh;
  const failed = download.status === "failed";
  const progress = busy ? download.progress : null;
  const sameOwnerDownload = Boolean(access.account && access.account.userId === user?.id);
  const canPrepare = Boolean(user && owner === user.id && access.canMutate);

  function prepare(refresh = false) {
    if (import.meta.env.DEV || busy || !canPrepare || !(refresh ? sameOwnerDownload : consent)) return;
    if (refresh) setConsent({ userId: user?.id, checked: true });
    void access.prepareDownload({ consent: refresh || consent, ...(refresh ? { refresh: true } : {}) }).catch(() => {});
  }

  const notice = Boolean(
    access.account ||
      access.localLogout ||
      access.storageError ||
      failed ||
      busy ||
      access.updateAvailable ||
      (access.readAccountId && !access.canMutate),
  );
  if (!access.readAccountId && !notice) return null;
  return (
    <section aria-label={t("offline.title")} className="mx-auto w-full max-w-7xl px-6 pt-4 text-sm">
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
      {(access.readAccountId || failed) && !access.canMutate && (
        <Button variant="outline" size="sm" onClick={() => void access.retryConnection().catch(() => {})}>
          {t("common.actions.retry")}
        </Button>
      )}
      {access.readAccountId && (
        <details className="mt-2 rounded-xl border border-line bg-surface p-3">
          <summary className="cursor-pointer font-semibold focus-visible:outline-2">{t("offline.title")}</summary>
          {import.meta.env.DEV && <p className="my-3">{t("offline.productionOnly")}</p>}
          <p className="my-3">{t("offline.privacy")}</p>
          <p className="my-3">{t("offline.coverage")}</p>
          {access.account || (busy && refreshing) ? (
            <>
              {(sameOwnerDownload || (busy && refreshing)) && !import.meta.env.DEV && (
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
            access.canMutate &&
            !import.meta.env.DEV && (
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
      )}
    </section>
  );
}
