import { useDispatch, useSelector } from "react-redux";
import { type RootState, setTheme, type ThemePreference } from "../store";

const options: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
];

export function ThemeSelector() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.ui.theme);
  return (
    <select
      aria-label="Theme"
      className="h-9 rounded-lg border border-line bg-surface px-2 text-xs text-ink"
      value={theme}
      onChange={(event) => dispatch(setTheme(event.target.value as ThemePreference))}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
