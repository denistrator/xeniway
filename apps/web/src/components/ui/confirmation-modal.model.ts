import { useEffect, useRef } from "react";

export type ConfirmationModalProps = {
  title: string;
  text?: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
  yesDisabled?: boolean;
};

export function useConfirmationModal(onNo: () => void) {
  const noButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    noButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onNo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onNo]);
  return { noButtonRef };
}
