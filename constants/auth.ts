/** Error codes Better Auth appends as `?error=` to the sign-in page. */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
    INVALID_TOKEN: "This sign-in link is invalid or has already been used. Request a new one.",
    EXPIRED_TOKEN: "This sign-in link has expired. Request a new one.",
    ATTEMPTS_EXCEEDED: "This sign-in link has been used too many times. Request a new one.",
    account_not_linked:
        "This email is already linked to another sign-in method. Use the method you signed up with.",
    unable_to_link_account:
        "We couldn't link this sign-in method to your account. Use the method you signed up with.",
    access_denied: "Access was denied. Make sure your account has a verified email address.",
    email_not_found: "Your provider didn't share an email address. Try a different sign-in method.",
};

export const DEFAULT_AUTH_ERROR_MESSAGE = "Something went wrong while signing in. Please try again.";

export const AUTH_SESSION_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;
export const AUTH_SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;
export const MAGIC_LINK_EXPIRES_IN_SECONDS = 15 * 60;

/** Sign-in endpoints Better Auth's 2FA plugin doesn't gate on its own. */
export const TWO_FACTOR_ENFORCED_PATH_PREFIXES = ["/magic-link/verify", "/callback/"];
/** Must match the cookie name and identifier format used by better-auth/plugins/two-factor. */
export const TWO_FACTOR_COOKIE_NAME = "two_factor";
export const TWO_FACTOR_IDENTIFIER_PREFIX = "2fa-";
export const TWO_FACTOR_ATTEMPTS_IDENTIFIER_PREFIX = "2fa-attempts-";
export const TWO_FACTOR_COOKIE_MAX_AGE_SECONDS = 10 * 60;
export const TWO_FACTOR_CODE_LENGTH = 6;
