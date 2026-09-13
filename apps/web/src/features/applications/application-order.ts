export type MoveDirection = "up" | "down" | "first" | "last";

export function moveApplication(ids: number[], id: number, direction: MoveDirection): number[] | null {
  const currentIndex = ids.indexOf(id);
  if (currentIndex === -1) return null;
  const targetIndex = { up: currentIndex - 1, down: currentIndex + 1, first: 0, last: ids.length - 1 }[direction];
  if (targetIndex === currentIndex || targetIndex < 0 || targetIndex >= ids.length) return null;
  const reordered = ids.filter((applicationId) => applicationId !== id);
  reordered.splice(targetIndex, 0, id);
  return reordered;
}

export function insertApplication(ids: number[], id: number, targetId: number): number[] | null {
  const targetIndex = ids.indexOf(targetId);
  if (targetIndex === -1 || ids.includes(id)) return null;
  const reordered = [...ids];
  reordered.splice(targetIndex, 0, id);
  return reordered;
}
