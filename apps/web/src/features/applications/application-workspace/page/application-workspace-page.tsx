import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { LoadingScreen } from "../../../../components/loading-screen";
import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";
import { useApplicationDetail } from "../../../../lib/queries";
import { NotFoundPage } from "../../../../pages/not-found-page";
import { ContactsSection } from "../contacts/contacts-section";
import { FollowUpsSection } from "../follow-ups/follow-ups-section";
import { PreparationSection } from "../preparation/preparation-section";
import { ApplicationWorkspaceHeader } from "../shared/application-workspace-header";
import { ApplicationWorkspaceSidebar } from "../shared/application-workspace-sidebar";
import { useWorkspaceActions } from "../shared/use-workspace-actions";
import { parseApplicationId } from "../shared/workspace-board";

export function ApplicationWorkspacePage() {
  const { id: rawId } = useParams();
  const id = parseApplicationId(rawId);
  const detail = useApplicationDetail(id);
  const { t } = useTranslation();
  const application = detail.data?.application;
  const actions = useWorkspaceActions(application);
  const board = actions.board;

  if (id === null || (detail.error instanceof ApiRequestError && detail.error.code === "NOT_FOUND"))
    return <NotFoundPage />;
  if (detail.isPending) return <LoadingScreen />;
  if (detail.error || !application || !board)
    return (
      <div role="alert" className="mx-auto max-w-7xl px-6 py-8 text-sm text-rose-600">
        <p>{t(getApiErrorKey(detail.error instanceof ApiRequestError ? detail.error.code : "REQUEST_FAILED"))}</p>
        <button type="button" className="mt-2 underline focus-visible:outline-2" onClick={() => void detail.refetch()}>
          {t("common.actions.retry")}
        </button>
      </div>
    );

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
      <div className="space-y-5">
        <ApplicationWorkspaceHeader application={application} />
        <PreparationSection applicationId={application.id} preparation={detail.data.preparation} />
        <ContactsSection applicationId={application.id} contacts={detail.data.contacts} />
        <FollowUpsSection applicationId={application.id} tasks={detail.data.followUpTasks} />
      </div>
      <ApplicationWorkspaceSidebar
        applicationId={application.id}
        board={board}
        pending={actions.pending}
        onEdit={actions.edit}
        onAction={actions.run}
      />
    </div>
  );
}
