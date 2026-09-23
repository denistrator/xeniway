import { render } from "@testing-library/react";
import type { JobApplication } from "@xeniway/shared";
import { beforeEach, expect, test, vi } from "vitest";
import { initializeI18n } from "../../i18n/i18n";
import { JobBoardColumn } from "./job-board-column";

const dropTargets: Array<{ element: HTMLElement; onDrop: (args: never) => void }> = [];

vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: () => () => {},
  dropTargetForElements: (options: { element: HTMLElement; onDrop: (args: never) => void }) => {
    dropTargets.push(options);
    return () => {};
  },
}));

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

beforeEach(async () => {
  dropTargets.length = 0;
  await initializeI18n();
});

test("handles a card drop once across nested drop targets", () => {
  const onDrop = vi.fn();
  const { container } = render(
    <JobBoardColumn
      status="saved"
      columnJobs={[job]}
      onDrop={onDrop}
      onJobDrop={onDrop}
      onDragStart={vi.fn()}
      dropTarget={null}
      setDropTarget={vi.fn()}
      onKeyboardMove={vi.fn()}
      onOpen={vi.fn()}
    />,
  );

  const column = container.querySelector("section");
  const listItem = container.querySelector("ul > li");
  expect(column).not.toBeNull();
  expect(listItem).not.toBeNull();

  for (const target of dropTargets) {
    const args = {
      source: { data: { type: "job-application", applicationId: job.id } },
      self: { element: target.element },
      location: { current: { dropTargets: [{ element: listItem }, { element: column }] } },
    };
    target.onDrop(args as never);
  }

  expect(onDrop).toHaveBeenCalledTimes(1);
});

test("preserves the hovered insertion point when dropping on the placeholder", () => {
  const onJobDrop = vi.fn();
  const followingJob = { ...job, id: 2, company: "Following" };
  const draggedJob = { ...job, id: 3, company: "Dragged" };
  const { container } = render(
    <JobBoardColumn
      status="saved"
      columnJobs={[job, followingJob, draggedJob]}
      onDrop={vi.fn()}
      onJobDrop={onJobDrop}
      onDragStart={vi.fn()}
      dropTarget={{ status: "saved", index: 1 }}
      setDropTarget={vi.fn()}
      onKeyboardMove={vi.fn()}
      onOpen={vi.fn()}
    />,
  );

  const placeholder = container.querySelector("li[aria-hidden='true']");
  expect(placeholder).not.toBeNull();
  const placeholderTarget = dropTargets.find((target) => target.element === placeholder);
  expect(placeholderTarget).toBeDefined();

  placeholderTarget?.onDrop({
    source: { data: { type: "job-application", applicationId: draggedJob.id } },
  } as never);

  expect(onJobDrop).toHaveBeenCalledWith(draggedJob.id, "saved", followingJob.id, [job, followingJob, draggedJob]);
});
