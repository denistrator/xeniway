import { JobFormContent, type JobFormDialogProps } from "./job-form-content";

export function JobModal({
  job,
  mode,
  presentation,
  submitting,
  onSave,
  onArchive,
  onClose,
  onSwitchPresentation,
  dialogRef,
}: JobFormDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3">
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
        className="job-modal relative flex h-[calc(100vh-24px)] max-h-[calc(100vh-24px)] w-full flex-col overscroll-contain overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl md:h-[90vh] md:w-[70vw] md:max-w-6xl"
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
