import {
  type ApplicationFollowUpTask,
  type CreateApplicationFollowUpTaskInput,
  createApplicationFollowUpTaskInputSchema,
} from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";

export function useFollowUpForm(
  task: ApplicationFollowUpTask | undefined,
  onSave: (input: CreateApplicationFollowUpTaskInput) => Promise<void>,
) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [error, setError] = useState<"taskRequired" | "dateRequired" | "invalidDate" | "invalid" | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createApplicationFollowUpTaskInputSchema.safeParse({ title, dueDate, notes: notes || null });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(
        field === "title"
          ? "taskRequired"
          : field === "dueDate" && !dueDate
            ? "dateRequired"
            : field === "dueDate"
              ? "invalidDate"
              : "invalid",
      );
      if (field === "title") titleRef.current?.focus();
      else if (field === "dueDate") dateRef.current?.focus();
      return;
    }
    setError(null);
    await onSave(parsed.data);
  }

  return { title, setTitle, dueDate, setDueDate, notes, setNotes, error, titleRef, dateRef, submit };
}
