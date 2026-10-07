import { useTranslation } from "react-i18next";
import type { JobFormDialogProps } from "./job-form-content.ts";

export function useJobDrawerPresentation({ dialogRef }: JobFormDialogProps) {
  const { t } = useTranslation();
  const closeLabel = t("common.actions.closeDialog");
  const setDialogRef = (element: HTMLDivElement | null) => {
    dialogRef.current = element;
  };
  return { closeLabel, setDialogRef };
}
