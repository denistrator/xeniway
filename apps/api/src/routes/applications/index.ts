import { Elysia } from "elysia";
import type { RouteDependencies } from "../types";
import { applicationBoardRoutes } from "./boards";
import { applicationCollectionRoutes } from "./collection";
import { applicationEventRoutes } from "./events";
import { applicationExportRoutes } from "./export";
import { applicationItemRoutes } from "./item";
import { applicationWorkspaceRoutes } from "./workspace";

export function applicationsRoute(dependencies: RouteDependencies) {
  return new Elysia()
    .use(applicationCollectionRoutes(dependencies))
    .use(applicationExportRoutes(dependencies))
    .use(applicationItemRoutes(dependencies))
    .use(applicationWorkspaceRoutes(dependencies))
    .use(applicationEventRoutes(dependencies))
    .use(applicationBoardRoutes(dependencies));
}
