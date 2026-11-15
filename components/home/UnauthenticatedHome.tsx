"use client";

import {
    ArrowRight,
    ArrowUpRight,
    Check,
    ChevronRight,
    Copy,
    Eye,
    EyeOff,
    Lock,
    Search,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa6";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_REPOSITORY_URL } from "@/constants/app";
import { cn } from "@/utils";

const SIGN_IN_HREF = "/signin";
const CLI_COMMAND = "npx @env-garden/cli login";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const rows = [
    { key: "DATABASE_URL", value: "postgres://app:••••••••@db.internal:5432/main", by: "HG", when: "2h ago" },
    { key: "STRIPE_SECRET_KEY", value: "sk_live_••••••••••••••••••••", by: "AK", when: "Yesterday" },
    { key: "RESEND_API_KEY", value: "re_••••••••••••••••", by: "MR", when: "3d ago" },
    { key: "NEXTAUTH_SECRET", value: "••••••••••••••••••••••••", by: "HG", when: "1w ago" },
    { key: "REDIS_URL", value: "rediss://default:••••••••@cache:6379", by: "AK", when: "2w ago" },
];

const specs = [
    ["Cipher", "AES-256-GCM"],
    ["Key scope", "One key per project"],
    ["Payload", "Each value encrypted individually"],
    ["Sign-in", "Magic link, Google, GitHub"],
    ["CLI tokens", "Hashed at rest, revocable"],
    ["Disclosure", "Private vulnerability reporting"],
    ["License", "MIT"],
];

const faqs = [
    {
        question: "What is env.garden?",
        answer: "An open-source workspace for storing, managing and sharing environment variables across a team, so secrets stop living in chat threads and stale local files.",
    },
    {
        question: "How are secrets protected?",
        answer: "Every value is encrypted with AES-256-GCM using a key scoped to its project, and each value is stored as its own encrypted payload.",
    },
    {
        question: "Is it open source?",
        answer: "Yes. The full source is public on GitHub under the MIT license. Issues, ideas and pull requests are welcome.",
    },
    {
        question: "Is there a CLI?",
        answer: "Yes. Run `npx @env-garden/cli login`, approve the device in your browser, and you're in. No tokens to copy and paste.",
    },
    {
        question: "How do I report a vulnerability?",
        answer: "Privately, please. Don't open a public issue with exploit details. Contact the maintainers first.",
    },
];

/* ------------------------------------------------------------------ */
/* Hooks & small parts                                                 */
/* ------------------------------------------------------------------ */

function useGitHubStars() {
    const [stars, setStars] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        fetch("/api/github/stars", { signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { stars?: number | null } | null) => {
                if (typeof data?.stars === "number") {
                    setStars(data.stars);
                }
            })
            .catch(() => undefined);

        return () => controller.abort();
    }, []);

    if (stars === null) {
        return null;
    }

    return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}

/** Small "+" markers that sit on the frame's corners. */
function Corners() {
    const base = "absolute size-2.5 text-foreground/30";
    const plus = (
        <svg viewBox="0 0 10 10" className="size-full" aria-hidden="true">
            <path d="M5 0v10M0 5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
    );

    return (
        <>
            <span className={cn(base, "-top-[5px] -left-[5px]")}>{plus}</span>
            <span className={cn(base, "-top-[5px] -right-[5px]")}>{plus}</span>
        </>
    );
}

function Section({
    id,
    className,
    children,
}: {
    id?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className={cn("relative scroll-mt-16 border-t", className)}>
            <Corners />
            {children}
        </section>
    );
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn("font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase", className)}>
            {children}
        </p>
    );
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="group inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background shadow-sm transition hover:bg-foreground/85"
        >
            {children}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
}

