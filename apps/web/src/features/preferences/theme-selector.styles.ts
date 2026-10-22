import { tv } from "tailwind-variants";
import { compactControlStyles } from "../../styles/shared/compact-control-styles";
export const themeSelectorStyles = tv({
  slots: {
    root: "relative",
    button: compactControlStyles({ className: "gap-1.5" }),
  },
});
