import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FormPresentation, JobStatus, ThemePreference } from "@xeniway/shared";
import { readLocalUserPreferences } from "./lib/user-preferences";

export type { ThemePreference } from "@xeniway/shared";

export type JobFormPresentation = FormPresentation;

const localPreferences = readLocalUserPreferences();

type UiState = {
  theme: ThemePreference;
  jobFormPresentation: JobFormPresentation;
  search: string;
  visibleStatuses: JobStatus[];
  drawer: { open: boolean; mode: "create" | "edit"; jobId: number | null };
  welcome: { open: boolean };
};

const initialState: UiState = {
  theme: localPreferences.theme,
  jobFormPresentation: localPreferences.formPresentation,
  search: "",
  visibleStatuses: ["saved", "applied", "interview", "offer", "rejected", "withdrawn"],
  drawer: { open: false, mode: "create", jobId: null },
  welcome: { open: false },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemePreference>) => {
      state.theme = action.payload;
    },
    setJobFormPresentation: (state, action: PayloadAction<JobFormPresentation>) => {
      state.jobFormPresentation = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    toggleStatus: (state, action: PayloadAction<JobStatus>) => {
      state.visibleStatuses = state.visibleStatuses.includes(action.payload)
        ? state.visibleStatuses.filter((status) => status !== action.payload)
        : [...state.visibleStatuses, action.payload];
    },
    setAllStatuses: (state, action: PayloadAction<boolean>) => {
      state.visibleStatuses = action.payload ? ["saved", "applied", "interview", "offer", "rejected", "withdrawn"] : [];
    },
    openCreateDrawer: (state) => {
      state.drawer = { open: true, mode: "create", jobId: null };
    },
    openEditDrawer: (state, action: PayloadAction<number>) => {
      state.drawer = { open: true, mode: "edit", jobId: action.payload };
    },
    closeDrawer: (state) => {
      state.drawer.open = false;
    },
    openWelcome: (state) => {
      state.welcome.open = true;
    },
    closeWelcome: (state) => {
      state.welcome.open = false;
    },
  },
});

export const {
  setTheme,
  setJobFormPresentation,
  setSearch,
  toggleStatus,
  setAllStatuses,
  openCreateDrawer,
  openEditDrawer,
  closeDrawer,
  openWelcome,
  closeWelcome,
} = uiSlice.actions;

export const store = configureStore({ reducer: { ui: uiSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
