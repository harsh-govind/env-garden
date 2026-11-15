export const AUTH_ERROR_MESSAGES: Record<string, string> = {
    OAuthAccountNotLinked:
        "This email is already linked to another sign-in method. Use the method you signed up with.",
    AccessDenied: "Access was denied. Make sure your account has a verified email address.",
    Verification: "This sign-in link is invalid or has expired. Request a new one.",
    EmailSignin: "We couldn't send the sign-in email. Try again in a moment.",
    SessionRequired: "Please sign in to continue.",
};

export const DEFAULT_AUTH_ERROR_MESSAGE = "Something went wrong while signing in. Please try again.";

export const APP_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
/** How often a session's "last seen" time is refreshed. */
export const APP_SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
export const APP_SESSION_REVOKED_ERROR = "APP_SESSION_REVOKED";
/** Prefix for the shared session that adopts sign-ins made before sessions were tracked. */
export const LEGACY_APP_SESSION_ID_PREFIX = "legacy_";
