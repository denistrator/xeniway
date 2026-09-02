import type { JobStatus } from "@job-tracker/shared";
import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemePreference = "light" | "dark" | "system";

type UiState = {
  theme: ThemePreference;
  search: string;
  visibleStatuses: JobStatus[];
  drawer: { open: boolean; mode: "create" | "edit"; jobId: number | null };
};

const initialState: UiState = {
  theme:
    typeof window !== "undefined" &&
    ["light", "dark", "system"].includes(localStorage.getItem("job-tracker-theme") ?? "")
      ? (localStorage.getItem("job-tracker-theme") as ThemePreference)
      : "system",
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

export const { setTheme, setSearch, toggleStatus, setAllStatuses, openCreateDrawer, openEditDrawer, closeDrawer } =
  uiSlice.actions;

export const store = configureStore({ reducer: { ui: uiSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
