import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { createAppRoutes } from "./app-routes.model";

const router = createBrowserRouter(createAppRoutes());

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
