import { JobFormContent, type JobFormDialogProps } from "./job-form-content";

export function JobDrawer({
  mode,
  presentation,
  job,
  submitting,
  onSave,
  onArchive,
  onClose,
  onSwitchPresentation,
  dialogRef,
}: JobFormDialogProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 dark:bg-black/60">
      <button
        type="button"
        aria-label="Close dialog"
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
        className="relative ml-auto flex h-full w-full max-w-xl flex-col overscroll-contain overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <JobFormContent
          presentation={presentation}
          mode={mode}
          job={job}
          submitting={submitting}
          onSave={onSave}
          onArchive={onArchive}
          onClose={onClose}
          onSwitchPresentation={onSwitchPresentation}
        />
      </div>
    </div>
  );
}
