import { tv } from "tailwind-variants";

export const preferenceSectionStyles = tv({
  slots: {
    root: "space-y-3 rounded-xl border border-line bg-surface p-4 text-sm sm:p-6",
    heading: "font-display text-xl font-semibold text-ink",
    description: "text-muted",
    trigger:
      "flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-start text-ink focus-visible:outline-2 focus-visible:outline-accent sm:w-64",
    value: "",
    selectedFlag: "",
    selectedIcon: "size-4 shrink-0",
    toggle: "ms-auto",
    toggleIcon: "size-4",
    content:
      "z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-surface p-1 text-sm text-ink shadow-lg",
    viewport: "max-h-[calc(var(--radix-select-content-available-height)-0.5rem)]",
    item: "relative flex cursor-default items-center gap-2 rounded-md py-2 ps-2 pe-8 outline-none data-[highlighted]:bg-accent-hover data-[highlighted]:text-ink",
    optionFlag: "",
    optionIcon: "size-4 shrink-0",
    itemText: "",
    indicator: "absolute end-2",
    check: "size-4",
  },
});
