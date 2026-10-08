import { tv } from "tailwind-variants";
import { dialogBackdropStyles } from "../../../components/ui/surface-styles";

export const jobDrawerStyles = tv({
  slots: {
    root: "fixed inset-0 z-50 bg-overlay",
    backdrop: dialogBackdropStyles(),
    dialog:
      "relative ms-auto flex h-full w-full max-w-xl flex-col overscroll-contain overflow-y-auto border-s border-line bg-surface p-6 shadow-2xl",
  },
});
