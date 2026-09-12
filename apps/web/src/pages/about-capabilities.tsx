import { useTranslation } from "react-i18next";
import { capabilities } from "./about-page-data";

export function AboutCapabilities() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="capabilities-title">
      <div className="mb-5 max-w-2xl">
        <h2 id="capabilities-title" className="font-display text-3xl font-bold tracking-tight text-ink">
          {t("about.capabilitiesTitle")}
        </h2>
      </div>
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr]">
        {capabilities.map((capability, index) => (
          <article key={capability} className="border-t border-line pt-4">
            <h3 className="font-semibold text-ink">{t(`about.capability${index + 1}Title`)}</h3>
            <p className="mt-2 text-sm leading-6 text-ink">{t(`about.capability${index + 1}Text`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
