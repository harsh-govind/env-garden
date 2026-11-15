import type { ReactNode } from "react";

export type LandingSectionProps = {
    id?: string;
    className?: string;
    children: ReactNode;
};

export type LandingCornerMarkProps = {
    className: string;
};

export type LandingLabelProps = {
    children: ReactNode;
    className?: string;
};

export type LandingPrimaryButtonProps = {
    href: string;
    children: ReactNode;
};

export type LandingPreviewRow = {
    key: string;
    value: string;
    by: string;
    when: string;
};

export type LandingFeatureVisual = "cipher" | "access" | "history";

export type LandingFeatureVisualProps = {
    visual: LandingFeatureVisual;
};

export type LandingFeature = {
    label: string;
    title: string;
    body: string;
    visual: LandingFeatureVisual;
};

export type LandingFaq = {
    question: string;
    answer: string;
};

export type LandingTermDetail = {
    term: string;
    detail: string;
};

export type LandingLink = {
    label: string;
    href: string;
    isInternal?: boolean;
};

export type LandingFooterLinksProps = {
    title: string;
    links: LandingLink[];
};

export type GitHubStarsResponse = {
    stars?: number | null;
};
