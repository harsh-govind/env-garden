import type { RateLimitRule } from "@/types/rate-limit";

/** All app API calls (web and CLI), per user. */
export const API_RATE_LIMIT: RateLimitRule = { bucket: "api", limit: 600, windowSeconds: 60 };
/** Reading decrypted values (reveal, copy all, pull, run), per user. */
export const REVEAL_RATE_LIMIT: RateLimitRule = { bucket: "reveal", limit: 120, windowSeconds: 60 };
/** Starting `eit login`, per IP (unauthenticated). */
export const CLI_LOGIN_RATE_LIMIT: RateLimitRule = { bucket: "cli-login", limit: 20, windowSeconds: 600 };
/** Polling a CLI login request, per IP. */
export const CLI_POLL_RATE_LIMIT: RateLimitRule = { bucket: "cli-poll", limit: 600, windowSeconds: 600 };
/** Better Auth's own endpoints (sign-in, 2FA…). */
export const AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
export const AUTH_RATE_LIMIT_MAX = 60;
