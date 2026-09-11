import { useTranslation } from "react-i18next";

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-line bg-surface px-6 py-5 text-center text-sm leading-6 text-muted">
      <p>{t("footer.description", { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
