import { type RefObject, useEffect, useRef } from "react";

export function useReturnFocus(open: boolean, fallback?: RefObject<HTMLElement | null>) {
  const trigger = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    if (wasOpen.current && !open) {
      const target = trigger.current?.isConnected ? trigger.current : fallback?.current;
      if (target?.matches(":disabled")) (target.closest("section") ?? fallback?.current)?.focus();
      else target?.focus();
      trigger.current = null;
    }
    wasOpen.current = open;
  }, [open, fallback]);

  return (element: HTMLElement) => {
    trigger.current = element;
  };
}
