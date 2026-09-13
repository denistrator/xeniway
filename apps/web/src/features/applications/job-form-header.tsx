import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import type { JobFormPresentation } from "../../store";

export function JobFormHeader({
  mode,
  presentation,
  onClose,
  onSwitchPresentation,
}: {
  mode: "create" | "edit";
  presentation: JobFormPresentation;
  onClose: () => void;
  onSwitchPresentation: () => void;
}) {
  const { t } = useTranslation();
  const switchLabel =
    presentation === "drawer" ? t("applications.editor.switchToModal") : t("applications.editor.switchToDrawer");
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 id="job-form-title" className="font-display text-2xl font-bold tracking-tight text-ink">
        {mode === "create" ? t("applications.editor.add") : t("applications.editor.edit")}
      </h2>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={switchLabel} title={switchLabel} onClick={onSwitchPresentation}>
          {presentation === "drawer" ? <PanelRightOpen aria-hidden="true" /> : <PanelRightClose aria-hidden="true" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("applications.editor.close")}
          data-dialog-initial-focus
          onClick={onClose}
        >
          ×
        </Button>
      </div>
    </div>
  );
}
