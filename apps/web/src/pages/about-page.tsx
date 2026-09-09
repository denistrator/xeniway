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
  {
    title: "Track every opportunity",
    text: "Capture the company, position, location, salary, job link, notes, and important dates for each application.",
  },
  {
    title: "See your progress",
    text: "Move applications through six stages: Saved, Applied, Interview, Offer, Rejected, and Withdrawn.",
  },
  {
    title: "Stay focused",
    text: "Search your opportunities, filter visible status columns, and reorder work with drag-and-drop or keyboard controls.",
  },
  {
    title: "Keep a clean history",
    text: "Archive finished opportunities, restore them later, or permanently delete archived records when they are no longer useful.",
  },
  {
    title: "Avoid dead ends",
    text: "Blacklist employers you do not want to pursue and leave a reason so the decision remains clear later.",
  },
  {
    title: "Work comfortably",
    text: "Use the responsive workspace in light, dark, or system theme with the same workflows across desktop and mobile.",
  },
];

const frontendStack = [
  ["React", "Component-based interface and shared application workflows.", "https://github.com/facebook/react"],
  ["TypeScript", "Typed UI, state, API boundaries, and shared data models.", "https://github.com/microsoft/TypeScript"],
  ["Vite", "Fast development server and production SPA build pipeline.", "https://github.com/vitejs/vite"],
  [
    "Tailwind CSS v4",
    "CSS-first design tokens, responsive layouts, and theme-aware styles.",
    "https://github.com/tailwindlabs/tailwindcss",
  ],
  [
    "Redux Toolkit",
    "Local UI state for filters, theme preference, and job-manager presentation.",
    "https://github.com/reduxjs/redux-toolkit",
  ],
  [
    "TanStack Query",
    "Server-state caching, authentication restoration, mutations, and invalidation.",
    "https://github.com/TanStack/query",
  ],
  [
    "React Router",
    "Public, guest-only, protected, archive, blacklist, and fallback routes.",
    "https://github.com/remix-run/react-router",
  ],
  [
    "Lucide React",
    "Consistent interface icons with semantic labels for accessible controls.",
    "https://github.com/lucide-icons/lucide",
  ],
  ["Vitest", "Focused component and client tests.", "https://github.com/vitest-dev/vitest"],
  ["Playwright", "Complete browser workflows with axe coverage.", "https://github.com/microsoft/playwright"],
] as const;

const backendStack = [
  [
    "Bun",
    "JavaScript runtime, package manager, scripts, and development server runtime.",
    "https://github.com/oven-sh/bun",
  ],
  [
    "Elysia",
    "Typed HTTP API with injectable dependencies and separated route modules.",
    "https://github.com/elysiajs/elysia",
  ],
  [
    "Zod",
    "Shared runtime validation for authentication, applications, errors, and responses.",
    "https://github.com/colinhacks/zod",
  ],
  [
    "Drizzle ORM",
    "Typed PostgreSQL schema, migrations, queries, and repository persistence.",
    "https://github.com/drizzle-team/drizzle-orm",
  ],
  [
    "PostgreSQL",
    "Authoritative storage for users, sessions, password-reset tokens, and owned job applications.",
    "https://github.com/postgres/postgres",
  ],
  [
    "Redis",
    "Short-lived distributed rate-limit counters for authentication and password reset.",
    "https://github.com/redis/redis",
  ],
  ["Nodemailer", "SMTP transport used to deliver password-reset emails.", "https://github.com/nodemailer/nodemailer"],
  [
    "Mailpit",
    "Local SMTP inbox for safely inspecting password-reset emails during development.",
    "https://github.com/axllent/mailpit",
  ],
  [
    "Session + CSRF security",
    "HttpOnly session cookies, server-side CSRF tokens, Argon2id passwords, and ownership checks.",
  ],
  [
    "Vitest",
    "Focused tests for contracts, repositories, authentication, routes, validation, and ownership isolation.",
    "https://github.com/vitest-dev/vitest",
  ],
] as const;

export function AboutPage() {
  return (
    <div className="px-6 text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">About Job Tracker</p>
          <h1 className="font-display max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            A clear workspace for a complicated job search.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">
            Job Tracker helps candidates keep track of every conversation with a potential employer, from the first
            saved opportunity to the final outcome. It gives each application a place, a status, useful context, and a
            next step.
          </p>
        </section>

        <section aria-labelledby="capabilities-title">
          <div className="mb-5 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">The workspace</p>
            <h2 id="capabilities-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
              Everything needed to keep momentum.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <article key={capability.title} className="rounded-2xl border border-line bg-accent-soft p-5">
                <h3 className="font-semibold text-ink">{capability.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink">{capability.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="stack-title" className="space-y-5">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Built as one typed system</p>
            <h2 id="stack-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
              A modern frontend and a focused API working together.
            </h2>
            <p className="mt-3 leading-7 text-muted">
              The browser and server share their contracts, so validation and response shapes stay consistent from the
              form to the database.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <StackBlock title="Frontend" description="The candidate-facing React workspace." items={frontendStack} />
            <StackBlock
              title="Backend"
              description="The authenticated API and persistence layer."
              items={backendStack}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Trust and ownership</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Your search stays yours.</h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-muted">
              <p>
                Every application belongs to an authenticated user. Repository operations are scoped by that owner, so
                one candidate cannot read or change another candidate&apos;s records.
              </p>
              <p>
                Passwords are hashed with Argon2id. Sessions use HttpOnly cookies, mutations require a server-issued
                CSRF token, and Redis protects authentication and password-reset requests from repeated attempts without
                storing application data.
              </p>
              <p>
                The interface is designed for keyboard access, responsive layouts, visible focus, managed dialogs, live
                async states, and reduced motion preferences.
              </p>
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
  return (
    <article className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
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
                  <a href={href} target="_blank" rel="noreferrer noopener">
                    {name}
                  </a>
                ) : (
                  name
                )}
              </dt>
              <dd className="break-words text-sm leading-6 text-muted">{description}</dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
