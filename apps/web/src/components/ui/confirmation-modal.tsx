import { useEffect, useRef } from "react";
import { Button } from "./button";

export function ConfirmationModal({
  title,
  text,
  yesLabel,
  noLabel,
  onYes,
  onNo,
  yesDisabled = false,
}: {
  title: string;
  text?: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  yesDisabled?: boolean;
}) {
  const noButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    noButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onNo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onNo]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay p-4">
      <button
        type="button"
        aria-label={noLabel}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onNo}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby={text ? "confirmation-text" : undefined}
        className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
      >
        <h2 id="confirmation-title" className="font-display text-2xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        {text && (
          <p id="confirmation-text" className="mt-3 text-base leading-7 text-muted">
            {text}
          </p>
        )}
        <div className="mt-8 flex justify-end gap-3">
          <Button ref={noButtonRef} variant="outline" onClick={onNo}>
            {noLabel}
          </Button>
          <Button onClick={onYes} disabled={yesDisabled}>
            {yesLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
