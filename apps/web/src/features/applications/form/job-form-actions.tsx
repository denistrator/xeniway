import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";

export function JobFormActions({ submitting }: { submitting: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? t("applications.form.saving") : t("applications.form.save")}
      </Button>
    </div>
  );
}
