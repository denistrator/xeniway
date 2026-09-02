import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-16">
        <header className="flex items-center justify-between">
          <Link to="/about" className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            Job Tracker
          </Link>
          <nav className="flex items-center gap-2" aria-label="About navigation">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Create an account
            </Link>
          </nav>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-sky-700">For focused job searches</p>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Keep your job search moving
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
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
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800">
      <h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
    </article>
  );
}
