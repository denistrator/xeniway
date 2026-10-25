import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { applicationKeys } from "../../lib/api";
import { useOfflineAccess, useVerifiedUser } from "./offline-access.model";
import { connectionMessageKey } from "./offline-messages";

type OfflineAccess = ReturnType<typeof useOfflineAccess>;

export function useOfflineControls() {
  const { t } = useTranslation();
  const access = useOfflineAccess();
  const client = useQueryClient();
  const queryKey = access.readAccountId ? applicationKeys.list(access.readAccountId, "active") : null;
  const subscribe = useCallback(
    (listener: () => void) => client.getQueryCache().subscribe(notifyManager.batchCalls(listener)),
    [client],
  );
  const activeBoardFetchedAt = useSyncExternalStore(subscribe, () =>
    queryKey ? (client.getQueryState(queryKey)?.dataUpdatedAt ?? 0) : 0,
  );

  const failed = access.download.status === "failed";
  const readOnly = Boolean(access.readAccountId && !access.canMutate);
  const hasDownloadNotice = Boolean(access.account || failed || access.download.status === "preparing");
  const hasDeviceNotice =
    access.localLogout || access.storageError || access.cleanup.status !== "idle" || access.updateAvailable;
  const restorationFailed =
    access.download.status === "restore-failed" || access.download.status === "restore-timed-out";
  const checking = access.verification === "checking";
  const notice =
    hasDownloadNotice ||
    hasDeviceNotice ||
    readOnly ||
    access.isDisconnected ||
    restorationFailed ||
    access.verification !== "idle";
  const canRetry = Boolean(access.readAccountId || failed || access.isDisconnected) && !access.canMutate;
  const retry = () => void access.retryConnection().catch(() => {});
  const canRetryRestoration = restorationFailed;
  const retryRestoration = () => void access.retryRestoration().catch(() => {});
  return {
    access,
    activeBoardFetchedAt,
    checking,
    notice,
    canRetry,
    retry,
    canRetryRestoration,
    retryRestoration,
    retryRestorationLabel: t("offline.retryRestoration"),
    title: t("offline.title"),
    headingLabel: access.isDisconnected ? `${t("offline.title")} — ${t("offline.disconnected")}` : t("offline.title"),
    loginLabel: t("common.actions.login"),
    retryLabel: checking ? t("offline.checkingConnection") : t("common.actions.retry"),
  };
}

export type OfflineNoticesProps = { access: OfflineAccess; activeBoardFetchedAt: number; notice: boolean };

function preparationFailureKey(access: OfflineAccess) {
  if (access.download.status !== "failed") {
    return "offline.failed";
  }
  switch (access.download.category) {
    case "resources":
      return "offline.preparationResourcesFailed";
    case "connection":
      return "offline.preparationConnectionFailed";
    default:
      return "offline.failed";
  }
}

export function useOfflineNotices({ access, activeBoardFetchedAt, notice }: OfflineNoticesProps) {
  const { t, i18n } = useTranslation();
  const busy = access.download.status === "preparing";
  const failed = access.download.status === "failed";
  const progress = access.download.status === "preparing" ? access.download.progress : null;
  const showFailure = failed || (access.storageError && access.cleanup.status === "idle");
  const showReady = Boolean(access.account && !busy && !failed && !access.storageError);
  const ready =
    access.account && showReady
      ? t("offline.ready", { date: new Date(access.account.expiresAt).toLocaleString(i18n.resolvedLanguage) })
      : null;
  const fetched =
    activeBoardFetchedAt > 0
      ? t("offline.downloaded", { date: new Date(activeBoardFetchedAt).toLocaleString(i18n.resolvedLanguage) })
      : null;
  const verificationKey = connectionMessageKey(access.verification);
  return {
    busy,
    failed,
    showReady,
    showFailure,
    ready,
    fetched,
    verificationMessage: verificationKey ? t(verificationKey) : null,
    informational: access.verification === "succeeded",
    messageId: access.verificationResult,
    persistentRole: notice && access.verification !== "succeeded" ? ("status" as const) : undefined,
    readOnly: t("offline.readOnly"),
    localLogout: t("offline.localLogout"),
    update: t("offline.update"),
    failure: t(preparationFailureKey(access)),
    preparing: progress ? t("offline.progress", progress) : t("offline.preparing"),
    restorationMessage:
      access.download.status === "restore-timed-out" ? t("offline.restorationSlow") : t("offline.restorationFailed"),
    showRestorationFailure:
      access.download.status === "restore-failed" || access.download.status === "restore-timed-out",
  };
}

export type OfflineDownloadSettingsProps = { access: OfflineAccess };
type OfflineDownloadSettingsContent = "cleanupPending" | "cleanupFailed" | "download" | "enable" | "none";

export function useOfflineDownloadSettings({ access }: OfflineDownloadSettingsProps) {
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
  const cleanupPending = access.cleanup.status === "removing";
  const cleanupUnavailable = access.cleanup.status === "unavailable";
  const cleanupFailed = access.cleanup.status === "failed" || cleanupUnavailable;
  const canRefreshDownload = sameOwnerDownload || refreshing;
  const showRefresh = canRefreshDownload && !import.meta.env.DEV;
  const restorationUnresolved = ["restoring", "restore-failed", "restore-timed-out"].includes(download.status);
  const showEnable =
    access.canMutate && !cleanupPending && !cleanupFailed && !restorationUnresolved && !import.meta.env.DEV;
  let content: OfflineDownloadSettingsContent = "none";
  if (cleanupPending) {
    content = "cleanupPending";
  } else if (cleanupFailed) {
    content = "cleanupFailed";
  } else if (hasDownload) {
    content = "download";
  } else if (showEnable) {
    content = "enable";
  }

  function prepare(refresh = false) {
    if (import.meta.env.DEV || busy || !canPrepare || !(refresh ? sameOwnerDownload : consent)) {
      return;
    }
    if (refresh) {
      setConsent({ userId: user?.id, checked: true });
    }
    void access.prepareDownload({ consent: refresh || consent, ...(refresh ? { refresh: true } : {}) }).catch(() => {});
  }

  const refresh = () => prepare(true);
  const enable = () => prepare();
  const remove = () => void access.removeDownload().catch(() => {});
  const retryCleanup = () => void access.retryDownloadCleanup().catch(() => {});
  const changeConsent = (event: ChangeEvent<HTMLInputElement>) =>
    setConsent({ userId: user?.id, checked: event.target.checked });
  return {
    consent,
    busy,
    canPrepare,
    hasDownload,
    cleanupPending,
    cleanupFailed,
    content,
    showRefresh,
    showEnable,
    refresh,
    enable,
    remove,
    retryCleanup,
    changeConsent,
    productionOnly: import.meta.env.DEV,
    productionOnlyLabel: t("offline.productionOnly"),
    privacy: t("offline.privacy"),
    coverage: t("offline.coverage"),
    refreshReplacement: t("offline.refreshReplacement"),
    refreshLabel: t("offline.refresh"),
    removeLabel: t("offline.remove"),
    cleanupFailedLabel: t(cleanupUnavailable ? "offline.cleanupUnavailable" : "offline.cleanupFailed"),
    removingLabel: t("offline.removing"),
    retryCleanupLabel: t("offline.retryCleanup"),
    consentLabel: t("offline.consent"),
    enableLabel: t("offline.enable"),
  };
}
