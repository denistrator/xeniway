import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "../../../components/ui/button.tsx";
import { jobFormHeaderStyles } from "./job-form-header.styles.ts";
import { type JobFormHeaderProps, useJobFormHeaderPresentation } from "./job-form-header.ts";

const styles = jobFormHeaderStyles();

export function JobFormHeader({ presentation, onClose, onSwitchPresentation }: JobFormHeaderProps) {
  const { switchLabel, addLabel, closeLabel } = useJobFormHeaderPresentation({
    presentation,
    onClose,
    onSwitchPresentation,
  });

  return (
    <div className={styles.root()}>
      <h2 id="job-form-title" className={styles.title()}>
        {addLabel}
      </h2>
      <div className={styles.actions()}>
        <Button variant="ghost" size="icon" aria-label={switchLabel} title={switchLabel} onClick={onSwitchPresentation}>
          {presentation === "drawer" ? <PanelRightOpen aria-hidden="true" /> : <PanelRightClose aria-hidden="true" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label={closeLabel} data-dialog-initial-focus onClick={onClose}>
          ×
        </Button>
      </div>
    </div>
  );
}
