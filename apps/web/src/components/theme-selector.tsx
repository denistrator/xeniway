import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState, setTheme, type ThemePreference } from "../store";

const options: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

export function nextThemePreference(theme: ThemePreference): ThemePreference {
  const currentIndex = options.findIndex((option) => option.value === theme);
  return options[(currentIndex + 1) % options.length].value;
}

export function ThemeSelector() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const currentOption = options.find((option) => option.value === theme) ?? options[1];
  const CurrentIcon = currentOption.icon;

  const changeTheme = (nextTheme: ThemePreference) => dispatch(setTheme(nextTheme));

  return (
    <button
      aria-label={`Theme: ${currentOption.label}. Change theme`}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={() => changeTheme(nextThemePreference(theme))}
      type="button"
    >
      <CurrentIcon aria-hidden="true" size={15} strokeWidth={2} />
    </button>
  );
}
