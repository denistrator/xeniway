import { tv } from "tailwind-variants";

// Shared appearance and interaction states for small buttons and navigation links.
// Component recipes retain their own spacing, icons, badges, and positioning.
export const compactControlStyles = tv({
  base: [
    "inline-flex items-center justify-center rounded-lg border",
    "text-xs font-semibold transition-colors",
    "hover:bg-accent-hover",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    variant: {
      default: "border-line bg-surface text-ink",
      logout: "border-transparent text-muted",
    },
    size: {
      header: "h-11 min-w-11 px-2.5 sm:h-9 sm:min-w-0",
      icon: "h-9 w-9 min-w-9 px-0",
    },
  },
  defaultVariants: { variant: "default", size: "header" },
});
