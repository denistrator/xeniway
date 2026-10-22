import { tv } from "tailwind-variants";

export const exportSettingsSectionStyles = tv({
  slots: {
    root: "space-y-3 rounded-xl border border-line bg-surface p-4 text-sm sm:p-6",
    heading: "font-display text-xl font-semibold text-ink",
    description: "text-muted",
    limitation: "text-muted",
    unavailableNotice: "text-muted",
    actions: "flex flex-wrap items-center gap-2",
  },
});
