import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { applicationArchiveRoute } from "./routes/application-archive";
import { applicationBlacklistRoute } from "./routes/application-blacklist";
import { applicationCreateRoute } from "./routes/application-create";
import { applicationDeleteRoute } from "./routes/application-delete";
import { applicationDetailRoute } from "./routes/application-detail";
import { applicationRestoreRoute } from "./routes/application-restore";
import { applicationUnblacklistRoute } from "./routes/application-unblacklist";
import { applicationUpdateRoute } from "./routes/application-update";
import { applicationsArchiveRoute } from "./routes/applications-archive";
import { applicationsBlacklistRoute } from "./routes/applications-blacklist";
import { applicationsListRoute } from "./routes/applications-list";
import { applicationsReorderRoute } from "./routes/applications-reorder";
import { authCsrfRoute } from "./routes/auth-csrf";
import { authLoginRoute } from "./routes/auth-login";
import { authLogoutRoute } from "./routes/auth-logout";
import { authMeRoute } from "./routes/auth-me";
import { authPasswordResetConfirmRoute } from "./routes/auth-password-reset-confirm";
import { authPasswordResetRequestRoute } from "./routes/auth-password-reset-request";
import { authRegisterRoute } from "./routes/auth-register";
import { healthRoute } from "./routes/health";
import { CSRF_HEADER, errorResponse } from "./routes/support";
import type { AppDependencies, RouteDependencies } from "./routes/types";
import { userPreferencesRoute } from "./routes/user-preferences";
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
    .use(healthRoute(routeDependencies))
    .use(authCsrfRoute(routeDependencies))
    .use(authRegisterRoute(routeDependencies))
    .use(authLoginRoute(routeDependencies))
    .use(authLogoutRoute(routeDependencies))
    .use(authMeRoute(routeDependencies))
    .use(userPreferencesRoute(routeDependencies))
    .use(applicationsArchiveRoute(routeDependencies))
    .use(applicationsBlacklistRoute(routeDependencies))
    .use(applicationsListRoute(routeDependencies))
    .use(applicationsReorderRoute(routeDependencies))
    .use(applicationDetailRoute(routeDependencies))
    .use(applicationCreateRoute(routeDependencies))
    .use(applicationUpdateRoute(routeDependencies))
    .use(applicationArchiveRoute(routeDependencies))
    .use(applicationBlacklistRoute(routeDependencies))
    .use(applicationUnblacklistRoute(routeDependencies))
    .use(applicationRestoreRoute(routeDependencies))
    .use(applicationDeleteRoute(routeDependencies));

  if (passwordReset) {
    app.use(authPasswordResetRequestRoute(routeDependencies));
    app.use(authPasswordResetConfirmRoute(routeDependencies));
  }

  return app;
}
