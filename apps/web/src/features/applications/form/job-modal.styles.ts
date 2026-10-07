import { tv } from "tailwind-variants";
import { dialogBackdropStyles } from "../../../components/ui/surface-styles.ts";

export const jobModalStyles = tv({
  slots: {
    root: "fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3",
    backdrop: dialogBackdropStyles(),
    dialog:
      "job-modal relative flex h-[calc(100vh-24px)] max-h-[calc(100vh-24px)] w-full flex-col overscroll-contain overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl md:h-[90vh] md:w-[70vw] md:max-w-6xl",
  },
});
