import type {
    EnvironmentTypeOption,
    EnvironmentTypeValue,
} from "@/types/workspace";

export const environmentTypes: EnvironmentTypeOption[] = [
    {
        key: "PRODUCTION",
        label: "Production",
        shortDescription: "Live customer-facing environment.",
        color: "#DC2626",
    },
    {
        key: "STAGING",
        label: "Staging",
        shortDescription: "Production-like pre-release validation environment.",
        color: "#EA580C",
    },
    {
        key: "BETA",
        label: "Beta",
        shortDescription: "External or limited-user release testing environment.",
        color: "#D97706",
    },
    {
        key: "DEVELOPMENT",
        label: "Development",
        shortDescription: "Shared engineering development environment.",
        color: "#2563EB",
    },
    {
        key: "QA",
        label: "QA",
        shortDescription: "Quality assurance verification environment.",
        color: "#7C3AED",
    },
    {
        key: "TESTING",
        label: "Testing",
        shortDescription: "Automated and manual test execution environment.",
        color: "#0891B2",
    },
    {
        key: "UAT",
        label: "UAT",
        shortDescription: "User acceptance testing environment.",
        color: "#4F46E5",
    },
    {
        key: "SANDBOX",
        label: "Sandbox",
        shortDescription: "Isolated experimentation environment.",
        color: "#059669",
    },
    {
        key: "PREVIEW",
        label: "Preview",
        shortDescription: "Ephemeral branch or pull-request preview environment.",
        color: "#0D9488",
    },
    {
        key: "DEMO",
        label: "Demo",
        shortDescription: "Sales, support, or stakeholder demonstration environment.",
        color: "#65A30D",
    },
    {
        key: "CANARY",
        label: "Canary",
        shortDescription: "Partial rollout environment for early production signals.",
        color: "#CA8A04",
    },
    {
        key: "LOCAL",
        label: "Local",
        shortDescription: "Developer machine or local runtime environment.",
        color: "#475569",
    },
    {
        key: "OTHER_1",
        label: "Other 1",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_2",
        label: "Other 2",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_3",
        label: "Other 3",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_4",
        label: "Other 4",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_5",
        label: "Other 5",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_6",
        label: "Other 6",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_7",
        label: "Other 7",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_8",
        label: "Other 8",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
    {
        key: "OTHER_9",
        label: "Other 9",
        shortDescription: "Custom project-specific environment slot.",
        color: "#64748B",
    },
];

export const environmentTypeLabels: Record<EnvironmentTypeValue, string> = Object.fromEntries(
    environmentTypes.map((environmentType) => [environmentType.key, environmentType.label])
) as Record<EnvironmentTypeValue, string>;

export const environmentTypeValues = environmentTypes.map(
    (environmentType) => environmentType.key
);

export const defaultProjectEnvironmentTypes: EnvironmentTypeValue[] = [
    "DEVELOPMENT",
    "STAGING",
    "PRODUCTION",
];

export function isEnvironmentTypeValue(value: unknown): value is EnvironmentTypeValue {
    return typeof value === "string" && environmentTypeValues.includes(value as EnvironmentTypeValue);
}

export function formatEnvironmentFileName(environment: EnvironmentTypeValue) {
    return `.env.${environment.toLowerCase().replaceAll("_", "-")}`;
}