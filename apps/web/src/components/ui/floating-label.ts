import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { floatingLabelStyles } from "./floating-label.styles";

export type FloatingLabelProps = {
  children: ReactNode;
  htmlFor: string;
  label: ReactNode;
  icon?: LucideIcon;
  className?: string;
  labelClassName?: string;
};

export function getFloatingLabelView({ icon, className, labelClassName }: FloatingLabelProps) {
  const styles = floatingLabelStyles({ withIcon: Boolean(icon) });
  return {
    rootClassName: styles.root({ className }),
    labelClassName: styles.label({ className: labelClassName }),
    iconClassName: styles.icon(),
  };
}
