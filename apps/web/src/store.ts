import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { JobStatus } from "@xeniway/shared";

export type ThemePreference = "light" | "dark" | "system";
export type JobFormPresentation = "drawer" | "modal";
export const jobFormPresentationStorageKey = "xeniway-form-presentation";

type UiState = {
  theme: ThemePreference;
  jobFormPresentation: JobFormPresentation;
  search: string;
  visibleStatuses: JobStatus[];
  drawer: { open: boolean; mode: "create" | "edit"; jobId: number | null };
};

const initialState: UiState = {
  theme:
    typeof window !== "undefined" && ["light", "dark", "system"].includes(localStorage.getItem("xeniway-theme") ?? "")
      ? (localStorage.getItem("xeniway-theme") as ThemePreference)
      : "system",
  jobFormPresentation:
    typeof window !== "undefined" && localStorage.getItem(jobFormPresentationStorageKey) === "modal"
      ? "modal"
      : "drawer",
  search: "",
  visibleStatuses: ["saved", "applied", "interview", "offer", "rejected", "withdrawn"],
  drawer: { open: false, mode: "create", jobId: null },
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
} = uiSlice.actions;

export const store = configureStore({ reducer: { ui: uiSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
