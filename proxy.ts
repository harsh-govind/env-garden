import { NextResponse, type NextRequest } from "next/server";
import { CSP_NONCE_HEADER } from "@/constants/app";
import { buildContentSecurityPolicy } from "@/lib/csp";

export function proxy(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const policy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set(CSP_NONCE_HEADER, nonce);
    requestHeaders.set("Content-Security-Policy", policy);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", policy);

    return response;
}

export const config = {
    matcher: [
        {
            source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};
