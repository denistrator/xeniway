import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout";
import { LoadingScreen } from "./components/loading-screen";
import { GuestOnly, RequireAuth } from "./route-guards";

const AboutPage = lazy(() => import("./pages/about-page").then(({ AboutPage }) => ({ default: AboutPage })));
const ArchivePage = lazy(() =>
  import("./features/applications/archive/archive-page").then(({ ArchivePage }) => ({ default: ArchivePage })),
);
const BlacklistPage = lazy(() =>
  import("./features/applications/blacklist/blacklist-page").then(({ BlacklistPage }) => ({ default: BlacklistPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./features/auth/forgot-password/forgot-password-page").then(({ ForgotPasswordPage }) => ({
    default: ForgotPasswordPage,
  })),
);
const HomePage = lazy(() => import("./pages/home-page").then(({ HomePage }) => ({ default: HomePage })));
const LoginPage = lazy(() =>
  import("./features/auth/login/login-page").then(({ LoginPage }) => ({ default: LoginPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/not-found-page").then(({ NotFoundPage }) => ({ default: NotFoundPage })),
);
const PasswordResetPage = lazy(() =>
  import("./features/auth/password-reset/password-reset-page").then(({ PasswordResetPage }) => ({
    default: PasswordResetPage,
  })),
);
const RegisterPage = lazy(() =>
  import("./features/auth/register/register-page").then(({ RegisterPage }) => ({ default: RegisterPage })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/about" element={<AboutPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/blacklist" element={<BlacklistPage />} />
          </Route>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
