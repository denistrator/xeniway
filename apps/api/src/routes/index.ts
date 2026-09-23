import { Elysia } from "elysia";
import { applicationsRoute } from "./applications";
import { authRoutes } from "./auth";
import { healthRoute } from "./health";
import { preferencesRoute } from "./preferences";
import type { RouteDependencies } from "./types";

export function apiRoutes(dependencies: RouteDependencies) {
  return new Elysia()
    .use(healthRoute(dependencies))
    .use(authRoutes(dependencies))
    .use(preferencesRoute(dependencies))
    .use(applicationsRoute(dependencies));
}
