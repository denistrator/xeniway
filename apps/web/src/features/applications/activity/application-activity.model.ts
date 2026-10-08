import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useApplicationDetail } from "../../../lib/queries";
import { useOfflineAccess } from "../../offline/offline-access.model";
import { applicationActivityStyles } from "./application-activity.styles";

const styles = applicationActivityStyles();

export function useApplicationActivity(applicationId: number) {
  const { t } = useTranslation();
  const detail = useApplicationDetail(applicationId);
  const headingId = useId();
  const access = useOfflineAccess();
  let message: string | null = null;
  let showError = false;
  if (!access.canReadRemote) {
    message = t("offline.notDownloaded");
  } else if (detail.isPending) {
    message = t("common.loading");
  } else if (detail.isError) {
    showError = true;
  }

  function retry() {
    void detail.refetch();
  }

  return {
    detail: detail.data,
    headingId,
    message,
    showError,
    retry,
    heading: t("applications.activity.heading"),
    addLabel: t("applications.activity.add"),
    errorLabel: t("applications.activity.loadFailed"),
    retryLabel: t("common.actions.retry"),
    styles,
  };
}
