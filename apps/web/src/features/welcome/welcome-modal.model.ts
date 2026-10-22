import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { trapTabFocus } from "../../lib/trap-tab-focus";
export type WelcomeAction = "stay" | "board" | "about";
export type WelcomeModalProps = { onComplete: (action: WelcomeAction) => void };

export function useWelcomeModal({ onComplete }: WelcomeModalProps) {
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
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        complete("stay");
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = closeRef.current?.closest("[role='dialog']");
      if (!dialog) {
        return;
      }
      trapTabFocus(event, dialog);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      queueMicrotask(() => {
        if (!closeRef.current?.isConnected) {
          document.getElementById("main-content")?.focus();
        }
      });
    };
  }, [complete]);

  const labels = {
    close: t("welcome.close"),
  };
  function handleStay() {
    complete("stay");
  }

  return { t, labels, closeRef, complete, handleStay };
}
