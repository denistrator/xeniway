import { useTranslation } from "react-i18next";
import { useOfflineAccess } from "./offline-access.model";

export function useLogoutDestinationNotice() {
  const { t } = useTranslation();
  const access = useOfflineAccess();
  const pending = access.logoutFinish === "pending";
  const finish = () => void access.finishRemoteLogout();
  return {
    visible: access.localLogout || access.logoutNoticeStorageFailed,
    unconfirmed: access.localLogout,
    storageFailed: access.logoutNoticeStorageFailed,
    failed: access.logoutFinish === "failed",
    pending,
    finish,
    title: t("offline.logoutNoticeTitle"),
    description: t("offline.localLogout"),
    persistenceWarning: t("offline.logoutNoticePersistenceFailed"),
    failure: t("offline.finishLogoutFailed"),
    finishLabel: pending ? t("offline.finishingLogout") : t("offline.finishLogout"),
  };
}
