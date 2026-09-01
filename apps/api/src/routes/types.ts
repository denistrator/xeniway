import type { ApplicationRepository, SessionRepository, UserRepository } from "../db/repository";
import type { AuthService, PasswordHasher } from "../services/auth";
import type { SlidingWindowRateLimiter } from "../services/rate-limit";

export type AppDependencies = {
  users: UserRepository;
  sessions: SessionRepository;
  applications: ApplicationRepository;
  health?: () => Promise<boolean>;
  passwordHasher?: PasswordHasher;
  authRateLimiter?: SlidingWindowRateLimiter;
};

export type RouteDependencies = {
  applications: ApplicationRepository;
  auth: AuthService;
  authRateLimiter: SlidingWindowRateLimiter;
  databaseHealth: () => Promise<boolean>;
};
