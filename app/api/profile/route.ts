import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAvatarPresetId } from "@/constants/avatar-presets";
import {
    getUserProfile,
    updateUserProfile,
} from "@/prisma/services/user";
import type { UpdateProfileBody } from "@/types/user";

function normalizeName(value: string) {
    return value.trim();
}

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getUserProfile(session.user.id);

        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        return NextResponse.json({
            name: user.name,
            email: user.email,
            avatar: user.avatar,
        });
    } catch (error) {
        console.error("Failed to load profile:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as UpdateProfileBody | null;

        if (!body || typeof body.name !== "string" || typeof body.avatar !== "string") {
            return NextResponse.json(
                { error: "name and avatar are required." },
                { status: 400 }
            );
        }

        const name = normalizeName(body.name);

        if (name.length < 2 || name.length > 80) {
            return NextResponse.json(
                { error: "Name must be between 2 and 80 characters." },
                { status: 400 }
            );
        }

        if (!isAvatarPresetId(body.avatar)) {
            return NextResponse.json(
                { error: "Invalid avatar preset." },
                { status: 400 }
            );
        }

        const updated = await updateUserProfile(session.user.id, {
            name,
            avatar: body.avatar,
        });

        if (!updated) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        return NextResponse.json({
            name: updated.name,
            avatar: updated.avatar,
        });
    } catch (error) {
        console.error("Failed to update profile:", error);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
