import { tv } from "tailwind-variants";

export const siteHeaderStyles = tv({
  slots: {
    navigationLink: "rounded-lg px-3 py-2 text-md transition-colors",
    root: "border-b border-line bg-surface",
    content: "mx-auto flex max-w-7xl flex-wrap items-center px-6 py-4",
    brand: "font-display me-auto text-xl font-bold tracking-tight text-ink",
    navigation: "flex items-center gap-1 px-3",
    controls: "flex items-center gap-4",
    account: "flex items-center lg:border-x border-line ps-6 pe-3",
    email: "hidden text-sm text-muted sm:block",
    logoutButton: "ms-1",
    logoutText: "sr-only",
    actions: "ms-2 flex items-center gap-2",
    settingsLink:
      "relative inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-2.5 text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    settingsNotice: "absolute -end-1 -top-1 inline-flex rounded-full border border-line bg-surface p-0.5 text-muted",
  },
  variants: {
    active: {
      true: { navigationLink: "bg-accent-soft font-semibold text-accent" },
      false: { navigationLink: "text-muted hover:bg-accent-hover hover:text-accent" },
    },
  },
});
