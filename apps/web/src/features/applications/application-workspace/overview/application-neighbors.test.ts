import { describe, expect, test } from "vitest";
import { getApplicationNeighbors } from "./application-neighbors";

describe("getApplicationNeighbors", () => {
  const applications = [
    { id: 9, status: "offer" },
    { id: 7, status: "saved" },
    { id: 2, status: "withdrawn" },
    { id: 4, status: "saved" },
  ] as const;

  test("preserves column order, skips empty statuses, and wraps in both directions", () => {
    expect(getApplicationNeighbors(applications, 7)).toEqual({ previous: 2, next: 4 });
    expect(getApplicationNeighbors(applications, 4)).toEqual({ previous: 7, next: 9 });
    expect(getApplicationNeighbors(applications, 9)).toEqual({ previous: 4, next: 2 });
    expect(getApplicationNeighbors(applications, 2)).toEqual({ previous: 9, next: 7 });
    expect(applications.map(({ id }) => id)).toEqual([9, 7, 2, 4]);
  });

  test("has no destinations for empty, single, or missing-current collections", () => {
    const none = { previous: null, next: null };
    expect(getApplicationNeighbors([], 7)).toEqual(none);
    expect(getApplicationNeighbors([applications[1]], 7)).toEqual(none);
    expect(getApplicationNeighbors(applications, 99)).toEqual(none);
  });
});
