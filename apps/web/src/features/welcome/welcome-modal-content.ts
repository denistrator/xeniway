import type { RefObject } from "react";
import type { WelcomeAction } from "./welcome-modal.ts";
export type WelcomeModalContentProps = {
  t: (key: string) => string;
  closeRef: RefObject<HTMLButtonElement | null>;
  complete: (action: WelcomeAction) => void;
};

export function useWelcomeModalContent({ t, complete }: Pick<WelcomeModalContentProps, "t" | "complete">) {
  const labels = {
    close: t("welcome.close"),
    title: t("welcome.title"),
    introduction: t("welcome.introduction"),
    features: t("welcome.features"),
    about: t("welcome.about"),
    goToBoard: t("welcome.goToBoard"),
  };
  function handleStay() {
    complete("stay");
  }
  function handleAbout() {
    complete("about");
  }
  function handleBoard() {
    complete("board");
  }

  return { labels, handleStay, handleAbout, handleBoard };
}
