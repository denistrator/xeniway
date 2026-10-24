import { tv } from "tailwind-variants";

export const applicationWorkspaceContentStyles = tv({
  slots: {
    root: "mx-auto w-full min-w-0 max-w-7xl space-y-5 px-4 pb-12 sm:px-6",
    columns: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]",
    details: "min-w-0 space-y-5",
    activity: "workspace-activity mt-0 min-w-0 self-start rounded-2xl border bg-surface p-5",
  },
});
