import { type JobStatus, jobStatusSchema } from "@xeniway/shared";
import { useContext, useLayoutEffect } from "react";
import { useStore } from "react-redux";
import { matchPath, UNSAFE_DataRouterContext, useLocation, useNavigate } from "react-router-dom";
import { projectCollectionFilters, type RootState } from "../../../store";

const statuses = jobStatusSchema.options;
type Filters = Pick<RootState["ui"], "search" | "visibleStatuses">;

function readStatuses(value: string | null): JobStatus[] {
  if (value === "") {
    return [];
  }
  const requested = value?.split(",") ?? statuses;
  const recognized = statuses.filter((status) => requested.includes(status));
  return recognized.length > 0 ? recognized : [...statuses];
}

function sameStatuses(left: readonly JobStatus[], right: readonly JobStatus[]) {
  return statuses.every((status) => left.includes(status) === right.includes(status));
}

function updateParameters(parameters: URLSearchParams, previous: Filters, next: Filters, activeBoard: boolean) {
  const statusChanged = activeBoard && !sameStatuses(previous.visibleStatuses, next.visibleStatuses);
  const searchChanged = previous.search !== next.search;
  if (!searchChanged && !statusChanged) {
    return null;
  }
  if (searchChanged) {
    parameters.delete("q");
    if (next.search) {
      parameters.set("q", next.search);
    }
  }
  if (statusChanged) {
    parameters.delete("statuses");
    const selected = statuses.filter((status) => next.visibleStatuses.includes(status));
    if (selected.length !== statuses.length) {
      parameters.set("statuses", selected.join(","));
    }
  }
  return { replace: !statusChanged };
}

/** The URL owns collection filters; Redux is their synchronous presentation projection. */
export function useCollectionRouteFilters() {
  const store = useStore<RootState>();
  const location = useLocation();
  const navigate = useNavigate();
  const router = useContext(UNSAFE_DataRouterContext)?.router;
  useLayoutEffect(() => {
    const isCollection = ["/", "/archive", "/blacklist"].some((path) => matchPath(path, location.pathname));
    if (!router || !isCollection) {
      return;
    }
    const activeBoard = location.pathname === "/";
    const parameters = new URLSearchParams(location.search);
    store.dispatch(
      projectCollectionFilters({
        search: parameters.get("q") ?? "",
        ...(activeBoard ? { visibleStatuses: readStatuses(parameters.get("statuses")) } : {}),
      }),
    );
    let previous = store.getState().ui;
    let currentLocationKey = location.key;
    return store.subscribe(() => {
      // Router state advances before React commits a new location and cleans up this subscription.
      if (router.state.location.key !== currentLocationKey || router.state.navigation.state !== "idle") {
        return;
      }
      const next = store.getState().ui;
      const options = updateParameters(parameters, previous, next, activeBoard);
      previous = next;
      if (options) {
        void navigate(
          { pathname: location.pathname, search: parameters.toString(), hash: location.hash },
          {
            ...options,
            preventScrollReset: true,
          },
        );
        currentLocationKey = router.state.location.key;
      }
    });
  }, [store, location, navigate, router]);
}
