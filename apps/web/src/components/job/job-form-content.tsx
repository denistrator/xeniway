import type { CreateApplicationInput, JobApplication } from "@job-tracker/shared";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { JobFormPresentation } from "../../store";
import { Button } from "../ui/button";
import { JobForm } from "./job-form";

export type JobFormContentProps = {
  presentation: JobFormPresentation;
  mode: "create" | "edit";
  job?: JobApplication;
  submitting: boolean;
  onSave: (input: CreateApplicationInput) => void;
  onArchive: () => void;
  onBlacklist: (reason: string) => void;
  blacklisting: boolean;
  onClose: () => void;
  onSwitchPresentation: () => void;
};

export type JobFormDialogProps = JobFormContentProps & {
  dialogRef: RefObject<HTMLElement | null>;
};

export function JobFormContent({
  presentation,
  mode,
  job,
  submitting,
  onSave,
  onArchive,
  onBlacklist,
  blacklisting,
  onClose,
  onSwitchPresentation,
}: JobFormContentProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="job-form-title" className="font-display text-2xl font-bold tracking-tight text-ink">
          {mode === "create" ? t("applications.editor.add") : t("applications.editor.edit")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              presentation === "drawer"
                ? t("applications.editor.switchToModal")
                : t("applications.editor.switchToDrawer")
            }
            title={
              presentation === "drawer"
                ? t("applications.editor.switchToModal")
                : t("applications.editor.switchToDrawer")
            }
            onClick={onSwitchPresentation}
          >
            {presentation === "drawer" ? <PanelRightOpen aria-hidden="true" /> : <PanelRightClose aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("applications.editor.close")}
            data-dialog-initial-focus
            onClick={onClose}
          >
            ×
          </Button>
        </div>
      </div>
      <JobForm
        job={job}
        submitting={submitting}
        onSubmit={onSave}
        onArchive={mode === "edit" ? onArchive : undefined}
        onBlacklist={mode === "edit" ? onBlacklist : undefined}
        blacklisting={blacklisting}
      />
    </>
  );
}
