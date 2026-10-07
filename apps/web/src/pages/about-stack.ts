import { useTranslation } from "react-i18next";
import { backendStack, frontendStack, stackIcons } from "./about-page-data";

export type StackBlockProps = {
  title: string;
  description: string;
  items: readonly (readonly [string, string, string?])[];
};

export function useStackBlock(items: StackBlockProps["items"]) {
  const { t } = useTranslation();
  return items.map(([name, key, href]) => ({
    name,
    href,
    Icon: stackIcons[name],
    description: t(`about.stack.${key}`),
  }));
}

export function useAboutStack() {
  const { t } = useTranslation();
  return {
    title: t("about.stackTitle"),
    description: t("about.stackDescription"),
    blocks: [
      { id: "frontend", title: t("about.frontend"), description: t("about.frontendDescription"), items: frontendStack },
      { id: "backend", title: t("about.backend"), description: t("about.backendDescription"), items: backendStack },
    ],
  };
}
