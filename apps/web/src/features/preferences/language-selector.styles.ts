import { tv } from "tailwind-variants";
import { compactControlStyles } from "../../styles/shared/compact-control-styles";
export const languageSelectorStyles = tv({
  slots: {
    root: "relative",
    trigger: compactControlStyles(),
    menu: "absolute end-0 top-full z-30 mt-2 min-w-48 rounded-lg border border-line bg-surface p-2 shadow-lg",
    option:
      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    flag: "",
    optionLabel: "",
  },
  variants: {
    menuPlacement: {
      default: {},
      contained: { menu: "start-0 end-auto max-h-[50dvh] w-max min-w-0 max-w-[calc(100dvw-6rem)] overflow-y-auto" },
    },
  },
});
