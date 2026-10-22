import type { CreateApplicationInput } from "@xeniway/shared";
import type { RefObject } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser, useUpdateUserPreferences } from "../../../lib/queries";
import { writeLocalUserPreferences } from "../../../lib/user-preferences";
import { type RootState, setJobFormPresentation } from "../../../store";
import { useCanMutate } from "../../offline/offline-access.view";
import { useJobDialog } from "./use-job-dialog";
import { useJobForm } from "./use-job-form";

export type JobManagerProps = {
  open: boolean;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onClose: () => void;
  openerRef?: RefObject<HTMLElement | null>;
};

export function useJobManagerPresentation({ open, submitting, onSave, onClose, openerRef }: JobManagerProps) {
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.ui.jobFormPresentation);
  const dialogRef = useJobDialog(open, onClose, openerRef);
  const user = useCurrentUser();
  const canMutate = useCanMutate();
  const updatePreferences = useUpdateUserPreferences();
  const form = useJobForm({ onSubmit: onSave });

  const switchPresentation = () => {
    const nextPresentation = presentation === "drawer" ? "modal" : "drawer";
    dispatch(setJobFormPresentation(nextPresentation));
    writeLocalUserPreferences({ formPresentation: nextPresentation });
    if (user.data && canMutate) {
      updatePreferences.mutate({ selectedFormPresentation: nextPresentation });
    }
  };
  const props = {
    presentation,
    dialogRef,
    submitting,
    form,
    onSave,
    onClose,
    onSwitchPresentation: switchPresentation,
  };

  return { presentation, props };
}
