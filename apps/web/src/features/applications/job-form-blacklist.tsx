import { StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { FloatingLabel } from "../../components/ui/floating-label";

export function JobFormBlacklist({
  reason,
  blacklisting,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  reason: string;
  blacklisting: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-t border-line pt-5">
      <div className="space-y-3">
        <FloatingLabel htmlFor="job-blacklist-reason" label={t("applications.form.reason")} icon={StickyNote}>
          <textarea
            id="job-blacklist-reason"
            className="peer min-h-24"
            name="blacklistReason"
            placeholder=" "
            maxLength={1000}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </FloatingLabel>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("applications.form.cancel")}
          </Button>
          <Button type="button" variant="outline" onClick={onConfirm} disabled={blacklisting}>
            {blacklisting ? t("applications.form.blacklisting") : t("applications.form.confirmBlacklist")}
          </Button>
        </div>
      </div>
    </div>
  );
}
