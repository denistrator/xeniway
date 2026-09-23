import type { JobApplication } from "@xeniway/shared";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useApplicationMutations } from "../../../lib/queries";
import { openEditDrawer } from "../../../store";
import { getWorkspaceBoard } from "./workspace-board";
import type { WorkspaceAction } from "./workspace-lifecycle-actions";

export function useWorkspaceActions(application: JobApplication | undefined) {
  const mutations = useApplicationMutations();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const board = application ? getWorkspaceBoard(application) : null;

  async function run(action: WorkspaceAction) {
    if (!application || !board) return;
    if (action === "archive") await mutations.archive.mutateAsync(application.id);
    if (action === "blacklist") await mutations.blacklist.mutateAsync({ id: application.id, input: { reason: null } });
    if (action === "restore") {
      if (board === "archive") await mutations.restore.mutateAsync(application.id);
      else await mutations.unblacklist.mutateAsync(application.id);
    }
    if (action === "delete") await mutations.remove.mutateAsync(application.id);
    if (action === "delete") navigate(board === "archive" ? "/archive" : "/blacklist");
    else if (action === "restore" && board === "blacklist" && application.archivedAt) navigate("/archive");
    else navigate("/");
  }

  return {
    board,
    pending:
      mutations.archive.isPending ||
      mutations.blacklist.isPending ||
      mutations.restore.isPending ||
      mutations.unblacklist.isPending ||
      mutations.remove.isPending,
    edit: () => application && dispatch(openEditDrawer(application.id)),
    run,
  };
}
