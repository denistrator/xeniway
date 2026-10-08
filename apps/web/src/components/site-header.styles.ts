import { tv } from "tailwind-variants";

export const siteHeaderStyles = tv({
  slots: {
    navigationLink: "whitespace-nowrap rounded-lg px-3 py-3 text-md transition-colors sm:py-2",
    root: "border-b border-line bg-surface",
    content: "mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6",
    brand: "font-display me-auto text-xl font-bold tracking-tight text-ink",
    navigation: "flex min-w-0 flex-wrap items-center gap-1",
    controls: "flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto",
    account: "flex min-w-0 items-center gap-1 border-line sm:pe-3 xl:border-s xl:ps-4",
    email: "hidden max-w-48 truncate text-sm text-muted sm:block",
    logoutButton: "h-11 sm:h-9",
    logoutText: "sr-only",
    actions: "flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-wrap",
    actionButton: "h-auto min-h-11 min-w-0 whitespace-normal sm:h-9 sm:min-h-0",
    settingsLink:
      "relative inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-9 sm:min-w-0",
    settingsNotice: "absolute -end-1 -top-1 inline-flex rounded-full border border-line bg-surface p-0.5 text-muted",
  },
  variants: {
    active: {
      true: { navigationLink: "bg-accent-soft font-semibold text-accent" },
      false: { navigationLink: "text-muted hover:bg-accent-hover hover:text-accent" },
    },
  },
});
