import { createElement, lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { Layout } from "./components/layout.view";
import { GuestOnly, RequireAuth } from "./route-guards.view";
export const SettingsPage = lazy(() =>
  import("./pages/settings-page.view").then(({ SettingsPage }) => ({ default: SettingsPage })),
);
export const AboutPage = lazy(() =>
  import("./pages/about-page.view").then(({ AboutPage }) => ({ default: AboutPage })),
);
export const ArchivePage = lazy(() =>
  import("./features/applications/archive/archive-page.view").then(({ ArchivePage }) => ({ default: ArchivePage })),
);
export const BlacklistPage = lazy(() =>
  import("./features/applications/blacklist/blacklist-page.view").then(({ BlacklistPage }) => ({
    default: BlacklistPage,
  })),
);
export const ForgotPasswordPage = lazy(() =>
  import("./features/auth/forgot-password/forgot-password-page.view").then(({ ForgotPasswordPage }) => ({
    default: ForgotPasswordPage,
  })),
);
export const HomePage = lazy(() => import("./pages/home-page.view").then(({ HomePage }) => ({ default: HomePage })));
export const ApplicationWorkspacePage = lazy(() =>
  import("./features/applications/application-workspace/page/application-workspace-page.view").then(
    ({ ApplicationWorkspacePage }) => ({ default: ApplicationWorkspacePage }),
  ),
);
export const LoginPage = lazy(() =>
  import("./features/auth/login/login-page.view").then(({ LoginPage }) => ({ default: LoginPage })),
);
export const NotFoundPage = lazy(() =>
  import("./pages/not-found-page.view").then(({ NotFoundPage }) => ({ default: NotFoundPage })),
);
export const PasswordResetPage = lazy(() =>
  import("./features/auth/password-reset/password-reset-page.view").then(({ PasswordResetPage }) => ({
    default: PasswordResetPage,
  })),
);
export const RegisterPage = lazy(() =>
  import("./features/auth/register/register-page.view").then(({ RegisterPage }) => ({ default: RegisterPage })),
);

export function createAppRoutes(): RouteObject[] {
  return [
    {
      element: createElement(Layout),
      children: [
        { path: "/about", element: createElement(AboutPage) },
        { path: "/settings", element: createElement(SettingsPage) },
        {
          element: createElement(RequireAuth),
          children: [
            { path: "/", element: createElement(HomePage) },
            { path: "/archive", element: createElement(ArchivePage) },
            { path: "/blacklist", element: createElement(BlacklistPage) },
            { path: "/applications/:id", element: createElement(ApplicationWorkspacePage) },
          ],
        },
        {
          element: createElement(GuestOnly),
          children: [
            { path: "/login", element: createElement(LoginPage) },
            { path: "/register", element: createElement(RegisterPage) },
          ],
        },
        { path: "/forgot-password", element: createElement(ForgotPasswordPage) },
        { path: "/reset-password", element: createElement(PasswordResetPage) },
        { path: "*", element: createElement(NotFoundPage) },
      ],
    },
  ];
}
