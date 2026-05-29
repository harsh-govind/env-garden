export type DashboardIconName =
    | "projects"
    | "blueprints"
    | "environment-groups"
    | "observability"
    | "webhooks"
    | "notifications"
    | "private-links"
    | "dedicated-ips"
    | "billing"
    | "settings"
    | "changelog"
    | "invite"
    | "support"
    | "status";

export type DashboardSidebarItem = {
    id: string;
    label: string;
    icon: DashboardIconName;
    href?: string;
    active?: boolean;
    badge?: string;
};

export type DashboardSidebarSection = {
    id: string;
    title: string;
    items: DashboardSidebarItem[];
};

export type DashboardProjectCard = {
    id: string;
    name: string;
    healthLabel: string;
    serviceCount: number;
};

export type DashboardProjectTab = {
    id: string;
    label: string;
    count: number;
    active?: boolean;
};

export type DashboardServiceStatus = "deployed" | "manual-suspended";

export type DashboardService = {
    id: string;
    name: string;
    status: DashboardServiceStatus;
    runtime: string;
    region: string;
    updated: string;
};

export type DashboardEnvironment = {
    id: string;
    name: string;
    tabs: DashboardProjectTab[];
    services: DashboardService[];
};

export type DashboardShellData = {
    workspaceName: string;
    workspaceInitial: string;
    projectName: string;
    breadcrumbs: string[];
    sidebarSections: DashboardSidebarSection[];
    sidebarFooter: DashboardSidebarItem[];
};

export type DashboardHomeData = {
    title: string;
    subtitle: string;
    createProjectLabel: string;
    addEnvironmentLabel: string;
    projects: DashboardProjectCard[];
    environment: DashboardEnvironment;
    searchPlaceholder: string;
};

export type DashboardData = {
    shell: DashboardShellData;
    home: DashboardHomeData;
};