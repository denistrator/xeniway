import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const libraryNotes = [
  ["React + Vite", "Render the interface and serve it during development."],
  ["TanStack Query", "Fetch, cache, and invalidate server data."],
  ["Redux Toolkit", "Keep the counter as predictable local client state."],
  ["Elysia + Bun", "Expose a small typed HTTP API on the Bun runtime."],
  ["Zod", "Validate the message at the shared client/server boundary."],
  ["Drizzle + PostgreSQL", "Persist and query messages with a relational database."],
  ["Tailwind + shadcn/ui", "Compose the visual layer from utility classes and primitives."],
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">About this demo</h1>
        <p className="text-lg leading-8 text-slate-600">Each library owns one small, visible piece of the job-tracker flow.</p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>What is demonstrated?</CardTitle>
          <CardDescription>Follow the request from the browser to the database and back.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100">
            {libraryNotes.map(([name, description]) => (
              <li key={name} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
                <span className="font-semibold text-slate-950">{name}</span>
                <span className="text-sm leading-6 text-slate-600">{description}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
