import { Elysia } from "elysia";
import type { AuthRoutesDependencies } from "../types";
import { csrfRoute } from "./csrf";
import { passwordResetRoutes } from "./password-reset";
import { authSessionRoutes } from "./session";

export function authRoutes(dependencies: AuthRoutesDependencies) {
  const publicAndSessionRoutes = new Elysia().use(csrfRoute(dependencies)).use(authSessionRoutes(dependencies));

  return dependencies.passwordReset
    ? publicAndSessionRoutes.use(passwordResetRoutes(dependencies))
    : publicAndSessionRoutes;
}
