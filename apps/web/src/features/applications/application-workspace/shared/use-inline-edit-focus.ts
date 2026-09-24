import { useEffect, useRef } from "react";

export function useInlineEditFocus<Container extends HTMLElement, InputElement extends HTMLElement>(
  editing: boolean,
  restoreFocus = true,
) {
  const container = useRef<Container>(null);
  const input = useRef<InputElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (editing) {
      wasEditing.current = true;
      input.current?.focus();
    } else if (wasEditing.current) {
      if (restoreFocus) container.current?.querySelector<HTMLButtonElement>("button[aria-label]")?.focus();
      wasEditing.current = false;
    }
  }, [editing, restoreFocus]);

  return { container, input };
}
