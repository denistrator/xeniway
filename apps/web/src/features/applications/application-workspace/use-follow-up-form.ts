import type { ApplicationFollowUpTask, CreateApplicationFollowUpTaskInput } from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { type FollowUpErrors, validateFollowUpDraft } from "./workspace-validation";

export function useFollowUpForm(
  task: ApplicationFollowUpTask | undefined,
  onSave: (input: CreateApplicationFollowUpTaskInput) => Promise<void>,
) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [errors, setErrors] = useState<FollowUpErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function changeTitle(value: string) {
    setTitle(value);
    setErrors((current) => ({ ...current, title: undefined }));
  }

  function changeDueDate(value: string) {
    setDueDate(value);
    setErrors((current) => ({ ...current, dueDate: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateFollowUpDraft({ title, dueDate, notes });
    if (!result.input) {
      setErrors(result.errors);
      if (result.firstField === "title") titleRef.current?.focus();
      else if (result.firstField === "dueDate") dateRef.current?.focus();
      return;
    }
    setErrors({});
    await onSave(result.input);
  }

  return {
    title,
    setTitle: changeTitle,
    dueDate,
    setDueDate: changeDueDate,
    notes,
    setNotes,
    errors,
    titleRef,
    dateRef,
    submit,
  };
}
