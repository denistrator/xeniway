export async function runWorkspaceMutation<TStatus extends string>(
  operation: () => Promise<unknown>,
  setStatus: (status: TStatus | null) => void,
  successStatus: TStatus,
  failureStatus: TStatus,
): Promise<boolean> {
  setStatus(null);
  try {
    await operation();
    setStatus(successStatus);
    return true;
  } catch {
    setStatus(failureStatus);
    return false;
  }
}
