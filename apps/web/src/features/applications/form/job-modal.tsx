import type { JobFormDialogProps } from "./job-form-content.ts";
import { JobFormContent } from "./job-form-content.tsx";
import { jobModalStyles } from "./job-modal.styles.ts";
import { useJobModalPresentation } from "./job-modal.ts";

const styles = jobModalStyles();

export function JobModal({
  presentation,
  submitting,
  onSave,
  onClose,
  onSwitchPresentation,
  dialogRef,
}: JobFormDialogProps) {
  const { closeLabel, setDialogRef } = useJobModalPresentation({
    presentation,
    submitting,
    onSave,
    onClose,
    onSwitchPresentation,
    dialogRef,
  });

  return (
    <div className={styles.root()}>
      <button type="button" aria-label={closeLabel} tabIndex={-1} className={styles.backdrop()} onClick={onClose} />
      <div
        ref={setDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-form-title"
        className={styles.dialog()}
      >
        <JobFormContent
          presentation={presentation}
          submitting={submitting}
          onSave={onSave}
          onClose={onClose}
          onSwitchPresentation={onSwitchPresentation}
        />
      </div>
    </div>
  );
}
