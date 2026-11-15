import "server-only";

/**
 * Public base URL of the app. Behind Heroku's router `request.url` is an
 * internal address, so prefer the configured URL and only fall back to it.
 */
export function getAppUrl(request: Request) {
    return (
        process.env.NEXT_PUBLIC_APP_URL
        || process.env.BETTER_AUTH_URL
        || new URL(request.url).origin
    );
}
