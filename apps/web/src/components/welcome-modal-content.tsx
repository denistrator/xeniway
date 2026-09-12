import { X } from "lucide-react";
import type { RefObject } from "react";
import { LanguageSelector } from "./language-selector";
import { Button } from "./ui/button";
import type { WelcomeAction } from "./welcome-modal";

export function WelcomeModalContent({
  t,
  closeRef,
  complete,
}: {
  t: (key: string) => string;
  closeRef: RefObject<HTMLButtonElement | null>;
  complete: (action: WelcomeAction) => void;
}) {
  return (
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
  );
}
