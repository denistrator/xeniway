import type { CreateApplicationInput } from "@xeniway/shared";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser, useUpdateUserPreferences } from "../../../lib/queries";
import { writeLocalUserPreferences } from "../../../lib/user-preferences";
import { type RootState, setJobFormPresentation } from "../../../store";
import { JobDrawer } from "./job-drawer";
import { JobModal } from "./job-modal";
import { useJobDialog } from "./use-job-dialog";

export function JobManager({
  open,
  submitting,
  onSave,
  onClose,
}: {
  open: boolean;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onClose: () => void;
}) {
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.ui.jobFormPresentation);
  const dialogRef = useJobDialog(open, onClose);
  const user = useCurrentUser();
  const updatePreferences = useUpdateUserPreferences();

  if (!open) return null;

  const switchPresentation = () => {
    const nextPresentation = presentation === "drawer" ? "modal" : "drawer";
    dispatch(setJobFormPresentation(nextPresentation));
    writeLocalUserPreferences({ formPresentation: nextPresentation });
    if (user.data) updatePreferences.mutate({ selectedFormPresentation: nextPresentation });
  };
  const props = {
    presentation,
    dialogRef,
    submitting,
    onSave,
    onClose,
    onSwitchPresentation: switchPresentation,
  };

  return presentation === "modal" ? <JobModal {...props} /> : <JobDrawer {...props} />;
}
