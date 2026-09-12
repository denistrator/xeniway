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
};
