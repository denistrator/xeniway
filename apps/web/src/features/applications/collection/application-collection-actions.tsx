import type { ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import { useCanMutate } from "../../offline/offline-access";

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
  const canMutate = useCanMutate();
  return (
    <div className="flex gap-2">
      <Button className="flex-1" size="sm" onClick={onRestore} disabled={busy || !canMutate}>
        {restoreLabel}
      </Button>
      {onDelete && (
        <Button className="flex-1" variant="outline" size="sm" onClick={onDelete} disabled={busy || !canMutate}>
          {deleteLabel}
        </Button>
      )}
    </div>
  );
}
