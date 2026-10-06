import { tv } from "tailwind-variants";

export const emptyStateStyles = tv({
  base: "rounded-xl border border-dashed border-line p-5 text-sm text-muted",
  variants: { page: { true: "rounded-2xl p-12 text-center leading-6" } },
});

export const dialogBackdropStyles = tv({ base: "absolute inset-0 h-full w-full cursor-default" });
export const collectionActionStyles = tv({
  base: "rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover focus-visible:outline-2",
});

export const editorFormStyles = tv({
  base: "mt-4 space-y-4 rounded-xl border border-line bg-surface-tint p-4",
});
