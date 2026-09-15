import {
  type ApplicationEvent,
  type ApplicationEventInput,
  applicationEventInputSchema,
  type manualApplicationEventTypeSchema,
} from "@xeniway/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function useApplicationActivityForm(
  event: ApplicationEvent | undefined,
  onSubmit: (input: ApplicationEventInput) => Promise<void>,
) {
  const initialFocus = useRef<HTMLSelectElement>(null);
  useEffect(() => initialFocus.current?.focus(), []);
  const [type, setType] = useState<(typeof manualApplicationEventTypeSchema.options)[number]>(
    event?.isSystem ? "note" : ((event?.type as (typeof manualApplicationEventTypeSchema.options)[number]) ?? "note"),
  );
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [occurredAt, setOccurredAt] = useState(toLocalDateTime(event?.occurredAt ?? new Date().toISOString()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"invalid" | "saveFailed" | null>(null);

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const parsed = applicationEventInputSchema.safeParse({
      type,
      title,
      description: description || null,
      occurredAt: new Date(occurredAt).toISOString(),
    });
    if (!parsed.success) {
      setError("invalid");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit(parsed.data);
    } catch {
      setError("saveFailed");
    } finally {
      setPending(false);
    }
  };

  return {
    initialFocus,
    type,
    setType,
    title,
    setTitle,
    description,
    setDescription,
    occurredAt,
    setOccurredAt,
    pending,
    error,
    submit,
  };
}
