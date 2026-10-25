import { useTranslation } from "react-i18next";
import { matchPath, useLocation } from "react-router-dom";
import { useOfflineAccess } from "./offline-access.model";
import { connectionMessageKey } from "./offline-messages";

function isTaskRoute(pathname: string) {
  return ["/", "/archive", "/blacklist", "/applications/:applicationId"].some((pattern) =>
    Boolean(matchPath(pattern, pathname)),
  );
}

export function useOfflineTaskNotice() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const access = useOfflineAccess();
  let messageKey = connectionMessageKey(access.verification);
  if (!messageKey && !access.canMutate) {
    if (access.sessionStatus === "signed-out") {
      messageKey = "offline.readOnlySession";
    } else if (access.readAccountId) {
      messageKey = access.connectionStatus === "offline" ? "offline.readOnlyOffline" : "offline.readOnlyUnavailable";
    }
  }
  return {
    visible: isTaskRoute(pathname) && Boolean(messageKey),
    message: messageKey ? t(messageKey) : null,
    informational: access.verification === "succeeded",
    messageId: access.verificationResult,
    settingsLabel: t("navigation.settings"),
  };
}
