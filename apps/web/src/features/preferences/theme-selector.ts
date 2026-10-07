import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { writeLocalUserPreferences } from "../../lib/user-preferences";
import { type RootState, setTheme, type ThemePreference } from "../../store";
import { useCanMutate } from "../offline/offline-access.ts";

export const themeOptions: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

export function nextThemePreference(theme: ThemePreference): ThemePreference {
  const currentIndex = themeOptions.findIndex((option) => option.value === theme);
  return themeOptions[(currentIndex + 1) % themeOptions.length].value;
}

export function useThemePreference() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const user = useCurrentUser();
  const canMutate = useCanMutate();
  const updatePreferences = useUpdateUserPreferences();

  const changeTheme = (nextTheme: ThemePreference) => {
    dispatch(setTheme(nextTheme));
    writeLocalUserPreferences({ theme: nextTheme });
    if (user.data && canMutate) {
      updatePreferences.mutate({ selectedTheme: nextTheme });
    }
  };

  return { theme, changeTheme };
}

export function useThemeSelector() {
  const { theme, changeTheme } = useThemePreference();
  const currentOption = themeOptions.find((option) => option.value === theme) ?? themeOptions[1];
  const CurrentIcon = currentOption.icon;
  const handleChange = () => changeTheme(nextThemePreference(theme));
  const label = `Theme: ${currentOption.label}. Change theme`;
  return { CurrentIcon, handleChange, label };
}
