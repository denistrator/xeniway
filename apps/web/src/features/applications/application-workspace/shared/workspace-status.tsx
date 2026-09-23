import { useTranslation } from "react-i18next";

export function WorkspaceStatus({
  section,
  pending,
  status,
}: {
  section: "contacts" | "followUps";
  pending: boolean;
  status: string | null;
}) {
  const { t } = useTranslation();
  return (
    <p
      role={status?.endsWith("Failed") ? "alert" : undefined}
      aria-live="polite"
      className={`mt-3 text-sm ${status?.endsWith("Failed") ? "text-rose-600" : "text-muted"}`}
    >
      {pending
        ? t("applications.workspace.actions.saving")
        : status
          ? t(`applications.workspace.${section}.${status}`)
          : null}
    </p>
  );
}
