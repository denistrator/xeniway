import type { CreateApplicationInput } from "@xeniway/shared";
import { type RefObject, useState } from "react";
import { useTranslation } from "react-i18next";
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
  submitError?: string;
  onSave: (input: CreateApplicationInput) => boolean | Promise<boolean>;
  onClose: () => void;
  openerRef?: RefObject<HTMLElement | null>;
};

export function useJobManagerPresentation({
  open,
  submitting,
  submitError,
  onSave,
  onClose,
  openerRef,
}: JobManagerProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.ui.jobFormPresentation);
  const user = useCurrentUser();
  const canMutate = useCanMutate();
  const updatePreferences = useUpdateUserPreferences();
  const form = useJobForm({ onSubmit: onSave });
  const [closeWarningOpen, setCloseWarningOpen] = useState(false);

  function close() {
    if (form.dirty && !submitting) {
      setCloseWarningOpen(true);
      return;
    }

    onClose();
  }

  function keepEditing() {
    setCloseWarningOpen(false);
  }

  function discardAndClose() {
    form.reset();
    setCloseWarningOpen(false);
    onClose();
  }

  async function saveAndClose() {
    await form.submit();
    setCloseWarningOpen(false);
  }

  const dialogRef = useJobDialog(open, close, openerRef);

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
    submitError,
    form,
    onSave,
    onClose: close,
    onSwitchPresentation: switchPresentation,
  };

  const closeWarning = {
    open: closeWarningOpen,
    title: t("applications.workspace.unsavedChangesTitle"),
    text: t("applications.workspace.unsavedRecordChangesText"),
    saveLabel: t("applications.workspace.actions.saveChanges"),
    discardLabel: t("applications.workspace.actions.discardChanges"),
    keepEditingLabel: t("applications.workspace.actions.keepEditing"),
    pending: submitting,
    keepEditing,
    discardAndClose,
    saveAndClose,
  };
  return { presentation, props, closeWarning };
}
