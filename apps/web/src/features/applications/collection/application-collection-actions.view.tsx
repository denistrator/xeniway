import { Button } from "../../../components/ui/button.view";
import {
  type ApplicationCollectionActionsProps,
  useApplicationCollectionActionsPresentation,
} from "./application-collection-actions.model";
import { applicationCollectionActionsStyles } from "./application-collection-actions.styles";

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
