import { type FocusEvent, useEffect, useLayoutEffect, useRef } from "react";

export function useInlineEditFocus<Container extends HTMLElement, InputElement extends HTMLElement>(
  editing: boolean,
  restoreFocus = true,
  canMutate = true,
) {
  const container = useRef<Container>(null);
  const input = useRef<InputElement>(null);
  const wasEditing = useRef(false);
  const focusedElement = useRef<HTMLElement | null>(null);
  const readOnlyCancel = useRef<HTMLButtonElement>(null);

  function onFocusCapture(event: FocusEvent<Container>) {
    if (event.target instanceof HTMLElement) {
      focusedElement.current = event.target;
    }
  }

  useLayoutEffect(() => {
    if (
      editing &&
      focusedElement.current &&
      !focusedElement.current.isConnected &&
      document.activeElement === document.body
    ) {
      const target = canMutate ? input.current : (readOnlyCancel.current ?? input.current);
      target?.focus();
    }
  }, [canMutate, editing]);

  useEffect(() => {
    if (editing) {
      wasEditing.current = true;
      input.current?.focus();
    } else if (wasEditing.current) {
      if (restoreFocus) {
        const target = container.current?.querySelector<HTMLButtonElement>("button[aria-label]") ?? container.current;
        target?.focus();
      }
      wasEditing.current = false;
    }
  }, [editing, restoreFocus]);

  return { container, input, readOnlyCancel, onFocusCapture };
}
