import type { RateLimitRule } from "@/types/rate-limit";

export const API_RATE_LIMIT: RateLimitRule = { bucket: "api", limit: 600, windowSeconds: 60 };
export const REVEAL_RATE_LIMIT: RateLimitRule = { bucket: "reveal", limit: 120, windowSeconds: 60 };
export const CLI_LOGIN_RATE_LIMIT: RateLimitRule = { bucket: "cli-login", limit: 20, windowSeconds: 600 };
export const CLI_POLL_RATE_LIMIT: RateLimitRule = { bucket: "cli-poll", limit: 600, windowSeconds: 600 };
export const AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
export const AUTH_RATE_LIMIT_MAX = 60;
