import { tv } from "tailwind-variants";

export const welcomeModalStyles = tv({
  slots: {
    overlay: "fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4",
    backdrop: "absolute inset-0 h-full w-full cursor-default",
  },
});
