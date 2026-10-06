import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { useCanMutate } from "../../offline/offline-access";

export function JobFormActions({ submitting }: { submitting: boolean }) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={submitting || !canMutate}>
        {submitting ? t("applications.form.saving") : t("applications.form.save")}
      </Button>
    </div>
  );
}
