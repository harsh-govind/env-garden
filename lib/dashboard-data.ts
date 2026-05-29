import type { DashboardData } from "@/types/dashboard";

function getWorkspaceName(name?: string | null) {
    if (!name) {
        return "moonn Inc.";
    }

    const firstName = name.trim().split(" ")[0];

    if (!firstName) {
        return "moonn Inc.";
    }

    return `${firstName} Inc.`;
}

function getWorkspaceInitial(workspaceName: string) {
    const alpha = workspaceName.match(/[a-z]/i);
    return alpha ? alpha[0].toUpperCase() : "E";
}

export function getDashboardData(name?: string | null): DashboardData {
    const workspaceName = getWorkspaceName(name);

    return {
        shell: {
            workspaceName,
            workspaceInitial: getWorkspaceInitial(workspaceName),
            projectName: "My project",
            breadcrumbs: ["Projects"],
            sidebarSections: [
                {
                    id: "projects",
                    title: "Projects",
                    items: [
                        {
                            id: "projects-overview",
                            label: "Projects",
                            icon: "projects",
                            active: true,
                        },
                        {
                            id: "blueprints",
                            label: "Blueprints",
                            icon: "blueprints",
                        },
                        {
                            id: "environment-groups",
                            label: "Environment Groups",
                            icon: "environment-groups",
                        },
                    ],
                },
                {
                    id: "integrations",
                    title: "Integrations",
                    items: [
                        {
                            id: "observability",
                            label: "Observability",
                            icon: "observability",
                        },
                        {
                            id: "webhooks",
                            label: "Webhooks",
                            icon: "webhooks",
                        },
                        {
                            id: "notifications",
                            label: "Notifications",
                            icon: "notifications",
                        },
                    ],
                },
                {
                    id: "networking",
                    title: "Networking",
                    items: [
                        {
                            id: "private-links",
                            label: "Private Links",
                            icon: "private-links",
                        },
                        {
                            id: "dedicated-ips",
                            label: "Dedicated IPs",
                            icon: "dedicated-ips",
                            badge: "New",
                        },
                    ],
                },
                {
                    id: "workspace",
                    title: "Workspace",
                    items: [
                        {
                            id: "billing",
                            label: "Billing",
                            icon: "billing",
                        },
                        {
                            id: "settings",
                            label: "Settings",
                            icon: "settings",
                        },
                    ],
                },
            ],
            sidebarFooter: [
                {
                    id: "changelog",
                    label: "Changelog",
                    icon: "changelog",
                },
                {
                    id: "invite",
                    label: "Invite a friend",
                    icon: "invite",
                },
                {
                    id: "support",
                    label: "Contact support",
                    icon: "support",
                },
                {
                    id: "status",
                    label: "Render Status",
                    icon: "status",
                },
            ],
        },
        home: {
            title: "Overview",
            subtitle: "Project dashboard",
            createProjectLabel: "New",
            addEnvironmentLabel: "Add environment",
            projects: [
                {
                    id: "my-project",
                    name: "My project",
                    healthLabel: "All services are up and running",
                    serviceCount: 4,
                },
            ],
            environment: {
                id: "production",
                name: "Production",
                tabs: [
                    {
                        id: "all",
                        label: "All",
                        count: 4,
                        active: true,
                    },
                    {
                        id: "services",
                        label: "Services",
                        count: 4,
                    },
                    {
                        id: "env-groups",
                        label: "Env Groups",
                        count: 0,
                    },
                ],
                services: [
                    {
                        id: "moonn",
                        name: "moonn",
                        status: "deployed",
                        runtime: "Node",
                        region: "Virginia",
                        updated: "1d",
                    },
                    {
                        id: "moonn-beta",
                        name: "moonn-beta",
                        status: "manual-suspended",
                        runtime: "Node",
                        region: "Virginia",
                        updated: "5d",
                    },
                    {
                        id: "moonn-microservices",
                        name: "moonn-microservices",
                        status: "deployed",
                        runtime: "Node",
                        region: "Virginia",
                        updated: "4d",
                    },
                    {
                        id: "moonn-microservices-beta",
                        name: "moonn-microservices-beta",
                        status: "manual-suspended",
                        runtime: "Node",
                        region: "Virginia",
                        updated: "2mo",
                    },
                ],
            },
            searchPlaceholder: "Search resources in Production",
        },
    };
}