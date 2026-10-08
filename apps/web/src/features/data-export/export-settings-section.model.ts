import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useOfflineAccess } from "../offline/offline-access.model";

export function useExportSettingsSection() {
  const { t } = useTranslation();
  const access = useOfflineAccess();
  const headingId = useId();
  return {
    visible: access.readAccountId !== null,
    unavailable: !access.canMutate,
    headingId,
    title: t("settings.export.title"),
    description: t("settings.export.description"),
    unavailableNotice: t("settings.export.unavailable"),
  };
}
