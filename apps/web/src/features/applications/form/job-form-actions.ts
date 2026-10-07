import { useTranslation } from "react-i18next";
import { useCanMutate } from "../../offline/offline-access.tsx";

export type JobFormActionsProps = { submitting: boolean };

export function useJobFormActionsPresentation({ submitting }: JobFormActionsProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const savingLabel = submitting ? t("applications.form.saving") : t("applications.form.save");
  return { canMutate, savingLabel };
}
