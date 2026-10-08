import { tv } from "tailwind-variants";
import { compactControlStyles } from "../../../../components/ui/compact-control-styles";

export const applicationWorkspaceNavigationStyles = tv({
  slots: {
    root: "flex shrink-0 gap-2",
    button: compactControlStyles({ className: "w-9 px-0" }),
    icon: "size-4 rtl:rotate-180",
  },
});
