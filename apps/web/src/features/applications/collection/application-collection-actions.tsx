import { Button } from "../../../components/ui/button.tsx";
import { applicationCollectionActionsStyles } from "./application-collection-actions.styles.ts";
import {
  type ApplicationCollectionActionsProps,
  useApplicationCollectionActionsPresentation,
} from "./application-collection-actions.ts";

const styles = applicationCollectionActionsStyles();

export function ApplicationCollectionActions({
  restoreLabel,
  deleteLabel,
  onRestore,
  onDelete,
  busy,
}: ApplicationCollectionActionsProps) {
  const { disabled } = useApplicationCollectionActionsPresentation({
    restoreLabel,
    deleteLabel,
    onRestore,
    onDelete,
    busy,
  });

  return (
    <div className={styles.root()}>
      <Button className={styles.restoreButton()} size="sm" onClick={onRestore} disabled={disabled}>
        {restoreLabel}
      </Button>
      {onDelete && (
        <Button className={styles.deleteButton()} variant="outline" size="sm" onClick={onDelete} disabled={disabled}>
          {deleteLabel}
        </Button>
      )}
    </div>
  );
}
