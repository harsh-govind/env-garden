"use client";

import {
    ArrowRight,
    FolderTree,
    GitBranch,
    History,
    KeyRound,
    ShieldCheck,
    Sprout,
    Terminal,
    Users,
} from "lucide-react";
import AuthButtons from "@/components/auth/auth-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, APP_REPOSITORY_URL } from "@/constants/app";

const features = [
    {
        icon: ShieldCheck,
        title: "Encrypted at rest",
        description:
            "Variable values are encrypted before they reach the database. No more secrets in chat threads or screenshots.",
    },
    {
        icon: FolderTree,
        title: "Workspaces & projects",
        description:
            "Organize env files by workspace and project, so every environment has one source of truth.",
    },
    {
        icon: Users,
        title: "Team access control",
        description:
            "Invite teammates by email and decide who can see and edit each workspace.",
    },
    {
        icon: History,
        title: "Change history",
        description:
            "Every change is recorded, so you can see who changed what and when.",
    },
    {
        icon: Terminal,
        title: "CLI for your terminal",
        description:
            "Sign in from the terminal with a browser approval flow. Tokens are stored with user-only permissions.",
    },
    {
        icon: GitBranch,
        title: "Open source",
        description:
            "MIT licensed and built in the open. Read the code, report issues, or self-host it.",
    },
];

const steps = [
    {
        title: "Create a workspace",
        description: "Sign in and set up a workspace for your team.",
    },
    {
        title: "Add your env files",
        description: "Create projects and add the variables each one needs.",
    },
    {
        title: "Share with your team",
        description: "Invite teammates. They get access without copy-pasting secrets.",
    },
];

function scrollToSignIn() {
    document.getElementById("sign-in")?.scrollIntoView({ behavior: "smooth" });
}

export default function UnauthenticatedHome() {
    return (
        <div className="flex w-full flex-1 flex-col">
            <header className="border-b">
                <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-2 font-semibold tracking-tight">
                        <Sprout className="size-5" />
                        {APP_NAME}
                    </div>
                    <nav className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <a href={APP_REPOSITORY_URL} target="_blank" rel="noreferrer">
                                <GitBranch />
                                GitHub
                            </a>
                        </Button>
                        <Button size="sm" onClick={scrollToSignIn}>
                            Sign in
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                    <div className="space-y-6">
                        <Badge variant="outline" className="uppercase">
                            Early access · Open source
                        </Badge>
                        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                            Envs, simplified.
                        </h1>
                        <p className="max-w-xl text-lg text-muted-foreground">
                            {APP_NAME} is a secure home for your team&apos;s environment
                            variables. Store, organize, and share <code className="font-mono">.env</code> files
                            without passing secrets around in messages.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button size="lg" onClick={scrollToSignIn}>
                                Get started
                                <ArrowRight />
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <a href={APP_REPOSITORY_URL} target="_blank" rel="noreferrer">
                                    <GitBranch />
                                    View on GitHub
                                </a>
                            </Button>
                        </div>
                    </div>

                    <Card className="w-full font-mono text-sm">
                        <CardContent className="space-y-1">
                            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <KeyRound className="size-3.5" />
                                api / production.env
                            </div>
                            <p><span className="text-muted-foreground">DATABASE_URL=</span>••••••••••••</p>
                            <p><span className="text-muted-foreground">STRIPE_SECRET_KEY=</span>••••••••••••</p>
                            <p><span className="text-muted-foreground">RESEND_API_KEY=</span>••••••••••••</p>
                            <p><span className="text-muted-foreground">NEXTAUTH_SECRET=</span>••••••••••••</p>
                            <div className="mt-4 border-t pt-4 text-xs text-muted-foreground">
                                <span className="text-foreground">$</span> eit login
                                <br />
                                Opening browser to approve this device…
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="border-t bg-muted/30">
                    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Everything your env files need
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            One place to keep configuration safe and in sync across your team.
                        </p>
                        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map(({ icon: Icon, title, description }) => (
                                <Card key={title}>
                                    <CardContent className="space-y-2">
                                        <Icon className="size-5" />
                                        <h3 className="font-medium">{title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {description}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            How it works
                        </h2>
                        <ol className="mt-10 grid gap-8 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <li key={step.title} className="space-y-2">
                                    <span className="flex size-8 items-center justify-center border font-mono text-sm">
                                        {index + 1}
                                    </span>
                                    <h3 className="font-medium">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {step.description}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section id="sign-in" className="scroll-mt-8 border-t bg-muted/30">
                    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center">
                        <div className="space-y-3">
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Start growing your garden
                            </h2>
                            <p className="text-muted-foreground">
                                Sign in with email, Google, or GitHub to create your first workspace.
                            </p>
                        </div>
                        <Card className="w-full">
                            <CardContent className="flex justify-center">
                                <AuthButtons isAuthenticated={false} />
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>

            <footer className="border-t">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <span>© {new Date().getFullYear()} {APP_NAME}. MIT licensed.</span>
                    <a
                        href={APP_REPOSITORY_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground"
                    >
                        {APP_REPOSITORY_URL.replace("https://", "")}
                    </a>
                </div>
            </footer>
        </div>
    );
}
