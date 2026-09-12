import { useWelcomeModal } from "./use-welcome-modal";
import { WelcomeModalContent } from "./welcome-modal-content";

export type WelcomeAction = "stay" | "board" | "about";

export function WelcomeModal({ onComplete }: { onComplete: (action: WelcomeAction) => void }) {
  const { t, closeRef, complete } = useWelcomeModal(onComplete);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4">
      <button
        type="button"
        aria-label={t("welcome.close")}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={() => complete("stay")}
      />
      <WelcomeModalContent t={t} closeRef={closeRef} complete={complete} />
    </div>
  );
}
