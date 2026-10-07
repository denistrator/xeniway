import { tv } from "tailwind-variants";

export const applicationWorkspaceHeaderStyles = tv({
  slots: {
    position: "text-sm font-semibold uppercase tracking-wide text-muted",
    company: "break-words font-display text-3xl font-bold tracking-tight text-ink focus-visible:outline-2",
    jobLink: "text-accent underline",
    root: "space-y-5",
    navigation: "flex items-center justify-between gap-3",
    backLink:
      "inline-flex rounded-lg text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2",
    summary: "grid items-end gap-5 lg:grid-cols-[minmax(0,1fr)_auto]",
    heading: "",
    actions: "grid gap-2 lg:justify-items-end lg:self-center",
    metadata:
      "workspace-metadata grid gap-4 rounded-2xl border border-line bg-surface p-5 text-sm sm:grid-cols-2 lg:grid-cols-4",
  },
});
