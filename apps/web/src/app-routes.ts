import { lazy } from "react";
export const SettingsPage = lazy(() =>
  import("./pages/settings-page.tsx").then(({ SettingsPage }) => ({ default: SettingsPage })),
);
export const AboutPage = lazy(() => import("./pages/about-page.tsx").then(({ AboutPage }) => ({ default: AboutPage })));
export const ArchivePage = lazy(() =>
  import("./features/applications/archive/archive-page.tsx").then(({ ArchivePage }) => ({ default: ArchivePage })),
);
export const BlacklistPage = lazy(() =>
  import("./features/applications/blacklist/blacklist-page.tsx").then(({ BlacklistPage }) => ({
    default: BlacklistPage,
  })),
);
export const ForgotPasswordPage = lazy(() =>
  import("./features/auth/forgot-password/forgot-password-page.tsx").then(({ ForgotPasswordPage }) => ({
    default: ForgotPasswordPage,
  })),
);
export const HomePage = lazy(() => import("./pages/home-page.tsx").then(({ HomePage }) => ({ default: HomePage })));
export const ApplicationWorkspacePage = lazy(() =>
  import("./features/applications/application-workspace/page/application-workspace-page.tsx").then(
    ({ ApplicationWorkspacePage }) => ({ default: ApplicationWorkspacePage }),
  ),
);
export const LoginPage = lazy(() =>
  import("./features/auth/login/login-page.tsx").then(({ LoginPage }) => ({ default: LoginPage })),
);
export const NotFoundPage = lazy(() =>
  import("./pages/not-found-page.tsx").then(({ NotFoundPage }) => ({ default: NotFoundPage })),
);
export const PasswordResetPage = lazy(() =>
  import("./features/auth/password-reset/password-reset-page.tsx").then(({ PasswordResetPage }) => ({
    default: PasswordResetPage,
  })),
);
export const RegisterPage = lazy(() =>
  import("./features/auth/register/register-page.tsx").then(({ RegisterPage }) => ({ default: RegisterPage })),
);
