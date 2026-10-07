import { type FloatingLabelProps, getFloatingLabelView } from "./floating-label.ts";

export type { FloatingLabelProps } from "./floating-label.ts";

export function FloatingLabel(props: FloatingLabelProps) {
  const view = getFloatingLabelView(props);
  const { children, htmlFor, label, icon: Icon } = props;
  return (
    <div className={view.rootClassName}>
      {Icon && <Icon aria-hidden="true" focusable="false" className={view.iconClassName} />}
      {children}
      <label htmlFor={htmlFor} className={view.labelClassName}>
        {label}
      </label>
    </div>
  );
}
