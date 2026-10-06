import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

export function useJobDialog(open: boolean, onClose: () => void, triggerRef?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (open && !wasOpenRef.current) {
      openerRef.current = triggerRef?.current?.isConnected
        ? triggerRef.current
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>("[data-dialog-initial-focus]");
      (initialFocus ?? dialogRef.current)?.focus();
    } else if (!open && wasOpenRef.current) {
      openerRef.current?.focus();
      openerRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeConfirmation = dialogRef.current?.querySelector<HTMLElement>("[role='alertdialog']");
      if (event.key === "Escape") {
        if (activeConfirmation) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        (activeConfirmation ?? dialogRef.current).querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return dialogRef;
}
