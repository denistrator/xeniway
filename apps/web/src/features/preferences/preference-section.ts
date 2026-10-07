import type { LucideIcon } from "lucide-react";
import { useId } from "react";

export interface PreferenceOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  flag?: string;
}

export interface PreferenceSectionProps {
  title: string;
  description: string;
  name: string;
  value: string;
  options: PreferenceOption[];
  onValueChange: (value: string) => void;
  dir: "ltr" | "rtl";
}

export function usePreferenceSection(props: PreferenceSectionProps) {
  const id = useId();
  const selected = props.options.find((option) => option.value === props.value);
  return { headingId: `${id}-heading`, descriptionId: `${id}-description`, selected };
}
