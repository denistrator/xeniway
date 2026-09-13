import { useTranslation } from "react-i18next";
import { JobFormContent, type JobFormDialogProps } from "./job-form-content";

export function JobDrawer({
  mode,
  presentation,
  job,
  submitting,
  onSave,
  onArchive,
  onBlacklist,
  blacklisting,
  onClose,
  onSwitchPresentation,
  dialogRef,
}: JobFormDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 bg-overlay">
      <button
        type="button"
        aria-label={t("common.actions.closeDialog")}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        ref={(element) => {
          dialogRef.current = element;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-form-title"
        className="relative ml-auto flex h-full w-full max-w-xl flex-col overscroll-contain overflow-y-auto border-l border-line bg-surface p-6 shadow-2xl"
      >
        <JobFormContent
          presentation={presentation}
          mode={mode}
          job={job}
          submitting={submitting}
          onSave={onSave}
          onArchive={onArchive}
          onBlacklist={onBlacklist}
          blacklisting={blacklisting}
          onClose={onClose}
          onSwitchPresentation={onSwitchPresentation}
        />
      </div>
    </div>
  );
}
