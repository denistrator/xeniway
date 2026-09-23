import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { apiRoutes } from "./routes";
import { CSRF_HEADER, errorResponse } from "./routes/support";
import type { AppDependencies, RouteDependencies } from "./routes/types";
import { AuthService } from "./services/auth";
import { PasswordResetService } from "./services/password-reset";
import { SlidingWindowRateLimiter } from "./services/rate-limit";

export type { AppDependencies } from "./routes/types";

export function createApp(dependencies: AppDependencies) {
  const auth = new AuthService(dependencies.users, dependencies.sessions, dependencies.passwordHasher);
  const authRateLimiter =
    dependencies.authRateLimiter ?? new SlidingWindowRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });
  const passwordReset =
    dependencies.passwordReset ??
    (dependencies.passwordResetTokens && dependencies.passwordResetMailer
      ? new PasswordResetService(
          dependencies.users,
          dependencies.passwordResetTokens,
          dependencies.sessions,
          dependencies.passwordResetRateLimiter ?? authRateLimiter,
          dependencies.passwordHasher ?? {
            hash: (password) => Bun.password.hash(password, { algorithm: "argon2id" }),
            verify: (password, hash) => Bun.password.verify(password, hash),
          },
          dependencies.passwordResetMailer,
          dependencies.appOrigin ?? process.env.APP_ORIGIN ?? "http://localhost:5173",
        )
      : undefined);
  const routeDependencies: RouteDependencies = {
    applications: dependencies.applications,
    preferences: dependencies.preferences,
    auth,
    authRateLimiter,
    passwordReset,
    databaseHealth: dependencies.health ?? (async () => true),
    redisHealth: dependencies.redisHealth ?? (async () => true),
    secureCookies: dependencies.secureCookies ?? false,
  };

  const app = new Elysia()
    .use(
      cors({
        origin: dependencies.corsOrigin ?? "http://localhost:5173",
        credentials: true,
        allowedHeaders: ["content-type", CSRF_HEADER],
      }),
    )
    .onError(({ code, set }) => {
      if (code === "NOT_FOUND") {
        set.status = 404;
        return errorResponse("NOT_FOUND", "Route not found");
      }
      set.status = 500;
      return errorResponse("INTERNAL_ERROR", "Internal server error");
    })
    .use(apiRoutes(routeDependencies));

  return app;
}
