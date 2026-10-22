import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { changeLocale } from "../../i18n/i18n";
import { useCurrentUser, useUserPreferences } from "../../lib/queries";
import { writeLocalUserPreferences } from "../../lib/user-preferences";
import { setJobFormPresentation, setTheme } from "../../store";
import { preferenceFeedbackStore } from "./preference-feedback-state";
import { usePreferenceSaveState } from "./preference-save-state";

export function useUserPreferencesSync() {
  const dispatch = useDispatch();
  const user = useCurrentUser();
  const userId = user.data?.id ?? null;
  const preferences = useUserPreferences(userId);
  const { runtime } = usePreferenceSaveState();
  const ownerEpoch = runtime.getOwnerEpoch();
  const baseline = useRef({ userId, ownerEpoch, choices: preferenceFeedbackStore.getState().choices });
  const ownerChanged = baseline.current.userId !== userId || baseline.current.ownerEpoch !== ownerEpoch;
  if (ownerChanged) {
    baseline.current = { userId, ownerEpoch, choices: preferenceFeedbackStore.getState().choices };
  }
  const hydration = baseline.current;

  useEffect(() => {
    if (!userId || !preferences.data) {
      return;
    }

    const serverPreferences = preferences.data;
    let cancelled = false;
    const sameOwner = runtime.captureOwner();
    const initialChoices = hydration.choices;
    const currentChoices = preferenceFeedbackStore.getState().choices;
    const themeUnchanged = initialChoices.theme === currentChoices.theme;
    const formUnchanged = initialChoices.formPresentation === currentChoices.formPresentation;
    const languageUnchanged = initialChoices.language === currentChoices.language;
    const selectedTheme = themeUnchanged ? serverPreferences.selectedTheme : null;
    const selectedForm = formUnchanged ? serverPreferences.selectedFormPresentation : null;
    if (selectedTheme) {
      dispatch(setTheme(selectedTheme));
    }
    if (selectedForm) {
      dispatch(setJobFormPresentation(selectedForm));
    }
    writeLocalUserPreferences({
      ...(selectedTheme ? { theme: selectedTheme } : {}),
      ...(selectedForm ? { formPresentation: selectedForm } : {}),
      wasIntroduced: serverPreferences.wasIntroduced,
    });

    async function applyServerLanguage() {
      const locale = serverPreferences.selectedLanguage;
      if (!locale || !languageUnchanged) {
        return;
      }
      const shouldApply = () => {
        const languageUnchanged = preferenceFeedbackStore.getState().choices.language === initialChoices.language;
        return !cancelled && sameOwner() && languageUnchanged;
      };
      try {
        const applied = await changeLocale(locale, { source: "account", shouldApply });
        if (applied && shouldApply()) {
          writeLocalUserPreferences({ language: locale });
        }
      } catch {
        // Resource feedback is shared with selectors. Other preferences are already applied.
      }
    }

    void applyServerLanguage();
    return () => {
      cancelled = true;
    };
  }, [dispatch, hydration, preferences.data, runtime, userId]);
}
