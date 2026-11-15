"use client";

import {
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    EyeOff,
    GitBranch,
    History,
    KeyRound,
    LockKeyhole,
    PackageCheck,
    ShieldCheck,
    Terminal,
    UsersRound,
    Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa6";
import { CustomCursor } from "@/components/landing/custom-cursor";
import { satoshi } from "@/components/landing/fonts";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PixelCanvas } from "@/components/ui/pixel-canvas";
import { ScrollBasedVelocity } from "@/components/ui/scroll-based-velocity";
import { APP_REPOSITORY_NAME, APP_REPOSITORY_URL } from "@/constants/app";

const FALLBACK_STARS = 6;
const SIGN_IN_HREF = "/signin";

function formatStars(stars: number) {
    return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}

function useGitHubStars() {
    const [stars, setStars] = useState(FALLBACK_STARS);

    useEffect(() => {
        const controller = new AbortController();

        fetch(`https://api.github.com/repos/${APP_REPOSITORY_NAME}`, {
            headers: { Accept: "application/vnd.github+json" },
            signal: controller.signal,
        })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { stargazers_count?: number } | null) => {
                if (typeof data?.stargazers_count === "number") {
                    setStars(data.stargazers_count);
                }
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, []);

    return stars;
}

const benefits = [
    {
        icon: EyeOff,
        title: "Stop sharing secrets in chat",
        body: "Keep API keys, database URLs, and service tokens out of screenshots, docs, and message threads.",
    },
    {
        icon: UsersRound,
        title: "Onboard teammates faster",
        body: "Give new developers the environment sets they need without chasing stale local files.",
    },
    {
        icon: History,
        title: "Know what changed",
        body: "Make configuration changes visible so production, preview, and local environments stay understandable.",
    },
];

const securityPoints = [
    "256-bit AES-GCM encryption",
    "Project-scoped encryption keys",
    "Per-value encrypted payloads",
    "Private vulnerability reporting",
];

const workflow = [
    "Create a workspace",
    "Add projects and env files",
    "Invite the right teammates",
    "Share encrypted configuration",
];

const openSourcePoints = [
    { icon: PackageCheck, label: "MIT licensed" },
    { icon: GitBranch, label: "Public TypeScript repo" },
    { icon: FaGithub, label: "Open-source project" },
];

const faqs = [
    {
        question: "What is env.garden?",
        answer:
            "env.garden is an open-source tool for storing, managing, and sharing environment variables securely across teams.",
    },
    {
        question: "How are secrets protected?",
        answer:
            "The project uses 256-bit AES-GCM encryption and project-scoped encryption keys for environment values.",
    },
    {
        question: "Is env.garden open source?",
        answer:
            "Yes. The repository is public, MIT licensed, and welcomes issues, ideas, documentation improvements, and pull requests.",
    },
    {
        question: "Who is this for?",
        answer:
            "It is built for developers and teams that need a safer way to share .env files during onboarding, local development, and environment changes.",
    },
    {
        question: "Is there a CLI?",
        answer:
            "Yes. Install @env-garden/cli and run `eit login` to approve your device in the browser. Tokens are verified before they are stored with user-only permissions.",
    },
    {
        question: "Can I report a security issue publicly?",
        answer:
            "No. The project asks that vulnerabilities are reported privately first instead of opening public issues with exploit details.",
    },
];

export default function UnauthenticatedHome() {
    const formattedStars = formatStars(useGitHubStars());

    return (
        <div
            className={`${satoshi.variable} ${satoshi.className} min-h-screen w-full overflow-x-clip bg-background text-foreground`}
        >
            <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
                <div className="technical-grid">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
                        <a href="#" className="flex items-center gap-3" aria-label="env.garden">
                            <span className="grid size-9 place-items-center bg-primary text-primary-foreground">
                                <KeyRound className="size-4" aria-hidden="true" />
                            </span>
                            <span className="text-sm font-semibold tracking-tight">env.garden</span>
                        </a>

                        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
                            <a className="transition hover:text-foreground" href="#product">Product</a>
                            <a className="transition hover:text-foreground" href="#security">Security</a>
                            <a className="transition hover:text-foreground" href="#cli">CLI</a>
                            <a className="transition hover:text-foreground" href="#faq">FAQ</a>
                        </nav>

                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <Button asChild variant="outline" size="sm" className="h-9 px-3">
                                <a href={APP_REPOSITORY_URL}>
                                    <FaGithub className="size-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">GitHub</span>
                                    <span className="bg-foreground px-1.5 py-0.5 text-xs font-medium text-background">
                                        {formattedStars}
                                    </span>
                                </a>
                            </Button>
                            <Button asChild size="sm" className="h-9 px-3">
                                <a href={SIGN_IN_HREF}>
                                    Sign in
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                <section className="technical-grid relative flex min-h-[calc(100svh-73px)] flex-col overflow-hidden border-b">
                    <PixelCanvas
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0 opacity-[0.1] dark:opacity-25"
                        colors={["#000000", "#ffffff"]}
                        gap={18}
                        speed={0.04}
                        variant="trail"
                    />

                    <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
                        <div className="animate-rise">
                            <div className="mb-6 inline-flex items-center gap-2 border bg-background px-3 py-1 text-sm font-medium">
                                <BadgeCheck className="size-4" aria-hidden="true" />
                                Open-source secrets workspace
                            </div>

                            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.04] tracking-normal sm:text-5xl lg:text-6xl">
                                Share .env files without leaking secrets.
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                                env.garden gives engineering teams a secure place to manage
                                environment variables, control access, and keep local setup from
                                becoming a security risk.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button asChild size="lg" className="h-11 px-4 text-sm">
                                    <a href={SIGN_IN_HREF}>
                                        Get started
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                    </a>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="h-11 px-4 text-sm">
                                    <a href={APP_REPOSITORY_URL}>
                                        <FaGithub className="size-4" aria-hidden="true" />
                                        Star on GitHub
                                    </a>
                                </Button>
                            </div>

                            <div className="mt-10 grid max-w-xl grid-cols-3 border-y text-sm">
                                <div className="py-4 pr-4">
                                    <div className="text-xl font-semibold">256-bit</div>
                                    <div className="text-muted-foreground">encryption</div>
                                </div>
                                <div className="border-x px-4 py-4">
                                    <div className="text-xl font-semibold">MIT</div>
                                    <div className="text-muted-foreground">licensed</div>
                                </div>
                                <div className="py-4 pl-4">
                                    <div className="text-xl font-semibold">OSS</div>
                                    <div className="text-muted-foreground">public repo</div>
                                </div>
                            </div>
                        </div>

                        <div className="animate-rise h-fit overflow-hidden border bg-card [animation-delay:120ms]">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <ShieldCheck className="size-4" aria-hidden="true" />
                                    Production API
                                </div>
                                <div className="font-mono text-xs text-muted-foreground">8 encrypted vars</div>
                            </div>
                            <div className="grid gap-px bg-border md:grid-cols-[1fr_0.82fr]">
                                <div className="bg-card p-5">
                                    <div className="mb-6 flex items-center justify-between border-b pb-4">
                                        <div>
                                            <div className="text-sm font-medium">Environment vault</div>
                                            <div className="text-xs text-muted-foreground">
                                                Preview, staging, production
                                            </div>
                                        </div>
                                        <LockKeyhole className="size-5" aria-hidden="true" />
                                    </div>

                                    <div className="space-y-3">
                                        {["DATABASE_URL", "SUPABASE_KEY", "STRIPE_SECRET"].map((item) => (
                                            <div key={item} className="flex items-center justify-between border-b pb-3 text-sm">
                                                <span className="font-mono text-muted-foreground">{item}</span>
                                                <span className="font-medium">Encrypted</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-px bg-border">
                                    {[
                                        ["Access", "Team"],
                                        ["Auditability", "Tracked"],
                                        ["Disclosure", "Private"],
                                    ].map(([label, value]) => (
                                        <div key={label} className="bg-card p-5">
                                            <div className="text-xs uppercase text-muted-foreground">{label}</div>
                                            <div className="mt-2 text-2xl font-semibold">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-auto border-t bg-primary py-3 text-primary-foreground">
                        <ScrollBasedVelocity
                            text="256-bit encryption / team access / secure onboarding / auditable environment changes /"
                            default_velocity={1.05}
                            className="font-mono text-sm uppercase text-primary-foreground sm:text-xl"
                        />
                    </div>
                </section>

                <section id="product" className="scroll-mt-20 border-b px-5 py-20 sm:px-8 lg:px-10">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="font-mono text-sm uppercase text-muted-foreground">Product</p>
                                <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                                    A safer home for every environment.
                                </h2>
                            </div>
                            <p className="max-w-2xl text-lg leading-8 text-muted-foreground lg:justify-self-end">
                                Built for the messy parts of team development: onboarding,
                                rotated credentials, environment drift, and secret access.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-px border bg-border md:grid-cols-3">
                            {benefits.map((benefit) => (
                                <article key={benefit.title} className="bg-background p-6">
                                    <benefit.icon className="size-5" aria-hidden="true" />
                                    <h3 className="mt-10 text-xl font-medium tracking-tight">{benefit.title}</h3>
                                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="security" className="scroll-mt-20 border-b bg-muted/30 px-5 py-20 sm:px-8 lg:px-10">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr]">
                        <div>
                            <p className="font-mono text-sm uppercase text-muted-foreground">Security</p>
                            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                                Designed around secret handling from the start.
                            </h2>
                            <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                env.garden is built around encrypted storage, controlled sharing,
                                and private vulnerability reporting.
                            </p>
                        </div>

                        <div className="grid gap-px border bg-border sm:grid-cols-2">
                            {securityPoints.map((point) => (
                                <div key={point} className="flex items-center gap-3 bg-background p-5">
                                    <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                                    <span className="text-base font-medium">{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-b px-5 py-20 sm:px-8 lg:px-10">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
                        <div>
                            <p className="font-mono text-sm uppercase text-muted-foreground">Workflow</p>
                            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                                From invite to configured in minutes.
                            </h2>
                        </div>

                        <div className="grid gap-px border bg-border">
                            {workflow.map((item, index) => (
                                <div key={item} className="grid grid-cols-[3rem_1fr] bg-background">
                                    <div className="border-r p-5 font-mono text-sm text-muted-foreground">
                                        0{index + 1}
                                    </div>
                                    <div className="flex items-center gap-3 p-5">
                                        <Workflow className="size-5" aria-hidden="true" />
                                        <span className="text-lg font-medium">{item}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="cli" className="scroll-mt-20 border-b bg-muted/30 px-5 py-20 sm:px-8 lg:px-10">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <p className="font-mono text-sm uppercase text-muted-foreground">CLI</p>
                            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                                Your environments, from the terminal.
                            </h2>
                            <p className="mt-6 text-lg leading-8 text-muted-foreground">
                                Sign in with a browser approval flow. No tokens to copy, and
                                credentials are stored with user-only file permissions.
                            </p>
                        </div>

                        <div className="overflow-hidden border bg-card font-mono text-sm">
                            <div className="flex items-center gap-2 border-b px-4 py-3 text-muted-foreground">
                                <Terminal className="size-4" aria-hidden="true" />
                                terminal
                            </div>
                            <div className="space-y-4 p-5 leading-6">
                                <div>
                                    <div><span className="text-muted-foreground">$</span> pnpm add --global @env-garden/cli</div>
                                </div>
                                <div>
                                    <div><span className="text-muted-foreground">$</span> eit login</div>
                                    <div className="text-muted-foreground">Opening env.garden to approve this device…</div>
                                    <div className="text-muted-foreground">✓ Logged in</div>
                                </div>
                                <div>
                                    <div><span className="text-muted-foreground">$</span> eit status</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="open-source" className="border-b bg-primary px-5 py-20 text-primary-foreground sm:px-8 lg:px-10">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <p className="font-mono text-sm uppercase text-primary-foreground/55">Open source</p>
                            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                                Public, MIT licensed, and built with security feedback.
                            </h2>
                            <p className="mt-6 text-lg leading-8 text-primary-foreground/65">
                                env.garden is a transparent project for developers who want a
                                better default than passing secrets around informally.
                            </p>
                        </div>

                        <div className="grid gap-px border border-primary-foreground/25 bg-primary-foreground/25">
                            {openSourcePoints.map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-4 bg-primary p-5">
                                    <Icon className="size-5" aria-hidden="true" />
                                    <span className="text-lg font-medium">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="scroll-mt-20 border-b px-5 py-20 sm:px-8 lg:px-10">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1.28fr]">
                        <div>
                            <p className="font-mono text-sm uppercase text-muted-foreground">FAQ</p>
                            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                                Questions teams ask before moving secrets.
                            </h2>
                        </div>

                        <Accordion type="single" collapsible className="border">
                            {faqs.map((faq) => (
                                <AccordionItem key={faq.question} value={faq.question} className="px-5">
                                    <AccordionTrigger className="py-5 text-base font-medium hover:no-underline">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </section>

                <section className="px-5 py-20 sm:px-8 lg:px-10">
                    <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 border bg-card p-6 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Make .env sharing boring again.
                            </h2>
                            <p className="mt-3 max-w-2xl text-muted-foreground">
                                Replace ad-hoc secret sharing with an open-source workspace built
                                for secure environment collaboration.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild size="lg" className="h-11 px-4 text-sm">
                                <a href={SIGN_IN_HREF}>
                                    Get started
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="h-11 px-4 text-sm">
                                <a href={APP_REPOSITORY_URL}>
                                    <FaGithub className="size-4" aria-hidden="true" />
                                    View on GitHub
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t px-5 py-8 sm:px-8 lg:px-10">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>env.garden - secure .env collaboration for teams.</p>
                    <a className="inline-flex items-center gap-2 text-foreground" href={APP_REPOSITORY_URL}>
                        <FaGithub className="size-4" aria-hidden="true" />
                        github.com/{APP_REPOSITORY_NAME}
                    </a>
                </div>
            </footer>

            <CustomCursor />
        </div>
    );
}
