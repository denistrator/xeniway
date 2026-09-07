import type { ApplicationRepository, SessionRepository, UserRepository } from "../db/repository";
import type { AuthService, PasswordHasher } from "../services/auth";
import type { RateLimiter } from "../services/rate-limit";

export type AppDependencies = {
  users: UserRepository;
  sessions: SessionRepository;
  applications: ApplicationRepository;
  health?: () => Promise<boolean>;
  redisHealth?: () => Promise<boolean>;
  passwordHasher?: PasswordHasher;
  authRateLimiter?: RateLimiter;
};

export type RouteDependencies = {
  applications: ApplicationRepository;
  auth: AuthService;
  authRateLimiter: RateLimiter;
  databaseHealth: () => Promise<boolean>;
  redisHealth: () => Promise<boolean>;
};
