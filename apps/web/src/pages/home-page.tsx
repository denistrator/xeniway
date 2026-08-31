import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { messageInputSchema, type HealthResponse, type HelloResponse, type Message, type MessageInput } from "@hello/shared";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { requestJson } from "../lib/api";
import { decrement, increment, type RootState } from "../store";

function QueryState({ loading, error, children }: { loading: boolean; error: Error | null; children: ReactNode }) {
  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-rose-600">Unable to load: {error.message}</p>;
  return children;
}

export function HomePage() {
  const dispatch = useDispatch();
  const count = useSelector((state: RootState) => state.counter.value);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: () => requestJson<HealthResponse>("/api/health"),
  });
  const helloQuery = useQuery({
    queryKey: ["hello"],
    queryFn: () => requestJson<HelloResponse>("/api/hello"),
  });
  const messagesQuery = useQuery({
    queryKey: ["messages"],
    queryFn: () => requestJson<Message[]>("/api/messages"),
  });
  const messageMutation = useMutation({
    mutationFn: (input: MessageInput) =>
      requestJson<Message>("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      setText("");
      setValidationError(null);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = messageInputSchema.safeParse({ text });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Enter a message");
      return;
    }
    setValidationError(null);
    messageMutation.mutate(parsed.data);
  }

  return (
    <div className="space-y-8">
      <section className="max-w-3xl space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="success">Runnable playground</Badge>
          <span className="text-sm text-slate-500">Small pieces, connected end to end</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Job Tracker</h1>
        <p className="text-lg leading-8 text-slate-600">
          A tiny full-stack app showing how the selected frontend and backend libraries fit together.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API greeting</CardTitle>
            <CardDescription>TanStack Query → Elysia → Bun</CardDescription>
          </CardHeader>
          <CardContent>
            <QueryState loading={helloQuery.isLoading} error={helloQuery.error}>
              <p className="text-2xl font-semibold text-slate-950">{helloQuery.data?.message}</p>
              <p className="mt-2 text-sm text-slate-500">Fetched at {helloQuery.data?.timestamp}</p>
            </QueryState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service health</CardTitle>
            <CardDescription>TanStack Query → PostgreSQL check</CardDescription>
          </CardHeader>
          <CardContent>
            <QueryState loading={healthQuery.isLoading} error={healthQuery.error}>
              <div className="flex items-center gap-2">
                <Badge variant="success">{healthQuery.data?.status}</Badge>
                <span className="text-sm text-slate-600">database: {healthQuery.data?.database}</span>
              </div>
            </QueryState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redux counter</CardTitle>
            <CardDescription>Local state stays separate from server state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" aria-label="Decrease" onClick={() => dispatch(decrement())}>
                −
              </Button>
              <span className="min-w-8 text-center text-2xl font-semibold text-slate-950">{count}</span>
              <Button size="icon" aria-label="Increase" onClick={() => dispatch(increment())}>
                +
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persist a message</CardTitle>
            <CardDescription>Zod validation → Drizzle → PostgreSQL</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="message">
                Message
              </label>
              <div className="flex gap-2">
                <Input id="message" value={text} onChange={(event) => setText(event.target.value)} placeholder="Say hello…" maxLength={240} />
                <Button type="submit" disabled={messageMutation.isPending}>
                  {messageMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
              {validationError && <p className="text-sm text-rose-600">{validationError}</p>}
              {messageMutation.error && <p className="text-sm text-rose-600">Unable to save: {messageMutation.error.message}</p>}
            </form>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Saved messages</CardTitle>
          <CardDescription>Loaded with TanStack Query after each mutation</CardDescription>
        </CardHeader>
        <CardContent>
          <QueryState loading={messagesQuery.isLoading} error={messagesQuery.error}>
            {messagesQuery.data?.length ? (
              <ul className="space-y-3">
                {messagesQuery.data.map((message) => (
                  <li key={message.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-800">{message.text}</span>
                    <span className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No messages yet. Add the first one above.</p>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
