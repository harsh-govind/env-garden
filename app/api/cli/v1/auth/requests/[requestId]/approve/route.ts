import { NextResponse } from "next/server";
import { cliNoStoreHeaders } from "@/constants/cli";
import { getSession } from "@/lib/auth";
import { approveCliLoginRequest } from "@/lib/cli/login";
import { decodeBase64Field } from "@/lib/crypto-payload";
import { getKeyringForUser } from "@/prisma/services/keyring";
import type {
    ApproveCliLoginRequestBody,
    CliLoginRequestRouteContext,
} from "@/types/cli";

const ENCRYPTED_SERVER_SHARE_BYTE_LENGTH = 24 + 32 + 16;
const SEALED_PACKAGE_BYTE_LENGTH = 64 + 48;

export async function POST(
    request: Request,
    context: CliLoginRequestRouteContext
) {
    try {
        const session = await getSession();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401, headers: cliNoStoreHeaders }
            );
        }

        const body = (await request.json().catch(() => null)) as ApproveCliLoginRequestBody | null;
        const encryptedServerShare = decodeBase64Field(
            body?.encryptedServerShare,
            ENCRYPTED_SERVER_SHARE_BYTE_LENGTH
        );
        const sealedPackage = decodeBase64Field(body?.sealedPackage, SEALED_PACKAGE_BYTE_LENGTH);

        if (!encryptedServerShare || !sealedPackage) {
            return NextResponse.json(
                { error: "Unlock your vault in the browser to authorize the CLI." },
                { status: 400, headers: cliNoStoreHeaders }
            );
        }

        if (!(await getKeyringForUser(session.user.id))) {
            return NextResponse.json(
                { error: "Set up your encryption keys before authorizing the CLI." },
                { status: 409, headers: cliNoStoreHeaders }
            );
        }

        const { requestId } = await context.params;
        const result = await approveCliLoginRequest({
            requestId,
            userId: session.user.id,
            encryptedServerShare,
            sealedPackage,
        });

        if (result.status === "NOT_FOUND") {
            return NextResponse.json(
                { error: "CLI login request not found." },
                { status: 404, headers: cliNoStoreHeaders }
            );
        }

        if (result.status === "EXPIRED") {
            return NextResponse.json(
                { error: "CLI login request has expired." },
                { status: 410, headers: cliNoStoreHeaders }
            );
        }

        return NextResponse.json(
            { success: true },
            { headers: cliNoStoreHeaders }
        );
    } catch (error) {
        console.error("Failed to approve CLI login request:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500, headers: cliNoStoreHeaders }
        );
    }
}
