import { Route, Routes } from "react-router-dom";
import {
  AboutPage,
  ApplicationWorkspacePage,
  ArchivePage,
  BlacklistPage,
  ForgotPasswordPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  PasswordResetPage,
  RegisterPage,
} from "./app-routes.ts";
import { Layout } from "./components/layout.tsx";
import { GuestOnly, RequireAuth } from "./route-guards.tsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/about" element={<AboutPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/blacklist" element={<BlacklistPage />} />
          <Route path="/applications/:id" element={<ApplicationWorkspacePage />} />
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
  );
}
