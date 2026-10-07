import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { changeLocale } from "../../i18n/i18n";
import { useCurrentUser, useUserPreferences } from "../../lib/queries";
import { readLocalUserPreferences, writeLocalUserPreferences } from "../../lib/user-preferences";
import { setJobFormPresentation, setTheme } from "../../store";

function resolvePreference<T>(current: T, initial: T, server: T | null): T {
  if (current !== initial) {
    return current;
  }
  return server ?? current;
}

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
    if (appliedPreferenceKey.current === preferenceKey) {
      return;
    }
    appliedPreferenceKey.current = preferenceKey;

    let cancelled = false;
    const localPreferences = readLocalUserPreferences();
    if (serverPreferences.selectedTheme) {
      dispatch(setTheme(serverPreferences.selectedTheme));
    }
    if (serverPreferences.selectedFormPresentation) {
      dispatch(setJobFormPresentation(serverPreferences.selectedFormPresentation));
    }

    async function applyServerLanguage() {
      if (serverPreferences.selectedLanguage) {
        try {
          await changeLocale(serverPreferences.selectedLanguage);
        } catch {
          return;
        }
      }
      if (cancelled) {
        return;
      }
      const currentPreferences = readLocalUserPreferences();
      writeLocalUserPreferences({
        language: resolvePreference(
          currentPreferences.language,
          localPreferences.language,
          serverPreferences.selectedLanguage,
        ),
        theme: resolvePreference(currentPreferences.theme, localPreferences.theme, serverPreferences.selectedTheme),
        formPresentation: resolvePreference(
          currentPreferences.formPresentation,
          localPreferences.formPresentation,
          serverPreferences.selectedFormPresentation,
        ),
        wasIntroduced: serverPreferences.wasIntroduced,
      });
    }

    void applyServerLanguage();
    return () => {
      cancelled = true;
    };
  }, [dispatch, preferences.data, userId]);

  useEffect(() => {
    if (!userId) {
      appliedPreferenceKey.current = null;
    }
  }, [userId]);

  return null;
}
