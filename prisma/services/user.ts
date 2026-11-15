import { prisma } from "@/lib/prisma";
import type {
    UpdatedUserProfileRecord,
    UpdateUserProfileInput,
    UserProfileRecord,
} from "@/types/user";

function isNotFoundError(error: unknown) {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    return "code" in error && (error as { code?: string }).code === "P2025";
}

export async function updateUserName(userId: string, name: string) {
    return prisma.user.update({
        where: { id: userId },
        data: { name },
    });
}

export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            email: true,
            avatar: true,
        },
    });
}

export async function updateUserProfile(
    userId: string,
    input: UpdateUserProfileInput
): Promise<UpdatedUserProfileRecord | null> {
    try {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                name: input.name,
                avatar: input.avatar,
            },
            select: {
                name: true,
                avatar: true,
            },
        });
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }

        throw error;
    }
}
