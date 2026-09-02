import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type FloatingLabelProps = {
  children: ReactNode;
  htmlFor: string;
  label: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function FloatingLabel({ children, htmlFor, label, className, labelClassName }: FloatingLabelProps) {
  return (
    <div className={cn("floating-label", className)}>
      {children}
      <label htmlFor={htmlFor} className={cn("floating-label-label", labelClassName)}>
        {label}
      </label>
    </div>
  );
}
