import type { ProjectRoleValue } from "@/types/project";
import type {
    EnvironmentAccessScopeValue,
    ProjectAccessScopeValue,
    WorkspaceRoleValue,
} from "@/types/workspace";

export const workspaceRoleValues: WorkspaceRoleValue[] = [
    "OWNER",
    "ADMIN",
    "MEMBER",
];

export const projectAccessScopeValues: ProjectAccessScopeValue[] = [
    "ALL_PROJECTS",
    "SELECTED_PROJECTS",
];

export const environmentAccessScopeValues: EnvironmentAccessScopeValue[] = [
    "ALL_ENVIRONMENTS",
    "SELECTED_ENVIRONMENTS",
];

export const projectRoleValues: ProjectRoleValue[] = [
    "OWNER",
    "CONTRIBUTOR",
    "VIEWER",
];

export function isWorkspaceRoleValue(value: unknown): value is WorkspaceRoleValue {
    return typeof value === "string" && workspaceRoleValues.includes(value as WorkspaceRoleValue);
}

export function isProjectAccessScopeValue(value: unknown): value is ProjectAccessScopeValue {
    return typeof value === "string" && projectAccessScopeValues.includes(value as ProjectAccessScopeValue);
}

export function isEnvironmentAccessScopeValue(value: unknown): value is EnvironmentAccessScopeValue {
    return typeof value === "string" && environmentAccessScopeValues.includes(value as EnvironmentAccessScopeValue);
}

export function isProjectRoleValue(value: unknown): value is ProjectRoleValue {
    return typeof value === "string" && projectRoleValues.includes(value as ProjectRoleValue);
}

export function canViewHistory(role: WorkspaceRoleValue) {
    return role === "OWNER" || role === "ADMIN";
}

export function canManageWorkspaceMembers(role: WorkspaceRoleValue) {
    return role === "OWNER" || role === "ADMIN";
}