import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";

const floatingLabelStyles = tv({
  slots: {
    root: "floating-label",
    icon: "floating-label-icon",
    label: "floating-label-label",
  },
  variants: { withIcon: { true: { root: "floating-label-with-icon" } } },
});

export type FloatingLabelProps = {
  children: ReactNode;
  htmlFor: string;
  label: ReactNode;
  icon?: LucideIcon;
  className?: string;
  labelClassName?: string;
};

export function FloatingLabel({ children, htmlFor, label, icon: Icon, className, labelClassName }: FloatingLabelProps) {
  const styles = floatingLabelStyles({ withIcon: Boolean(Icon) });
  return (
    <div className={styles.root({ className })}>
      {Icon && <Icon aria-hidden="true" focusable="false" className={styles.icon()} />}
      {children}
      <label htmlFor={htmlFor} className={styles.label({ className: labelClassName })}>
        {label}
      </label>
    </div>
  );
}
