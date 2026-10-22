import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SupportedLocale } from "@xeniway/shared";
import type { LocalUserPreferences } from "../../lib/user-preferences";

type PreferenceField = "theme" | "language" | "formPresentation";
type FeedbackState = {
  dictionaryFailure: SupportedLocale | null;
  unsavedLocal: Partial<LocalUserPreferences> | null;
  choices: Record<PreferenceField, number>;
};

const initialState: FeedbackState = {
  dictionaryFailure: null,
  unsavedLocal: null,
  choices: { theme: 0, language: 0, formPresentation: 0 },
};
const slice = createSlice({
  name: "preferenceFeedback",
  initialState,
  reducers: {
    dictionaryFailed: (state, action: PayloadAction<SupportedLocale | null>) => {
      state.dictionaryFailure = action.payload;
    },
    localWriteFinished: (state, action: PayloadAction<Partial<LocalUserPreferences> | null>) => {
      state.unsavedLocal = action.payload;
    },
    choiceMade: (state, action: PayloadAction<PreferenceField>) => {
      state.choices[action.payload] += 1;
    },
  },
});

// Separate from persisted UI preferences: failures and user-action revisions live only for this visit.
export const preferenceFeedbackStore = configureStore({ reducer: slice.reducer });
export const { dictionaryFailed, localWriteFinished, choiceMade } = slice.actions;
