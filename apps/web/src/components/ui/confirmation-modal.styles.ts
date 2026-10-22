import { tv } from "tailwind-variants";
import { dialogBackdropStyles } from "../../styles/shared/surface-styles";

export const confirmationModalStyles = tv({
  slots: {
    root: "fixed inset-0 z-[70] flex items-center justify-center bg-overlay p-4",
    backdrop: dialogBackdropStyles(),
    dialog: "relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8",
    heading: "font-display text-2xl font-bold tracking-tight text-ink",
    text: "mt-3 text-base leading-7 text-muted",
    error: "mt-3 text-sm text-rose-600 dark:text-rose-400",
    actions: "mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end",
  },
});
