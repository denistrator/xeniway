import { JobFormContent, type JobFormContentProps } from "./job-form-content";

export function JobModal({
  job,
  mode,
  presentation,
  submitting,
  onSave,
  onArchive,
  onClose,
  onSwitchPresentation,
}: JobFormContentProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-3 dark:bg-black/60">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="job-modal relative flex h-[calc(100vh-24px)] max-h-[calc(100vh-24px)] w-full flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 md:h-[90vh] md:w-[70vw] md:max-w-6xl"
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
