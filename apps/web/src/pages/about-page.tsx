export function AboutPage() {
  return (
    <div className="px-6 text-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-16">
        <section className="rounded-3xl border border-line bg-surface p-8 shadow-sm sm:p-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">For focused job searches</p>
          <h1 className="font-display max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Keep your job search moving
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Job Tracker gives candidates one clear place to follow every application, conversation, and next step with a
            potential employer.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Feature title="See the full picture" text="Keep opportunities organized across six simple stages." />
            <Feature title="Stay ready" text="Capture contacts, notes, dates, and follow-up reminders." />
            <Feature title="Learn from the search" text="Archive old applications without losing your history." />
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-line bg-accent-soft p-5">
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </article>
  );
}
