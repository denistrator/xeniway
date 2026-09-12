import { useTranslation } from "react-i18next";
import { backendStack, frontendStack, stackIcons } from "./about-page-data";

function StackBlock({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: readonly (readonly [string, string, string?])[];
}) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h3 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <dl className="mt-6 divide-y divide-line">
        {items.map(([name, key, href]) => {
          const Icon = stackIcons[name];
          return (
            <div
              key={name}
              className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(9rem,0.7fr)_1.3fr] sm:gap-4"
            >
              <dt className="flex items-center gap-2 font-semibold text-ink">
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} className="shrink-0 text-accent" />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-accent/60 underline-offset-4 hover:decoration-accent"
                  >
                    {name}
                  </a>
                ) : (
                  name
                )}
              </dt>
              <dd className="break-words text-sm leading-6 text-muted">{t(`about.stack.${key}`)}</dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}

export function AboutStack() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="stack-title" className="space-y-5">
      <div className="max-w-2xl">
        <h2 id="stack-title" className="font-display text-3xl font-bold tracking-tight text-ink">
          {t("about.stackTitle")}
        </h2>
        <p className="mt-3 leading-7 text-muted">{t("about.stackDescription")}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <StackBlock title={t("about.frontend")} description={t("about.frontendDescription")} items={frontendStack} />
        <StackBlock title={t("about.backend")} description={t("about.backendDescription")} items={backendStack} />
      </div>
    </section>
  );
}
