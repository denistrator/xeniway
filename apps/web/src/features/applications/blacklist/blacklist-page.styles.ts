import { tv } from "tailwind-variants";

export const blacklistPageStyles = tv({
  slots: {
    reason: "break-words rounded-lg bg-surface-tint p-3 text-sm leading-6 text-ink",
    blacklistedDate: "mt-2 text-sm leading-6 text-muted",
  },
});
