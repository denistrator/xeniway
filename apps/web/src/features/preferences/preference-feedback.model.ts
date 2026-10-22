import type { UpdateUserPreferencesInput } from "@xeniway/shared";
import { createContext, type RefObject, useContext, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateUserPreferences } from "../../lib/queries";
import { type LocalUserPreferences, writeLocalUserPreferences } from "../../lib/user-preferences";
import { useLanguagePreference } from "./language-selector.model";
import { preferenceFeedbackStore } from "./preference-feedback-state";

export type PreferenceFeedbackKind = "theme" | "language" | "presentation" | "all";

// Layout suspends background publishers while a visible dialog owns the interaction.
export const BackgroundPreferenceFeedbackContext = createContext(true);

function getFeedbackScope(
  kind: PreferenceFeedbackKind,
  fields: (keyof UpdateUserPreferencesInput)[],
  unsaved: Partial<LocalUserPreferences> | null,
) {
  switch (kind) {
    case "all": {
      return { account: true, storage: Boolean(unsaved), dictionary: true, compact: false };
    }
    case "theme": {
      return {
        account: fields.includes("selectedTheme"),
        storage: unsaved?.theme !== undefined,
        dictionary: false,
        compact: true,
      };
    }
    case "presentation": {
      return {
        account: fields.includes("selectedFormPresentation"),
        storage: unsaved?.formPresentation !== undefined,
        dictionary: false,
        compact: false,
      };
    }
    case "language": {
      return {
        account: fields.includes("selectedLanguage"),
        storage: unsaved?.language !== undefined,
        dictionary: true,
        compact: true,
      };
    }
  }
}

export type PreferenceFeedbackProps = {
  kind?: PreferenceFeedbackKind;
  compact?: boolean;
  active?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function usePreferenceFeedback({
  kind = "all",
  compact: compactOverride,
  returnFocusRef,
  active = true,
}: PreferenceFeedbackProps) {
  const { t } = useTranslation();
  const backgroundActive = useContext(BackgroundPreferenceFeedbackContext);
  const account = useUpdateUserPreferences();
  const { selectLanguage } = useLanguagePreference();
  const feedback = useSyncExternalStore(preferenceFeedbackStore.subscribe, preferenceFeedbackStore.getState);
  const [dismissed, setDismissed] = useState<{
    account: typeof account.saveSnapshot;
    local: typeof feedback;
  } | null>(null);
  const scope = getFeedbackScope(kind, account.fields ?? [], feedback.unsavedLocal);
  const accountCopy = {
    idle: "",
    saving: t("settings.preferences.accountSaving"),
    saved: t("settings.preferences.accountSaved"),
    "local-only": t("settings.preferences.accountLocalOnly"),
    failed: t("settings.preferences.accountFailed"),
  };

  function retryDictionary() {
    if (feedback.dictionaryFailure) {
      void selectLanguage(feedback.dictionaryFailure);
    }
  }

  function retryStorage() {
    writeLocalUserPreferences({});
  }

  function dismiss() {
    setDismissed({ account: account.saveSnapshot, local: feedback });
    queueMicrotask(() => returnFocusRef?.current?.focus());
  }

  const canRetryAccount = account.saveStatus === "failed" || account.saveStatus === "local-only";
  const accountText = scope.account ? accountCopy[account.saveStatus] : "";
  const storageText = scope.storage ? t("settings.preferences.storageFailed") : "";
  const dictionaryText =
    scope.dictionary && feedback.dictionaryFailure ? t("settings.preferences.dictionaryFailed") : "";
  const hasFeedback = Boolean(accountText || storageText || dictionaryText);
  const compact = compactOverride ?? scope.compact;
  const isDismissed = dismissed?.account === account.saveSnapshot && dismissed?.local === feedback;
  const surfaceIsActive = kind !== "all" || backgroundActive;
  const hasVisibleFeedback = active && surfaceIsActive && hasFeedback;
  return {
    visible: hasVisibleFeedback && !(compact && isDismissed),
    compact,
    dismiss,
    dismissLabel: t("settings.preferences.dismiss"),
    accountText,
    retryAccount: scope.account && canRetryAccount && account.canRetry ? account.retry : undefined,
    retryAccountLabel: t("settings.preferences.retryAccount"),
    storageText,
    retryStorage,
    retryStorageLabel: t("settings.preferences.retryStorage"),
    dictionaryText,
    retryDictionary,
    retryDictionaryLabel: t("settings.preferences.retryDictionary"),
  };
}
