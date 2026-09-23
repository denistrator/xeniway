import { useTranslation } from "react-i18next";

export function WorkspaceDetail({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation();
  return (
    <div>
      <dt className="font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-words text-ink">{value || t("applications.workspace.notProvided")}</dd>
    </div>
  );
}
