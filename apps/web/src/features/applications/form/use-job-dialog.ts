import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { trapTabFocus } from "../../../lib/trap-tab-focus";

export function useJobDialog(open: boolean, onClose: () => void, triggerRef?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (open && !wasOpenRef.current) {
      if (triggerRef?.current?.isConnected) {
        openerRef.current = triggerRef.current;
      } else if (document.activeElement instanceof HTMLElement) {
        openerRef.current = document.activeElement;
      } else {
        openerRef.current = null;
      }
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>("[data-dialog-initial-focus]");
      (initialFocus ?? dialogRef.current)?.focus();
    } else if (!open && wasOpenRef.current) {
      openerRef.current?.focus();
      openerRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeConfirmation = dialogRef.current?.querySelector<HTMLElement>("[role='alertdialog']");
      if (event.key === "Escape") {
        if (activeConfirmation) {
          return;
        }
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }
      trapTabFocus(event, activeConfirmation ?? dialogRef.current);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return dialogRef;
}
