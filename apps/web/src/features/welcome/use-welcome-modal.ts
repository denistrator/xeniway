import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { WelcomeAction } from "./welcome-modal";

export function useWelcomeModal(onComplete: (action: WelcomeAction) => void) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const complete = useCallback(
    (action: WelcomeAction) => {
      try {
        onComplete(action);
      } catch {
        // Completion is local-first; a background persistence failure is intentionally invisible.
      }
    },
    [onComplete],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        complete("stay");
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest("[role='dialog']");
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      queueMicrotask(() => {
        if (!closeRef.current?.isConnected) document.getElementById("main-content")?.focus();
      });
    };
  }, [complete]);

  return { t, closeRef, complete };
}
