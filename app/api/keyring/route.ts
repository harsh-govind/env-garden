import { NextResponse } from "next/server";
import { API_RATE_LIMIT } from "@/constants/rate-limit";
import { getSession } from "@/lib/auth";
import { parseKeyringBody, serializeKeyring } from "@/lib/keyring";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
    createKeyringForUser,
    getKeyringForUser,
    replaceKeyringForUser,
    rewrapKeyringForUser,
} from "@/prisma/services/keyring";
import type { SaveKeyringBody } from "@/types/keyring";

const noStoreHeaders = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: noStoreHeaders });
}

async function authorize() {
    const session = await getSession();

    if (!session?.user?.id) {
        return { response: json({ error: "Unauthorized" }, 401) };
    }

    const limited = await rateLimitResponse(API_RATE_LIMIT, session.user.id);

    if (limited) {
        return { response: limited };
    }

    return { userId: session.user.id };
}

async function readKeyringBody(request: Request) {
    const body = (await request.json().catch(() => null)) as SaveKeyringBody | null;
    return parseKeyringBody(body);
}

export async function GET() {
    try {
        const auth = await authorize();

        if ("response" in auth) {
            return auth.response;
        }

        const keyring = await getKeyringForUser(auth.userId);

        return json({ keyring: keyring ? serializeKeyring(keyring) : null });
    } catch (error) {
        console.error("Failed to load keyring:", error);
        return json({ error: "Internal server error." }, 500);
    }
}

export async function POST(request: Request) {
    try {
        const auth = await authorize();

        if ("response" in auth) {
            return auth.response;
        }

        const parsed = await readKeyringBody(request);

        if ("error" in parsed) {
            return json({ error: parsed.error }, 400);
        }

        const result = await createKeyringForUser(auth.userId, parsed.value);

        if (result.status !== "OK") {
            return json({ error: "Your account already has encryption keys." }, 409);
        }

        return json({ keyring: serializeKeyring(result.keyring) }, 201);
    } catch (error) {
        console.error("Failed to create keyring:", error);
        return json({ error: "Internal server error." }, 500);
    }
}

export async function PATCH(request: Request) {
    try {
        const auth = await authorize();

        if ("response" in auth) {
            return auth.response;
        }

        const parsed = await readKeyringBody(request);

        if ("error" in parsed) {
            return json({ error: parsed.error }, 400);
        }

        const result = await rewrapKeyringForUser(auth.userId, parsed.value);

        if (result.status === "NOT_FOUND") {
            return json({ error: "Set up encryption keys first." }, 404);
        }

        if (result.status !== "OK") {
            return json({ error: "Changing the passphrase cannot change your keys." }, 409);
        }

        return json({ keyring: serializeKeyring(result.keyring) });
    } catch (error) {
        console.error("Failed to update keyring:", error);
        return json({ error: "Internal server error." }, 500);
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await authorize();

        if ("response" in auth) {
            return auth.response;
        }

        const parsed = await readKeyringBody(request);

        if ("error" in parsed) {
            return json({ error: parsed.error }, 400);
        }

        const result = await replaceKeyringForUser(auth.userId, parsed.value);

        if (result.status !== "OK") {
            return json({ error: "Those keys are already in use." }, 409);
        }

        return json({ keyring: serializeKeyring(result.keyring) });
    } catch (error) {
        console.error("Failed to reset keyring:", error);
        return json({ error: "Internal server error." }, 500);
    }
}
