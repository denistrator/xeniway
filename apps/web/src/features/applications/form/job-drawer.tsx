import { jobDrawerStyles } from "./job-drawer.styles.ts";
import { useJobDrawerPresentation } from "./job-drawer.ts";
import type { JobFormDialogProps } from "./job-form-content.ts";
import { JobFormContent } from "./job-form-content.tsx";

const styles = jobDrawerStyles();

export function JobDrawer({
  presentation,
  submitting,
  onSave,
  onClose,
  onSwitchPresentation,
  dialogRef,
}: JobFormDialogProps) {
  const { closeLabel, setDialogRef } = useJobDrawerPresentation({
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
