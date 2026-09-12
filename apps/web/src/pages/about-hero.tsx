import { useTranslation } from "react-i18next";

export function AboutHero() {
  const { t } = useTranslation();
  return (
    <section className="rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-12">
      <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
        {t("about.heroTitle")}
      </h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{t("about.heroDescription")}</p>
    </section>
  );
}
