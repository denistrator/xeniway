import type { JobStatus } from "@job-tracker/shared";
import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemePreference = "light" | "dark" | "system";
export type StatusFilter = JobStatus | "all";
export type SortField = "createdAt" | "appliedAt";
export type SortDirection = "asc" | "desc";

type UiState = {
  theme: ThemePreference;
  search: string;
  statusFilter: StatusFilter;
  sortField: SortField;
  sortDirection: SortDirection;
  drawer: { open: boolean; mode: "create" | "edit"; jobId: number | null };
};

const initialState: UiState = {
  theme:
    typeof window !== "undefined" &&
    ["light", "dark", "system"].includes(localStorage.getItem("job-tracker-theme") ?? "")
      ? (localStorage.getItem("job-tracker-theme") as ThemePreference)
      : "system",
  search: "",
  statusFilter: "all",
  sortField: "createdAt",
  sortDirection: "desc",
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
    setStatusFilter: (state, action: PayloadAction<StatusFilter>) => {
      state.statusFilter = action.payload;
    },
    setSort: (state, action: PayloadAction<{ field: SortField; direction: SortDirection }>) => {
      state.sortField = action.payload.field;
      state.sortDirection = action.payload.direction;
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

export const { setTheme, setSearch, setStatusFilter, setSort, openCreateDrawer, openEditDrawer, closeDrawer } =
  uiSlice.actions;

export const store = configureStore({ reducer: { ui: uiSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
