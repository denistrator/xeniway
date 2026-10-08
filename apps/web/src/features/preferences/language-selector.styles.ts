import { tv } from "tailwind-variants";
import { compactControlStyles } from "../../components/ui/compact-control-styles";
export const languageSelectorStyles = tv({
  slots: {
    root: "relative",
    trigger: compactControlStyles({ class: "h-11 min-w-11 justify-center sm:h-9 sm:min-w-0" }),
    menu: "absolute end-0 top-full z-30 mt-2 min-w-48 rounded-lg border border-line bg-surface p-2 shadow-lg",
    option:
      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    flag: "",
    optionLabel: "",
  },
});
