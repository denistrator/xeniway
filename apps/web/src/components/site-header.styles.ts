import { tv } from "tailwind-variants";
import { compactControlStyles } from "../styles/shared/compact-control-styles";

export const siteHeaderStyles = tv({
  slots: {
    navigationLink: "whitespace-nowrap rounded-lg px-3 py-3 text-md transition-colors sm:py-2",
    root: "border-b border-line bg-surface",
    content: "mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6",
    brand: "font-display me-auto text-xl font-bold tracking-tight text-ink",
    navigation: "flex w-full min-w-0 flex-wrap items-center gap-1 xl:order-1 xl:w-auto",
    controls: "flex w-full min-w-0 flex-wrap items-center gap-2 xl:order-3 xl:w-auto",
    account: "flex min-w-0 items-center gap-1 xl:order-2 xl:ms-auto",
    email: "max-w-24 truncate text-xs text-muted sm:max-w-48 sm:text-sm",
    logoutButton: compactControlStyles({ variant: "logout" }),
    logoutText: "sr-only",
    actions: "flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto",
    actionButton: "h-auto min-h-11 min-w-0 whitespace-normal sm:h-9 sm:min-h-0",
    preferences: "relative flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-accent",
    settingsLink: compactControlStyles({ className: "relative" }),
    settingsNotice: "absolute -end-1 -top-1 inline-flex rounded-full border border-line bg-surface p-0.5 text-muted",
  },
  variants: {
    active: {
      true: { navigationLink: "bg-accent-soft font-semibold text-accent" },
      false: { navigationLink: "text-muted hover:bg-accent-hover hover:text-accent" },
    },
  },
});
