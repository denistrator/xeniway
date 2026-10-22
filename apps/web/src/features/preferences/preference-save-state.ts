import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import type { UpdateUserPreferencesInput } from "@xeniway/shared";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { choiceMade, dictionaryFailed, preferenceFeedbackStore } from "./preference-feedback-state";

export type PreferenceSaveStatus = "idle" | "saving" | "saved" | "local-only" | "failed";
type SaveState = {
  ownerId: number | null;
  outstanding: UpdateUserPreferencesInput;
  fields: (keyof UpdateUserPreferencesInput)[];
  status: PreferenceSaveStatus;
};
const initialState: SaveState = { ownerId: null, outstanding: {}, fields: [], status: "idle" };
const slice = createSlice({
  name: "preferenceSave",
  initialState,
  reducers: {
    ownerChanged: (_state, action: PayloadAction<number | null>) => ({ ...initialState, ownerId: action.payload }),
    selected: (state, action: PayloadAction<UpdateUserPreferencesInput>) => {
      state.outstanding = { ...state.outstanding, ...action.payload };
      state.fields = Object.keys(action.payload) as (keyof UpdateUserPreferencesInput)[];
    },
    statusChanged: (state, action: PayloadAction<PreferenceSaveStatus>) => {
      state.status = action.payload;
      if (action.payload !== "saving") {
        state.fields = Object.keys(state.outstanding) as (keyof UpdateUserPreferencesInput)[];
      }
    },
    saveSucceeded: (state, action: PayloadAction<UpdateUserPreferencesInput>) => {
      const savedFields = Object.keys(action.payload) as (keyof UpdateUserPreferencesInput)[];
      for (const field of savedFields) {
        if (state.outstanding[field] === action.payload[field]) {
          delete state.outstanding[field];
        }
      }
      const pendingFields = Object.keys(state.outstanding) as (keyof UpdateUserPreferencesInput)[];
      const hasOutstanding = pendingFields.length > 0;
      state.fields = hasOutstanding ? pendingFields : savedFields;
      state.status = hasOutstanding ? "local-only" : "saved";
    },
  },
});

function readOwner(client: QueryClient) {
  return client.getQueryData<{ data: { user: { id: number } | null } }>(["auth", "me"])?.data.user?.id ?? null;
}

function createPreferenceSaveState(client: QueryClient) {
  const store = configureStore({
    reducer: slice.reducer,
    preloadedState: { ...initialState, ownerId: readOwner(client) },
  });
  let epoch = 0;
  let controller: AbortController | null = null;
  let observers = 0;
  let observingOwner = false;

  function syncOwner() {
    const ownerId = readOwner(client);
    if (ownerId !== store.getState().ownerId) {
      if (store.getState().ownerId !== null) {
        preferenceFeedbackStore.dispatch(dictionaryFailed(null));
      }
      epoch += 1;
      controller?.abort();
      store.dispatch(slice.actions.ownerChanged(ownerId));
    }
  }

  function captureOwner() {
    syncOwner();
    const originEpoch = epoch;
    return () => {
      syncOwner();
      return epoch === originEpoch;
    };
  }

  function begin(input: UpdateUserPreferencesInput, canMutate: boolean) {
    syncOwner();
    controller?.abort();
    controller = new AbortController();
    const requestController = controller;
    const sameOwner = captureOwner();
    if (input.selectedFormPresentation !== undefined) {
      preferenceFeedbackStore.dispatch(choiceMade("formPresentation"));
    }
    store.dispatch(slice.actions.selected(input));
    const state = store.getState();
    if (state.ownerId === null || !canMutate) {
      store.dispatch(slice.actions.statusChanged("local-only"));
      return null;
    }
    store.dispatch(slice.actions.statusChanged("saving"));
    return {
      input,
      signal: requestController.signal,
      isCurrent: () => sameOwner() && !requestController.signal.aborted,
    };
  }

  function finish(
    request: { input: UpdateUserPreferencesInput; isCurrent: () => boolean },
    status: "saved" | "failed",
  ) {
    if (!request.isCurrent()) {
      return;
    }
    if (status === "saved") {
      store.dispatch(slice.actions.saveSucceeded(request.input));
      return;
    }
    store.dispatch(slice.actions.statusChanged("failed"));
  }

  function start() {
    observers += 1;
    if (!observingOwner) {
      syncOwner();
      // Observe every cache transition, including A → B → A before React renders.
      // Cached retries must also remain scoped while the controls are unmounted.
      client.getQueryCache().subscribe(syncOwner);
      observingOwner = true;
    }
    return () => {
      observers -= 1;
      if (observers === 0) {
        controller?.abort();
        if (store.getState().status === "saving") {
          store.dispatch(slice.actions.statusChanged("local-only"));
        }
      }
    };
  }

  return { store, start, captureOwner, begin, finish, getOwnerEpoch: () => epoch };
}

type PreferenceSaveState = ReturnType<typeof createPreferenceSaveState>;
const states = new WeakMap<QueryClient, PreferenceSaveState>();

export function usePreferenceSaveState() {
  const client = useQueryClient();
  const runtime = useMemo(() => {
    const existing = states.get(client);
    if (existing) {
      return existing;
    }
    const created = createPreferenceSaveState(client);
    states.set(client, created);
    return created;
  }, [client]);
  useEffect(() => runtime.start(), [runtime]);
  const state = useSyncExternalStore(runtime.store.subscribe, runtime.store.getState);
  return { runtime, state };
}
