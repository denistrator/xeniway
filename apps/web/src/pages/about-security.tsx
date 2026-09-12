import { useTranslation } from "react-i18next";

export function AboutSecurity() {
  const { t } = useTranslation();
  return (
    <section className="rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink">{t("about.securityTitle")}</h2>
        </div>
        <div className="space-y-4 text-sm leading-7 text-muted">
          <p>{t("about.securityOwnership")}</p>
          <p>{t("about.securityCredentials")}</p>
          <p>{t("about.securityAccessibility")}</p>
        </div>
      </div>
    </section>
  );
}
