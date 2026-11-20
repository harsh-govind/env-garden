export type RateLimitRule = {
    bucket: string;
    limit: number;
    windowSeconds: number;
};

export type RateLimitResult = {
    allowed: boolean;
    retryAfterSeconds: number;
};