function CopyCommand() {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(CLI_COMMAND);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard may be unavailable; nothing to do.
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label="Copy CLI command"
            className="group inline-flex h-10 items-center gap-3 rounded-md border bg-background px-4 font-mono text-[13px] text-muted-foreground transition hover:text-foreground"
        >
            <span className="select-none text-foreground/40">$</span>
            {CLI_COMMAND}
            {copied ? (
                <Check className="size-3.5 text-foreground" />
            ) : (
                <Copy className="size-3.5 opacity-40 transition group-hover:opacity-100" />
            )}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Product visuals                                                     */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
    return (
        <div className="overflow-hidden rounded-xl border bg-card text-left shadow-[0_24px_80px_-24px_rgb(0_0_0/0.25)] dark:shadow-[0_24px_80px_-24px_rgb(0_0_0/0.8)]">
            {/* Window bar */}
            <div className="flex h-10 items-center gap-3 border-b px-4">
                <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full border border-foreground/15" />
                    <span className="size-2.5 rounded-full border border-foreground/15" />
                    <span className="size-2.5 rounded-full border border-foreground/15" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LogoMark className="size-4" />
                    <span>acme</span>
                    <ChevronRight className="size-3" />
                    <span>api</span>
                    <ChevronRight className="size-3" />
                    <span className="text-foreground">production</span>
                </div>
            </div>

            <div className="grid md:grid-cols-[180px_1fr]">
                {/* Sidebar */}
                <aside className="hidden border-r p-3 md:block">
                    <div className="flex h-8 items-center gap-2 rounded-md border px-2 text-xs text-muted-foreground">
                        <Search className="size-3.5" />
                        Search
                    </div>
                    <Label className="mt-5 px-2 text-[10px]">Projects</Label>
                    <ul className="mt-2 space-y-0.5 text-[13px]">
                        {["api", "web", "worker", "analytics"].map((project, index) => (
                            <li
                                key={project}
                                className={cn(
                                    "rounded-md px-2 py-1.5",
                                    index === 0 ? "bg-muted font-medium" : "text-muted-foreground"
                                )}
                            >
                                {project}
                            </li>
                        ))}
                    </ul>
                    <Label className="mt-5 px-2 text-[10px]">Workspace</Label>
                    <ul className="mt-2 space-y-0.5 text-[13px] text-muted-foreground">
                        <li className="px-2 py-1.5">Members</li>
                        <li className="px-2 py-1.5">History</li>
                    </ul>
                </aside>

                {/* Main */}
                <div className="min-w-0">
                    <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
                        <div className="flex items-center gap-4 text-[13px]">
                            {["development", "preview", "production"].map((env) => (
                                <span
                                    key={env}
                                    className={cn(
                                        "relative py-1",
                                        env === "production"
                                            ? "font-medium after:absolute after:inset-x-0 after:-bottom-[13px] after:h-px after:bg-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {env}
                                </span>
                            ))}
                        </div>
                        <span className="hidden h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs sm:inline-flex">
                            <Copy className="size-3" />
                            Copy as .env
                        </span>
                    </div>

                    <table className="w-full table-fixed text-[13px]">
                        <thead>
                            <tr className="border-b text-left text-[11px] text-muted-foreground">
                                <th className="w-[42%] px-5 py-2 font-normal sm:w-[34%]">Key</th>
                                <th className="hidden px-5 py-2 font-normal sm:table-cell">Value</th>
                                <th className="hidden w-36 px-5 py-2 font-normal lg:table-cell">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={row.key} className="border-b last:border-0">
                                    <td className="truncate px-5 py-3 font-mono">{row.key}</td>
                                    <td className="hidden px-5 py-3 sm:table-cell">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-mono text-muted-foreground">
                                                {row.value}
                                            </span>
                                            {index === 0 ? (
                                                <Eye className="size-3.5 shrink-0 text-muted-foreground" />
                                            ) : (
                                                <EyeOff className="size-3.5 shrink-0 text-muted-foreground/60" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden px-5 py-3 whitespace-nowrap text-muted-foreground lg:table-cell">
                                        <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-muted text-[9px] font-medium text-foreground">
                                            {row.by}
                                        </span>
                                        {row.when}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function CipherVisual() {
    return (
        <div className="space-y-2 font-mono text-[11px] leading-5">
            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <span>STRIPE_SECRET_KEY</span>
                <Lock className="size-3 text-muted-foreground" />
            </div>
            <div className="rounded-md border border-dashed px-3 py-2 break-all text-muted-foreground">
                a3f9·1c0e·77b2·e94d·0f1a·c6b8·52de·9a07·b13f·e8c4
            </div>
        </div>
    );
}

function AccessVisual() {
    return (
        <ul className="divide-y rounded-md border bg-background text-xs">
            {[
                ["harsh@acme.dev", "Owner"],
                ["anya@acme.dev", "Editor"],
                ["max@acme.dev", "Viewer"],
            ].map(([email, role]) => (
                <li key={email} className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">{email}</span>
                    <span className="rounded border px-1.5 py-0.5 font-mono text-[10px]">{role}</span>
                </li>
            ))}
        </ul>
    );
}

function HistoryVisual() {
    return (
        <ol className="relative space-y-3 border-l pl-4 text-xs">
            {[
                ["Updated", "DATABASE_URL", "2h"],
                ["Added", "REDIS_URL", "1d"],
                ["Removed", "LEGACY_TOKEN", "4d"],
            ].map(([action, key, when]) => (
                <li key={key} className="relative">
                    <span className="absolute top-1.5 -left-[19.5px] size-1.5 rounded-full bg-foreground" />
                    <span className="text-muted-foreground">{action} </span>
                    <span className="font-mono">{key}</span>
                    <span className="float-right text-muted-foreground">{when}</span>
                </li>
            ))}
        </ol>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function UnauthenticatedHome() {
    const stars = useGitHubStars();

    return (
        <div className="min-h-screen w-full overflow-x-clip bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased selection:bg-foreground selection:text-background">
            {/* Nav */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
                <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:border-x">
                    <div className="flex items-center gap-8">
                        <a href="#" aria-label="env.garden home">
                            <Logo markClassName="size-6" />
                        </a>
                        <div className="hidden items-center gap-6 text-[13px] text-muted-foreground md:flex">
                            <a className="transition hover:text-foreground" href="#product">Product</a>
                            <a className="transition hover:text-foreground" href="#security">Security</a>
                            <a className="transition hover:text-foreground" href="#cli">CLI</a>
                            <a className="transition hover:text-foreground" href="#faq">FAQ</a>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <a
                            href={APP_REPOSITORY_URL}
                            className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-muted-foreground transition hover:text-foreground sm:inline-flex"
                        >
                            <FaGithub className="size-4" />
                            {stars ? <span className="tabular-nums">{stars}</span> : null}
                        </a>
                        <ThemeToggle />
                        <Link
                            href={SIGN_IN_HREF}
                            className="ml-1 inline-flex h-8 items-center rounded-md bg-foreground px-3.5 text-[13px] font-medium text-background transition hover:bg-foreground/85"
                        >
                            Sign in
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Framed content */}
            <div className="mx-auto max-w-6xl md:border-x">
                {/* Hero */}
                <section className="relative overflow-hidden">
                    <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0" />

                    <div className="landing-fade-up relative px-5 pt-20 pb-16 sm:px-10 sm:pt-28">
                        <a
                            href={APP_REPOSITORY_URL}
                            className="group inline-flex items-center gap-2 text-[13px] text-muted-foreground transition hover:text-foreground"
                        >
                            <span className="rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-foreground uppercase">
                                New
                            </span>
                            Sign in from your terminal with the CLI
                            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        </a>

                        <h1 className="mt-8 max-w-4xl text-[2.75rem] leading-[1.02] font-medium tracking-[-0.045em] text-balance sm:text-6xl md:text-7xl">
                            Your secrets deserve better than a Slack thread.
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                            env.garden is the open-source home for your team&apos;s
                            environment variables. Encrypted per value, scoped per project,
                            shared only with the people who need them.
                        </p>

                        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <PrimaryButton href={SIGN_IN_HREF}>Start for free</PrimaryButton>
                            <CopyCommand />
                        </div>
                    </div>

                    <div className="landing-fade-up relative px-3 [animation-delay:120ms] sm:px-10">
                        <DashboardPreview />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent"
                        />
                    </div>
                </section>

                {/* Proof strip */}
                <Section>
                    <dl className="grid grid-cols-2 md:grid-cols-4">
                        {[
                            ["AES-256-GCM", "Encryption"],
                            ["Per project", "Key isolation"],
                            ["MIT", "License"],
                            ["100%", "Open source"],
                        ].map(([value, label], index) => (
                            <div
                                key={label}
                                className={cn(
                                    "px-5 py-8 sm:px-10",
                                    index % 2 === 1 && "border-l",
                                    index >= 2 && "border-t md:border-t-0",
                                    index === 2 && "md:border-l"
                                )}
                            >
                                <dt className="text-xl font-medium tracking-tight">{value}</dt>
                                <dd className="mt-1 text-[13px] text-muted-foreground">{label}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                {/* Before / after */}
                <Section id="product">
                    <div className="px-5 py-20 sm:px-10">
                        <Label>The problem</Label>
                        <h2 className="mt-4 max-w-2xl text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
                            Every team has a channel where secrets go to leak.
                        </h2>
                    </div>

                    <div className="grid border-t md:grid-cols-2">
                        <div className="px-5 py-10 sm:px-10">
                            <Label>Before</Label>
                            <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground"># dev-backend</span>
                                    · 11:42
                                </div>
                                <div className="mt-3 flex gap-3">
                                    <span className="grid size-7 shrink-0 place-items-center rounded bg-muted text-[10px] font-medium">AK</span>
                                    <div className="min-w-0 space-y-2">
                                        <p className="text-muted-foreground">here&apos;s the prod db for you 👇</p>
                                        <code className="block truncate rounded border bg-background px-2 py-1.5 font-mono text-xs line-through decoration-foreground/40">
                                            DATABASE_URL=postgres://admin:hunter2@prod-db…
                                        </code>
                                        <p className="text-xs text-muted-foreground">
                                            Seen by 48 people · searchable forever
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t px-5 py-10 sm:px-10 md:border-t-0 md:border-l">
                            <Label>After</Label>
                            <div className="mt-6 rounded-lg border bg-card p-4 text-sm">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">api / production</span>
                                    <span className="inline-flex items-center gap-1">
                                        <Lock className="size-3" /> Encrypted
                                    </span>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center justify-between rounded border bg-background px-2 py-1.5 font-mono text-xs">
                                        <span>DATABASE_URL</span>
                                        <span className="text-muted-foreground">••••••••••••</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Shared with 3 teammates · every change recorded
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Features */}
                <Section>
                    <div className="grid md:grid-cols-3">
                        {[
                            {
                                label: "01 · Encryption",
                                title: "Encrypted before it's stored.",
                                body: "Each value is sealed with AES-256-GCM under a project-scoped key. One leak never opens everything.",
                                visual: <CipherVisual />,
                            },
                            {
                                label: "02 · Access",
                                title: "The right people, nobody else.",
                                body: "Invite teammates by email to a workspace and control who can see and change each project.",
                                visual: <AccessVisual />,
                            },
                            {
                                label: "03 · History",
                                title: "Know what changed, and who.",
                                body: "Every add, update and removal is recorded, so environment drift stops being a mystery.",
                                visual: <HistoryVisual />,
                            },
                        ].map((feature, index) => (
                            <article
                                key={feature.label}
                                className={cn(
                                    "flex flex-col px-5 py-10 sm:px-10",
                                    index > 0 && "border-t md:border-t-0 md:border-l"
                                )}
                            >
                                <Label>{feature.label}</Label>
                                <h3 className="mt-4 text-lg font-medium tracking-tight">{feature.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                                <div className="mt-8 rounded-lg border bg-muted/40 p-4">{feature.visual}</div>
                            </article>
                        ))}
                    </div>
                </Section>

                {/* Security */}
                <Section id="security" className="bg-foreground text-background">
                    <div className="grid md:grid-cols-[1fr_1.2fr]">
                        <div className="px-5 py-20 sm:px-10">
                            <p className="font-mono text-[11px] tracking-[0.14em] text-background/50 uppercase">
                                Security
                            </p>
                            <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
                                Built around secret handling, not bolted on.
                            </h2>
                            <p className="mt-5 max-w-md leading-relaxed text-background/60">
                                Read every line that touches your secrets. The whole stack is
                                open source, and vulnerabilities are handled privately.
                            </p>
                            <a
                                href={APP_REPOSITORY_URL}
                                className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium underline decoration-background/30 underline-offset-4 transition hover:decoration-background"
                            >
                                Audit the source
                                <ArrowUpRight className="size-3.5" />
                            </a>
                        </div>

                        <dl className="border-t border-background/15 md:border-t-0 md:border-l">
                            {specs.map(([term, detail]) => (
                                <div
                                    key={term}
                                    className="grid grid-cols-[120px_1fr] gap-4 border-b border-background/15 px-5 py-4 text-sm last:border-0 sm:grid-cols-[160px_1fr] sm:px-10"
                                >
                                    <dt className="font-mono text-xs leading-5 text-background/50 uppercase">{term}</dt>
                                    <dd>{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </Section>

                {/* CLI */}
                <Section id="cli">
                    <div className="grid md:grid-cols-[1fr_1.2fr]">
                        <div className="px-5 py-20 sm:px-10">
                            <Label>CLI</Label>
                            <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
                                Lives where you work.
                            </h2>
                            <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                                Approve your device in the browser and the CLI handles the rest.
                                Credentials are stored with user-only permissions and can be
                                revoked anytime.
                            </p>
                        </div>

                        <div className="flex items-center border-t px-5 py-10 sm:px-10 md:border-t-0 md:border-l">
                            <div className="w-full overflow-hidden rounded-lg border bg-card font-mono text-[13px] leading-6">
                                <div className="flex h-9 items-center border-b px-4 text-xs text-muted-foreground">
                                    ~/acme/api
                                </div>
                                <div className="space-y-4 p-5">
                                    <div>
                                        <p><span className="text-muted-foreground">$</span> eit login</p>
                                        <p className="text-muted-foreground">→ Opening env.garden to approve this device…</p>
                                        <p>✓ Logged in as harsh@acme.dev</p>
                                    </div>
                                    <div>
                                        <p><span className="text-muted-foreground">$</span> eit status</p>
                                        <p className="text-muted-foreground">Account   harsh@acme.dev</p>
                                        <p className="text-muted-foreground">Server    https://env.garden</p>
                                    </div>
                                    <p>
                                        <span className="text-muted-foreground">$</span>{" "}
                                        <span className="landing-caret inline-block h-4 w-2 translate-y-0.5 bg-foreground" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* FAQ */}
                <Section id="faq">
                    <div className="grid md:grid-cols-[1fr_1.2fr]">
                        <div className="px-5 py-20 sm:px-10">
                            <Label>FAQ</Label>
                            <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
                                Questions, answered.
                            </h2>
                        </div>
                        <div className="border-t px-5 py-12 sm:px-10 md:border-t-0 md:border-l md:py-20">
                            <Accordion type="single" collapsible>
                                {faqs.map((faq) => (
                                    <AccordionItem key={faq.question} value={faq.question} className="border-b">
                                        <AccordionTrigger className="py-4 text-[15px] font-medium hover:no-underline">
                                            {faq.question}
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                                            {faq.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </div>
                </Section>

                {/* CTA */}
                <Section className="overflow-hidden">
                    <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0 rotate-180" />
                    <div className="relative flex flex-col items-start justify-between gap-10 px-5 py-24 sm:px-10 md:flex-row md:items-end">
                        <h2 className="max-w-xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl">
                            Stop pasting secrets. Start sharing them properly.
                        </h2>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <PrimaryButton href={SIGN_IN_HREF}>Start for free</PrimaryButton>
                            <a
                                href={APP_REPOSITORY_URL}
                                className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium transition hover:bg-muted"
                            >
                                <FaGithub className="size-4" />
                                Star on GitHub
                            </a>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Footer */}
            <footer className="border-t">
                <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-10 md:grid-cols-[1.5fr_1fr_1fr] md:border-x">
                    <div>
                        <Logo markClassName="size-6" />
                        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                            Open-source secret management for teams that ship.
                        </p>
                    </div>
                    <div className="text-sm">
                        <Label>Product</Label>
                        <ul className="mt-4 space-y-2 text-muted-foreground">
                            <li><a className="transition hover:text-foreground" href="#product">Overview</a></li>
                            <li><a className="transition hover:text-foreground" href="#security">Security</a></li>
                            <li><a className="transition hover:text-foreground" href="#cli">CLI</a></li>
                        </ul>
                    </div>
                    <div className="text-sm">
                        <Label>Project</Label>
                        <ul className="mt-4 space-y-2 text-muted-foreground">
                            <li><a className="transition hover:text-foreground" href={APP_REPOSITORY_URL}>GitHub</a></li>
                            <li><Link className="transition hover:text-foreground" href={SIGN_IN_HREF}>Sign in</Link></li>
                            <li><a className="transition hover:text-foreground" href="#faq">FAQ</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 text-xs text-muted-foreground sm:px-10 md:border-x">
                        <span>© {new Date().getFullYear()} env.garden · MIT License</span>
                        <span>
                            Built by{" "}
                            <a
                                href="https://github.com/harsh-govind"
                                className="font-medium text-foreground underline decoration-foreground/20 underline-offset-4 transition hover:decoration-foreground"
                            >
                                Harsh Govind
                            </a>
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
