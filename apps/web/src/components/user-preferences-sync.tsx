import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { changeLocale } from "../i18n/i18n";
import { useCurrentUser, useUserPreferences } from "../lib/queries";
import { readLocalUserPreferences, writeLocalUserPreferences } from "../lib/user-preferences";
import { setJobFormPresentation, setTheme } from "../store";

export function UserPreferencesSync() {
  const dispatch = useDispatch();
  const user = useCurrentUser();
  const userId = user.data?.id ?? null;
  const preferences = useUserPreferences(userId);
  const appliedPreferenceKey = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !preferences.data) {
      return;
    }

    const serverPreferences = preferences.data;
    const preferenceKey = JSON.stringify([userId, serverPreferences]);
    if (appliedPreferenceKey.current === preferenceKey) return;
    appliedPreferenceKey.current = preferenceKey;

    let cancelled = false;
    const localPreferences = readLocalUserPreferences();
    if (serverPreferences.selectedTheme) dispatch(setTheme(serverPreferences.selectedTheme));
    if (serverPreferences.selectedFormPresentation)
      dispatch(setJobFormPresentation(serverPreferences.selectedFormPresentation));

    async function applyServerLanguage() {
      if (serverPreferences.selectedLanguage) {
        try {
          await changeLocale(serverPreferences.selectedLanguage);
        } catch {
          return;
        }
      }
      if (cancelled) return;
      const currentPreferences = readLocalUserPreferences();
      writeLocalUserPreferences({
        language:
          currentPreferences.language !== localPreferences.language
            ? currentPreferences.language
            : (serverPreferences.selectedLanguage ?? currentPreferences.language),
        theme:
          currentPreferences.theme !== localPreferences.theme
            ? currentPreferences.theme
            : (serverPreferences.selectedTheme ?? currentPreferences.theme),
        formPresentation:
          currentPreferences.formPresentation !== localPreferences.formPresentation
            ? currentPreferences.formPresentation
            : (serverPreferences.selectedFormPresentation ?? currentPreferences.formPresentation),
        wasIntroduced: serverPreferences.wasIntroduced,
      });
    }

    void applyServerLanguage();
    return () => {
      cancelled = true;
    };
  }, [dispatch, preferences.data, userId]);

  useEffect(() => {
    if (!userId) appliedPreferenceKey.current = null;
  }, [userId]);

  return null;
}
