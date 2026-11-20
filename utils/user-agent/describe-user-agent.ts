export function describeUserAgent(userAgent: string | null) {
    if (!userAgent) {
        return "Unknown device";
    }

    const browser =
        /Edg\//.test(userAgent) ? "Edge"
            : /OPR\//.test(userAgent) ? "Opera"
                : /Brave/.test(userAgent) ? "Brave"
                    : /Firefox\//.test(userAgent) ? "Firefox"
                        : /Chrome\//.test(userAgent) ? "Chrome"
                            : /Safari\//.test(userAgent) ? "Safari"
                                : "Browser";
    const os =
        /iPhone|iPad/.test(userAgent) ? "iOS"
            : /Android/.test(userAgent) ? "Android"
                : /Mac OS X|Macintosh/.test(userAgent) ? "macOS"
                    : /Windows/.test(userAgent) ? "Windows"
                        : /Linux/.test(userAgent) ? "Linux"
                            : "unknown OS";

    return `${browser} on ${os}`;
}
