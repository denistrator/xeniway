import { tv } from "tailwind-variants";
import { compactControlStyles } from "../../../../styles/shared/compact-control-styles";

export const applicationWorkspaceNavigationStyles = tv({
  slots: {
    root: "flex shrink-0 gap-2",
    button: compactControlStyles({ size: "icon" }),
    icon: "size-4 rtl:rotate-180",
  },
});
