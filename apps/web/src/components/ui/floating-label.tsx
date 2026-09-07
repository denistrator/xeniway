import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type FloatingLabelProps = {
  children: ReactNode;
  htmlFor: string;
  label: ReactNode;
  icon?: LucideIcon;
  className?: string;
  labelClassName?: string;
};

export function FloatingLabel({ children, htmlFor, label, icon: Icon, className, labelClassName }: FloatingLabelProps) {
  return (
    <div className={cn("floating-label", Icon && "floating-label-with-icon", className)}>
      {Icon && <Icon aria-hidden="true" focusable="false" className="floating-label-icon" />}
      {children}
      <label htmlFor={htmlFor} className={cn("floating-label-label", labelClassName)}>
        {label}
      </label>
    </div>
  );
}
