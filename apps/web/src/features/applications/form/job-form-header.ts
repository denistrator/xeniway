import { useTranslation } from "react-i18next";
import type { JobFormPresentation } from "../../../store.ts";

export type JobFormHeaderProps = {
  presentation: JobFormPresentation;
  onClose: () => void;
  onSwitchPresentation: () => void;
};

export function useJobFormHeaderPresentation({ presentation }: JobFormHeaderProps) {
  const { t } = useTranslation();
  const switchLabel =
    presentation === "drawer" ? t("applications.editor.switchToModal") : t("applications.editor.switchToDrawer");
  const addLabel = t("applications.editor.add");
  const closeLabel = t("applications.editor.close");
  return { switchLabel, addLabel, closeLabel };
}
