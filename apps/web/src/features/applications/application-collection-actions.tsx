import type { ReactNode } from "react";
import { Button } from "../../components/ui/button";

export function ApplicationCollectionActions({
  restoreLabel,
  deleteLabel,
  onRestore,
  onDelete,
  busy,
}: {
  restoreLabel: ReactNode;
  deleteLabel?: ReactNode;
  onRestore: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Button className="flex-1" size="sm" onClick={onRestore} disabled={busy}>
        {restoreLabel}
      </Button>
      {onDelete && (
        <Button className="flex-1" variant="outline" size="sm" onClick={onDelete} disabled={busy}>
          {deleteLabel}
        </Button>
      )}
    </div>
  );
}
