import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="px-6 text-ink">
      <section className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">404</p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Page not found</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
          We couldn’t find the page you requested. Return to your applications or learn more about Job Tracker.
        </p>
        <nav aria-label="404 recovery" className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild>
            <Link to="/">Go to applications</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/about">About Job Tracker</Link>
          </Button>
        </nav>
      </section>
    </div>
  );
}
