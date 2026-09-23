import type { CreateApplicationInput, JobApplication } from "@xeniway/shared";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser, useUpdateUserPreferences } from "../../../lib/queries";
import { writeLocalUserPreferences } from "../../../lib/user-preferences";
import { type RootState, setJobFormPresentation } from "../../../store";
import { JobDrawer } from "./job-drawer";
import { JobModal } from "./job-modal";
import { useJobDialog } from "./use-job-dialog";

export function JobManager({
  job,
  submitting,
  onSave,
  onArchive,
  onBlacklist,
  blacklisting,
  onClose,
}: {
  job?: JobApplication;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onArchive: () => void;
  onBlacklist: (reason: string) => void;
  blacklisting: boolean;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const presentation = useSelector((state: RootState) => state.ui.jobFormPresentation);
  const dialogRef = useJobDialog(drawer.open, onClose);
  const user = useCurrentUser();
  const updatePreferences = useUpdateUserPreferences();

  if (!drawer.open) return null;

  const switchPresentation = () => {
    const nextPresentation = presentation === "drawer" ? "modal" : "drawer";
    dispatch(setJobFormPresentation(nextPresentation));
    writeLocalUserPreferences({ formPresentation: nextPresentation });
    if (user.data) updatePreferences.mutate({ selectedFormPresentation: nextPresentation });
  };
  const props = {
    mode: drawer.mode,
    presentation,
    dialogRef,
    job,
    submitting,
    onSave,
    onArchive,
    onBlacklist,
    blacklisting,
    onClose,
    onSwitchPresentation: switchPresentation,
  };

  return presentation === "modal" ? <JobModal {...props} /> : <JobDrawer {...props} />;
}
