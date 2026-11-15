import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./constants/app";

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
};

export default nextConfig;
