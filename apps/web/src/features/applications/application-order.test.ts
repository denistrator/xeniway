import { describe, expect, test } from "vitest";
import { insertApplication, moveApplication } from "./application-order";

describe("application ordering", () => {
  test("moves an application within a column", () => {
    expect(moveApplication([1, 2, 3], 2, "down")).toEqual([1, 3, 2]);
    expect(moveApplication([1, 2, 3], 2, "first")).toEqual([2, 1, 3]);
  });

  test("returns null when a move cannot be performed", () => {
    expect(moveApplication([1, 2], 1, "up")).toBeNull();
    expect(moveApplication([1, 2], 9, "down")).toBeNull();
  });

  test("inserts an application before a target", () => {
    expect(insertApplication([1, 3], 2, 3)).toEqual([1, 2, 3]);
    expect(insertApplication([1, 3], 3, 1)).toBeNull();
  });
});
