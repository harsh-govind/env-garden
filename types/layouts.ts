import type { ReactNode } from "react";

export type RootLayoutProps = Readonly<{
    children: ReactNode;
}>;

export type AuthenticatedLayoutProps = {
    children: ReactNode;
};

export type UnauthenticatedLayoutProps = {
    children: ReactNode;
};
