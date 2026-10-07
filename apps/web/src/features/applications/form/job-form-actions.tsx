import { Button } from "../../../components/ui/button.tsx";
import { jobFormActionsStyles } from "./job-form-actions.styles.ts";
import { type JobFormActionsProps, useJobFormActionsPresentation } from "./job-form-actions.ts";

const styles = jobFormActionsStyles();

export function JobFormActions({ submitting }: JobFormActionsProps) {
  const { canMutate, savingLabel } = useJobFormActionsPresentation({ submitting });

  return (
    <div className={styles.root()}>
      <Button type="submit" disabled={submitting || !canMutate}>
        {savingLabel}
      </Button>
    </div>
  );
}
