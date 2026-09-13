import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";

export function JobFormActions({
  submitting,
  hasJob,
  blacklistOpen,
  onOpenBlacklist,
  onArchive,
}: {
  submitting: boolean;
  hasJob: boolean;
  blacklistOpen: boolean;
  onOpenBlacklist: () => void;
  onArchive?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={submitting}>
        {submitting ? t("applications.form.saving") : t("applications.form.save")}
      </Button>
      {hasJob && !blacklistOpen && (
        <Button type="button" variant="outline" onClick={onOpenBlacklist}>
          {t("applications.form.blacklist")}
        </Button>
      )}
      {hasJob && onArchive && (
        <Button type="button" variant="outline" onClick={onArchive}>
          {t("applications.form.archive")}
        </Button>
      )}
    </div>
  );
}
