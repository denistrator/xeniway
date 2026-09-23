import { Elysia } from "elysia";
import type { RouteDependencies } from "../types";
import { applicationBoardRoutes } from "./boards";
import { applicationCollectionRoutes } from "./collection";
import { applicationEventRoutes } from "./events";
import { applicationItemRoutes } from "./item";

export function applicationsRoute(dependencies: RouteDependencies) {
  return new Elysia()
    .use(applicationCollectionRoutes(dependencies))
    .use(applicationItemRoutes(dependencies))
    .use(applicationEventRoutes(dependencies))
    .use(applicationBoardRoutes(dependencies));
}
