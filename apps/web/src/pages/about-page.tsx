import {
  Atom,
  Boxes,
  Braces,
  Database,
  Gauge,
  Inbox,
  Layers,
  type LucideIcon,
  Mail,
  MousePointer2,
  Palette,
  Route,
  Server,
  Shapes,
  ShieldCheck,
  TestTube,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const stackIcons: Record<string, LucideIcon> = {
  React: Atom,
  TypeScript: Braces,
  Vite: Zap,
  "Tailwind CSS v4": Palette,
  "Redux Toolkit": Boxes,
  "TanStack Query": Database,
  "React Router": Route,
  "Lucide React": Shapes,
  Vitest: TestTube,
  Playwright: MousePointer2,
  Bun: Zap,
  Elysia: Server,
  Zod: Braces,
  "Drizzle ORM": Layers,
  PostgreSQL: Database,
  Redis: Gauge,
  Nodemailer: Mail,
  Mailpit: Inbox,
  "Session + CSRF security": ShieldCheck,
};

const capabilities = [
  "capability1",
  "capability2",
  "capability3",
  "capability4",
  "capability5",
  "capability6",
] as const;

const frontendStack = [
  ["React", "react", "https://github.com/facebook/react"],
  ["TypeScript", "typescript", "https://github.com/microsoft/TypeScript"],
  ["Vite", "vite", "https://github.com/vitejs/vite"],
  ["Tailwind CSS v4", "tailwind", "https://github.com/tailwindlabs/tailwindcss"],
  ["Redux Toolkit", "redux", "https://github.com/reduxjs/redux-toolkit"],
  ["TanStack Query", "query", "https://github.com/TanStack/query"],
  ["React Router", "router", "https://github.com/remix-run/react-router"],
  ["Lucide React", "lucide", "https://github.com/lucide-icons/lucide"],
  ["Vitest", "vitest", "https://github.com/vitest-dev/vitest"],
  ["Playwright", "playwright", "https://github.com/microsoft/playwright"],
] as const;

const backendStack = [
  ["Bun", "bun", "https://github.com/oven-sh/bun"],
  ["Elysia", "elysia", "https://github.com/elysiajs/elysia"],
  ["Zod", "zod", "https://github.com/colinhacks/zod"],
  ["Drizzle ORM", "drizzle", "https://github.com/drizzle-team/drizzle-orm"],
  ["PostgreSQL", "postgres", "https://github.com/postgres/postgres"],
  ["Redis", "redis", "https://github.com/redis/redis"],
  ["Nodemailer", "nodemailer", "https://github.com/nodemailer/nodemailer"],
  ["Mailpit", "mailpit", "https://github.com/axllent/mailpit"],
  ["Session + CSRF security", "security"],
  ["Vitest", "apiTests", "https://github.com/vitest-dev/vitest"],
] as const;

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="px-6 text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-12">
          <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            {t("about.heroTitle")}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{t("about.heroDescription")}</p>
        </section>

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

        <section aria-labelledby="stack-title" className="space-y-5">
          <div className="max-w-2xl">
            <h2 id="stack-title" className="font-display text-3xl font-bold tracking-tight text-ink">
              {t("about.stackTitle")}
            </h2>
            <p className="mt-3 leading-7 text-muted">{t("about.stackDescription")}</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <StackBlock
              title={t("about.frontend")}
              description={t("about.frontendDescription")}
              items={frontendStack}
            />
            <StackBlock title={t("about.backend")} description={t("about.backendDescription")} items={backendStack} />
          </div>
        </section>

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
      </div>
    </div>
  );
}

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
        {items.map(([name, description, href]) => {
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
              <dd className="break-words text-sm leading-6 text-muted">{t(`about.stack.${description}`)}</dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
