import {
    isEnvironmentAccessScopeValue,
    isProjectAccessScopeValue,
    isProjectRoleValue,
    isWorkspaceRoleValue,
} from "@/constants/access";
import { isEnvironmentTypeValue } from "@/constants/environment";
import type {
    InviteWorkspaceMemberBody,
    MemberAccessInput,
    MemberProjectAccessInput,
    UpdateWorkspaceMemberBody,
} from "@/types/member";
import type { ProjectRoleValue } from "@/types/project";
import type {
    EnvironmentAccessScopeValue,
    ProjectAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInviteEmail(value: unknown) {
    const email = typeof value === "string" ? value.trim().toLowerCase() : "";

    if (!emailPattern.test(email)) {
        return { error: "Enter a valid email address." };
    }

    if (email.length > 254) {
        return { error: "Email address must be 254 characters or less." };
    }

    return { value: email };
}

function getForcedProjectRole(role: WorkspaceRoleValue): ProjectRoleValue | null {
    if (role === "ADMIN") {
        return "CONTRIBUTOR";
    }

    return null;
}

function isAssignableProjectRole(role: ProjectRoleValue) {
    return role !== "OWNER";
}

function parseProjectAccesses(
    projects: unknown
): { value: MemberProjectAccessInput[] } | { error: string } {
    if (!Array.isArray(projects)) {
        return { error: "Select at least one project." };
    }

    if (projects.length === 0) {
        return { error: "Select at least one project." };
    }

    const seenProjectIds = new Set<string>();
    const values: MemberProjectAccessInput[] = [];

    for (const rawProject of projects) {
        if (!rawProject || typeof rawProject !== "object") {
            return { error: "Each project access must be an object." };
        }

        const project = rawProject as Record<string, unknown>;
        const projectId =
            typeof project.projectId === "string" ? project.projectId.trim() : "";

        if (!projectId) {
            return { error: "Project id is required for project access." };
        }

        if (seenProjectIds.has(projectId)) {
            return { error: "Project access includes a duplicate project." };
        }

        if (!isProjectRoleValue(project.role) || !isAssignableProjectRole(project.role)) {
            return { error: "Select a valid project role." };
        }

        if (!isEnvironmentAccessScopeValue(project.environmentAccessScope)) {
            return { error: "Select a valid environment access scope." };
        }

        const environments = Array.isArray(project.environments)
            ? [...new Set(project.environments)]
            : [];

        if (
            project.environmentAccessScope === "SELECTED_ENVIRONMENTS" &&
            environments.length === 0
        ) {
            return { error: "Select at least one environment for each selected project." };
        }

        if (
            project.environmentAccessScope === "SELECTED_ENVIRONMENTS" &&
            environments.some((environment) => !isEnvironmentTypeValue(environment))
        ) {
            return { error: "Project environments include an unsupported value." };
        }

        seenProjectIds.add(projectId);
        values.push({
            projectId,
            role: project.role,
            environmentAccessScope: project.environmentAccessScope,
            environments:
                project.environmentAccessScope === "ALL_ENVIRONMENTS"
                    ? []
                    : environments,
        });
    }

    return { value: values };
}

export function parseMemberAccessBody(
    body: InviteWorkspaceMemberBody | UpdateWorkspaceMemberBody
): { value: MemberAccessInput } | { error: string } {
    if (!isWorkspaceRoleValue(body.role)) {
        return { error: "Select a valid workspace role." };
    }

    if (body.role === "OWNER") {
        return { error: "Owner cannot be assigned or invited." };
    }

    const forcedProjectRole = getForcedProjectRole(body.role);

    if (forcedProjectRole) {
        return {
            value: {
                role: body.role,
                projectAccessScope: "ALL_PROJECTS",
                defaultProjectRole: forcedProjectRole,
                defaultEnvironmentAccessScope: "ALL_ENVIRONMENTS",
                projects: [],
            },
        };
    }

    const projectAccessScope: ProjectAccessScopeValue =
        isProjectAccessScopeValue(body.projectAccessScope)
            ? body.projectAccessScope
            : "SELECTED_PROJECTS";
    const defaultProjectRole: ProjectRoleValue = isProjectRoleValue(
        body.defaultProjectRole
    ) && isAssignableProjectRole(body.defaultProjectRole)
        ? body.defaultProjectRole
        : "VIEWER";
    const defaultEnvironmentAccessScope: EnvironmentAccessScopeValue =
        "ALL_ENVIRONMENTS";

    if (projectAccessScope === "ALL_PROJECTS") {
        return {
            value: {
                role: body.role,
                projectAccessScope,
                defaultProjectRole,
                defaultEnvironmentAccessScope,
                projects: [],
            },
        };
    }

    const parsedProjects = parseProjectAccesses(body.projects);

    if ("error" in parsedProjects) {
        return { error: parsedProjects.error };
    }

    return {
        value: {
            role: body.role,
            projectAccessScope,
            defaultProjectRole: "VIEWER",
            defaultEnvironmentAccessScope,
            projects: parsedProjects.value,
        },
    };
}
