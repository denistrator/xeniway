import { tv } from "tailwind-variants";

export const aboutWorkflowStyles = tv({
  slots: {
    root: "border-y border-line py-8 sm:py-10",
    heading: "font-display text-3xl font-bold tracking-tight text-ink",
    description: "mt-3 max-w-3xl leading-7 text-muted",
    stages: "mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
    stage: "border-s-2 border-accent-soft ps-4",
    stageHeading: "font-semibold text-ink",
    stageText: "mt-2 text-sm leading-6 text-muted",
    statusHeading: "mt-8 text-sm font-semibold text-ink",
    statuses: "mt-3 flex list-none flex-wrap gap-2 p-0",
    status: "rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink",
    note: "mt-3 max-w-3xl text-sm leading-6 text-muted",
  },
});
