import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { LoadingScreen } from "../../../../components/loading-screen";
import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";
import { useApplicationDetail } from "../../../../lib/queries";
import { NotFoundPage } from "../../../../pages/not-found-page";
import { useOfflineAccess } from "../../../offline/offline-access";
import { ApplicationWorkspaceContent } from "./application-workspace-content";
import { parseApplicationId } from "./parse-application-id";

export function ApplicationWorkspacePage() {
  const { id: rawId } = useParams();
  const id = parseApplicationId(rawId);
  const detail = useApplicationDetail(id);
  const { t } = useTranslation();
  const access = useOfflineAccess();

  if (id === null || (detail.error instanceof ApiRequestError && detail.error.code === "NOT_FOUND"))
    return <NotFoundPage />;
  if (!access.canReadRemote && !detail.data)
    return (
      <p role="status" className="mx-auto max-w-7xl px-6">
        {t("offline.notDownloaded")}
      </p>
    );
  if (detail.isPending) return <LoadingScreen />;
  if (!detail.data || (detail.error instanceof ApiRequestError && detail.error.status < 500))
    return (
      <div role="alert" className="mx-auto max-w-7xl px-6 py-8 text-sm text-rose-600">
        <p>{t(getApiErrorKey(detail.error instanceof ApiRequestError ? detail.error.code : "REQUEST_FAILED"))}</p>
        <button type="button" className="mt-2 underline focus-visible:outline-2" onClick={() => void detail.refetch()}>
          {t("common.actions.retry")}
        </button>
      </div>
    );

  return <ApplicationWorkspaceContent data={detail.data} />;
}
