export const APP_NAME = "Env Garden";
export const APP_WEBSITE_URL = "https://env.garden";
export const APP_REPOSITORY_NAME = "harsh-govind/env-garden";
export const APP_REPOSITORY_URL = `https://github.com/${APP_REPOSITORY_NAME}`;

/** Header the proxy uses to pass the per-request CSP nonce to the app. */
export const CSP_NONCE_HEADER = "x-nonce";

export const SECURITY_HEADERS = [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
