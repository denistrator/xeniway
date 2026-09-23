export function WorkspaceFieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-rose-600">
      {message}
    </p>
  );
}
