import type { JobApplication } from "@xeniway/shared";
import { useNavigate } from "react-router-dom";
import { useApplicationMutations } from "../../../../lib/queries";
import { getApplicationBoard } from "../shared/application-board";

export type ApplicationLifecycleAction = "archive" | "blacklist" | "restore" | "delete";

export function useApplicationLifecycle(application: JobApplication) {
  const mutations = useApplicationMutations();
  const navigate = useNavigate();
  const board = getApplicationBoard(application);

  async function execute(action: ApplicationLifecycleAction) {
    switch (action) {
      case "archive":
        await mutations.archive.mutateAsync(application.id);
        break;
      case "blacklist":
        await mutations.blacklist.mutateAsync({ id: application.id, input: { reason: null } });
        break;
      case "restore":
        if (board === "archive") {
          await mutations.restore.mutateAsync(application.id);
        } else {
          await mutations.unblacklist.mutateAsync(application.id);
        }
        break;
      case "delete":
        await mutations.remove.mutateAsync(application.id);
        break;
    }

    if (action === "delete") {
      navigate(board === "archive" ? "/archive" : "/blacklist");
    } else if (action === "restore" && board === "blacklist" && application.archivedAt) {
      navigate("/archive");
    } else {
      navigate("/");
    }
  }

  return {
    board,
    pending:
      mutations.archive.isPending ||
      mutations.blacklist.isPending ||
      mutations.restore.isPending ||
      mutations.unblacklist.isPending ||
      mutations.remove.isPending,
    execute,
  };
}
