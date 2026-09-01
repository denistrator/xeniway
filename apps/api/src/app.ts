import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { applicationArchiveRoute } from "./routes/application-archive";
import { applicationCreateRoute } from "./routes/application-create";
import { applicationDeleteRoute } from "./routes/application-delete";
import { applicationDetailRoute } from "./routes/application-detail";
import { applicationRestoreRoute } from "./routes/application-restore";
import { applicationUpdateRoute } from "./routes/application-update";
import { applicationsArchiveRoute } from "./routes/applications-archive";
import { applicationsListRoute } from "./routes/applications-list";
import { authCsrfRoute } from "./routes/auth-csrf";
import { authLoginRoute } from "./routes/auth-login";
import { authLogoutRoute } from "./routes/auth-logout";
import { authMeRoute } from "./routes/auth-me";
import { authRegisterRoute } from "./routes/auth-register";
import { healthRoute } from "./routes/health";
import { CSRF_HEADER, errorResponse } from "./routes/support";
import type { AppDependencies, RouteDependencies } from "./routes/types";
import { AuthService } from "./services/auth";
import { SlidingWindowRateLimiter } from "./services/rate-limit";

export type { AppDependencies } from "./routes/types";

export function createApp(dependencies: AppDependencies) {
  const auth = new AuthService(dependencies.users, dependencies.sessions, dependencies.passwordHasher);
  const authRateLimiter =
    dependencies.authRateLimiter ?? new SlidingWindowRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });
  const routeDependencies: RouteDependencies = {
    applications: dependencies.applications,
    auth,
    authRateLimiter,
    databaseHealth: dependencies.health ?? (async () => true),
  };

  return new Elysia()
    .use(
      cors({
        origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
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
    .use(applicationsArchiveRoute(routeDependencies))
    .use(applicationsListRoute(routeDependencies))
    .use(applicationDetailRoute(routeDependencies))
    .use(applicationCreateRoute(routeDependencies))
    .use(applicationUpdateRoute(routeDependencies))
    .use(applicationArchiveRoute(routeDependencies))
    .use(applicationRestoreRoute(routeDependencies))
    .use(applicationDeleteRoute(routeDependencies));
}
