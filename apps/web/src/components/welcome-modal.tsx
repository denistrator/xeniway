import { X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./language-selector";
import { Button } from "./ui/button";

export type WelcomeAction = "stay" | "board" | "about";

export function WelcomeModal({ onComplete }: { onComplete: (action: WelcomeAction) => void }) {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4">
      <button
        type="button"
        aria-label={t("welcome.close")}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={() => complete("stay")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
        className="relative w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-center justify-between gap-4">
          <LanguageSelector />
          <button
            ref={closeRef}
            type="button"
            aria-label={t("welcome.close")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-accent-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => complete("stay")}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <div className="mt-6">
          <h2 id="welcome-title" className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("welcome.title")}
          </h2>
          <p id="welcome-description" className="mt-4 text-base leading-7 text-muted">
            {t("welcome.introduction")}
          </p>
          <p className="mt-3 text-base leading-7 text-muted">{t("welcome.features")}</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => complete("about")}>
            {t("welcome.about")}
          </Button>
          <Button onClick={() => complete("board")}>{t("welcome.goToBoard")}</Button>
        </div>
      </div>
    </div>
  );
}
