import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { LoadingScreen } from "../../../../components/loading-screen";
import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";
import { useApplicationDetail } from "../../../../lib/queries";
import { NotFoundPage } from "../../../../pages/not-found-page";
import { ApplicationWorkspaceContent } from "./application-workspace-content";
import { parseApplicationId } from "./parse-application-id";

export function ApplicationWorkspacePage() {
  const { id: rawId } = useParams();
  const id = parseApplicationId(rawId);
  const detail = useApplicationDetail(id);
  const { t } = useTranslation();

  if (id === null || (detail.error instanceof ApiRequestError && detail.error.code === "NOT_FOUND"))
    return <NotFoundPage />;
  if (detail.isPending) return <LoadingScreen />;
  if (detail.error || !detail.data)
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
