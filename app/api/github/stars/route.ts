import { NextResponse } from "next/server";
import { APP_REPOSITORY_NAME } from "@/constants/app";
import type { GitHubRepoResponse, UnghRepoResponse } from "@/types/github";

// Cache for an hour so visitors don't burn GitHub's unauthenticated
// rate limit (60 requests/hour per IP).
export const revalidate = 3600;

async function fromGitHub(): Promise<number | null> {
    const response = await fetch(`https://api.github.com/repos/${APP_REPOSITORY_NAME}`, {
        headers: {
            Accept: "application/vnd.github+json",
            ...(process.env.GITHUB_TOKEN
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
                : {}),
        },
        next: { revalidate },
    });

    if (!response.ok) {
        return null;
    }

    const data = (await response.json()) as GitHubRepoResponse;
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
}

// Fallback: ungh.cc is a cached, rate-limit-free GitHub API proxy.
async function fromUngh(): Promise<number | null> {
    const response = await fetch(`https://ungh.cc/repos/${APP_REPOSITORY_NAME}`, {
        next: { revalidate },
    });

    if (!response.ok) {
        return null;
    }

    const data = (await response.json()) as UnghRepoResponse;
    return typeof data.repo?.stars === "number" ? data.repo.stars : null;
}

export async function GET() {
    let stars: number | null = null;

    for (const source of [fromGitHub, fromUngh]) {
        try {
            stars = await source();
        } catch {
            stars = null;
        }

        if (stars !== null) {
            break;
        }
    }

    if (stars === null) {
        return NextResponse.json({ stars: null }, { status: 502 });
    }

    return NextResponse.json(
        { stars },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
}
