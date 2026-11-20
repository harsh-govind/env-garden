import "server-only";

export function getAppUrl(request: Request) {
    return (
        process.env.NEXT_PUBLIC_APP_URL
        || process.env.BETTER_AUTH_URL
        || new URL(request.url).origin
    );
}
