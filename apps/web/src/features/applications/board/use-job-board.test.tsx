import { act, renderHook } from "@testing-library/react";
import type { JobApplication } from "@xeniway/shared";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAllStatuses, store, toggleStatus } from "../../../store";
import { useJobBoard } from "./use-job-board";

const job: JobApplication = {
  id: 1,
  company: "Example",
  position: "Engineer",
  location: null,
  salary: null,
  jobUrl: null,
  description: null,
  status: "saved",
  sortOrder: 0,
  appliedAt: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
  blacklistedAt: null,
  blacklistReason: null,
};

function TestProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe("useJobBoard", () => {
  beforeEach(() => {
    store.dispatch(setAllStatuses(true));
  });

  it("uses workflow order when a hidden status is re-enabled", () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() => useJobBoard({ jobs: [job], onStatusChange, onReorder: vi.fn() }), {
      wrapper: TestProvider,
    });

    act(() => {
      store.dispatch(toggleStatus("applied"));
      store.dispatch(toggleStatus("offer"));
      store.dispatch(toggleStatus("rejected"));
      store.dispatch(toggleStatus("withdrawn"));
      store.dispatch(toggleStatus("saved"));
      store.dispatch(toggleStatus("saved"));
    });

    expect(result.current.displayedStatuses).toEqual(["saved", "interview"]);

    result.current.moveToAdjacentStatus(job.id, "saved", "nextStatus");
    result.current.moveToAdjacentStatus(job.id, "interview", "previousStatus");

    expect(onStatusChange).toHaveBeenNthCalledWith(1, job.id, "interview");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, job.id, "saved");
  });
});
