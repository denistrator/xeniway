import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuthMutations, useCsrfToken } from "../lib/queries";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const csrf = useCsrfToken();
  const { login } = useAuthMutations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login.mutateAsync({ email, password });
    const destination = new URLSearchParams(location.search).get("redirect") ?? "/";
    navigate(destination, { replace: true });
  }

  return (
    <AuthCard title="Welcome back" description="Sign in to continue tracking your applications.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm font-medium">
          Email
          <Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Password
          <Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {login.error && <p className="text-sm text-rose-600 dark:text-rose-400">{login.error.message}</p>}
        <Button className="w-full" type="submit" disabled={csrf.isPending || login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <Link className="font-semibold text-slate-950 dark:text-white" to="/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center bg-slate-50 dark:bg-slate-950">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
