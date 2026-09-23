import type {
  ApplicationRepository,
  PasswordResetTokenRepository,
  SessionRepository,
  UserPreferencesRepository,
  UserRepository,
} from "../db/repository";
import type { AuthService, PasswordHasher } from "../services/auth";
import type { PasswordResetMailer } from "../services/mailer";
import type { PasswordResetService } from "../services/password-reset";
import type { RateLimiter } from "../services/rate-limit";

export type AppDependencies = {
  users: UserRepository;
  sessions: SessionRepository;
  preferences: UserPreferencesRepository;
  applications: ApplicationRepository;
  health?: () => Promise<boolean>;
  redisHealth?: () => Promise<boolean>;
  passwordHasher?: PasswordHasher;
  authRateLimiter?: RateLimiter;
  passwordResetTokens?: PasswordResetTokenRepository;
  passwordResetMailer?: PasswordResetMailer;
  passwordResetRateLimiter?: RateLimiter;
  appOrigin?: string;
  corsOrigin?: string;
  secureCookies?: boolean;
  passwordReset?: PasswordResetService;
};

export type RouteDependencies = {
  applications: ApplicationRepository;
  preferences: UserPreferencesRepository;
  auth: AuthService;
  authRateLimiter: RateLimiter;
  passwordReset?: PasswordResetService;
  databaseHealth: () => Promise<boolean>;
  redisHealth: () => Promise<boolean>;
  secureCookies: boolean;
};

export type ApplicationRouteDependencies = Pick<RouteDependencies, "applications" | "auth">;
export type HealthRouteDependencies = Pick<RouteDependencies, "databaseHealth" | "redisHealth">;
export type PreferencesRouteDependencies = Pick<RouteDependencies, "auth" | "preferences">;
export type AuthSessionRouteDependencies = Pick<RouteDependencies, "auth" | "authRateLimiter" | "secureCookies">;
export type CsrfRouteDependencies = Pick<RouteDependencies, "auth" | "secureCookies">;
export type PasswordResetRouteDependencies = Pick<RouteDependencies, "auth" | "passwordReset">;
export type AuthRoutesDependencies = AuthSessionRouteDependencies &
  CsrfRouteDependencies &
  PasswordResetRouteDependencies;
