import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";
import { useApplicationDetail } from "../../../../lib/queries";

import { useOfflineAccess } from "../../../offline/offline-access.view";

import { parseApplicationId } from "./parse-application-id";

export function useApplicationWorkspacePage() {
  const { id: rawId } = useParams();
  const id = parseApplicationId(rawId);
  const detail = useApplicationDetail(id);
  const { t } = useTranslation();
  const access = useOfflineAccess();
  const notFound = id === null || (detail.error instanceof ApiRequestError && detail.error.code === "NOT_FOUND");
  const notDownloaded = !access.canReadRemote && !detail.data;
  const failed = !detail.data || (detail.error instanceof ApiRequestError && detail.error.status < 500);
  const errorText = t(getApiErrorKey(detail.error instanceof ApiRequestError ? detail.error.code : "REQUEST_FAILED"));
  const offlineLabel = t("offline.notDownloaded");
  const retryLabel = t("common.actions.retry");
  function retry() {
    void detail.refetch();
  }

  return { notFound, notDownloaded, offlineLabel, detail, failed, errorText, retry, retryLabel };
}
