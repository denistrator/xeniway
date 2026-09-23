import type { RefObject } from "react";
import { Button } from "../../../components/ui/button";
import { CardHeader, CardTitle } from "../../../components/ui/card";

export function WorkspaceSectionHeader({
  headingId,
  title,
  help,
  addLabel,
  addButton,
  disabled,
  onAdd,
}: {
  headingId: string;
  title: string;
  help: string;
  addLabel: string;
  addButton: RefObject<HTMLButtonElement | null>;
  disabled: boolean;
  onAdd: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <CardHeader className="flex flex-wrap flex-row items-start justify-between gap-3">
      <div>
        <CardTitle id={headingId} className="font-display text-xl">
          {title}
        </CardTitle>
        <p className="mt-1 text-sm text-muted">{help}</p>
      </div>
      <Button
        ref={addButton}
        type="button"
        size="sm"
        disabled={disabled}
        onClick={(event) => onAdd(event.currentTarget)}
      >
        {addLabel}
      </Button>
    </CardHeader>
  );
}
