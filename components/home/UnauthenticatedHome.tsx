import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";
import { FaGithub } from "react-icons/fa6";
import { Logo } from "@/components/brand/logo";
import { CopyCommand } from "@/components/landing/copy-command";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { FeatureVisual } from "@/components/landing/feature-visual";
import { FooterLinks } from "@/components/landing/footer-links";
import { GitHubStars } from "@/components/landing/github-stars";
import { Label } from "@/components/landing/label";
import { PrimaryButton } from "@/components/landing/primary-button";
import { Section } from "@/components/landing/section";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_REPOSITORY_URL } from "@/constants/app";
import {
    LANDING_AUTHOR_NAME,
    LANDING_AUTHOR_URL,
    LANDING_FAQS,
    LANDING_FEATURES,
    LANDING_FOOTER_PRODUCT_LINKS,
    LANDING_FOOTER_PROJECT_LINKS,
    LANDING_NAV_LINKS,
    LANDING_SECURITY_SPECS,
    LANDING_STATS,
} from "@/constants/landing";
import { SIGN_IN_PATH } from "@/constants/routes";
import { cn } from "@/utils";

export default function UnauthenticatedHome() {
    return (
        <div className="min-h-screen w-full overflow-x-clip bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased selection:bg-foreground selection:text-background">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
                <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:border-x">
                    <div className="flex items-center gap-8">
                        <a href="#" aria-label="env.garden home">
                            <Logo markClassName="size-6" />
                        </a>
                        <div className="hidden items-center gap-6 text-[13px] text-muted-foreground md:flex">
                            {LANDING_NAV_LINKS.map((link) => (
                                <a key={link.href} className="transition hover:text-foreground" href={link.href}>
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex">
                            <a href={APP_REPOSITORY_URL}>
                                <FaGithub />
                                <GitHubStars />
                            </a>
                        </Button>
                        <ThemeToggle />
                        <Button asChild size="sm" className="ml-1 px-3.5">
                            <Link href={SIGN_IN_PATH}>Sign in</Link>
                        </Button>
                    </div>
                </nav>
            </header>

            <div className="mx-auto max-w-6xl md:border-x">
                <section className="relative overflow-hidden">
                    <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0" />

                    <div className="landing-fade-up relative px-5 pt-20 pb-16 sm:px-10 sm:pt-28">
                        <a
                            href="#cli"
                            className="group inline-flex items-center gap-2 text-[13px] text-muted-foreground transition hover:text-foreground"
                        >
                            <span className="border px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-foreground uppercase">
                                New
                            </span>
                            Pull, push and run your env from the terminal
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
                            <PrimaryButton href={SIGN_IN_PATH}>Start for free</PrimaryButton>
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

                <Section>
                    <dl className="grid grid-cols-2 md:grid-cols-4">
                        {LANDING_STATS.map((stat, index) => (
                            <div
                                key={stat.detail}
                                className={cn(
                                    "px-5 py-8 sm:px-10",
                                    index % 2 === 1 && "border-l",
                                    index >= 2 && "border-t md:border-t-0",
                                    index === 2 && "md:border-l"
                                )}
                            >
                                <dt className="text-xl font-medium tracking-tight">{stat.term}</dt>
                                <dd className="mt-1 text-[13px] text-muted-foreground">{stat.detail}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

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
                            <div className="mt-6 border bg-card p-4 text-sm">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground"># dev-backend</span>
                                    · 11:42
                                </div>
                                <div className="mt-3 flex gap-3">
                                    <span className="grid size-7 shrink-0 place-items-center bg-muted text-[10px] font-medium">AK</span>
                                    <div className="min-w-0 space-y-2">
                                        <p className="text-muted-foreground">here&apos;s the prod db for you 👇</p>
                                        <code className="block truncate border bg-background px-2 py-1.5 font-mono text-xs line-through decoration-foreground/40">
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
                            <div className="mt-6 border bg-card p-4 text-sm">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">api / production</span>
                                    <span className="inline-flex items-center gap-1">
                                        <Lock className="size-3" /> Encrypted
                                    </span>
                                </div>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center justify-between border bg-background px-2 py-1.5 font-mono text-xs">
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

                <Section>
                    <div className="grid md:grid-cols-3">
                        {LANDING_FEATURES.map((feature, index) => (
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
                                <div className="mt-8 border bg-muted/40 p-4">
                                    <FeatureVisual visual={feature.visual} />
                                </div>
                            </article>
                        ))}
                    </div>
                </Section>

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
                            {LANDING_SECURITY_SPECS.map((spec) => (
                                <div
                                    key={spec.term}
                                    className="grid grid-cols-[120px_1fr] gap-4 border-b border-background/15 px-5 py-4 text-sm last:border-0 sm:grid-cols-[160px_1fr] sm:px-10"
                                >
                                    <dt className="font-mono text-xs leading-5 text-background/50 uppercase">{spec.term}</dt>
                                    <dd>{spec.detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </Section>

                <Section id="cli">
                    <div className="grid md:grid-cols-[1fr_1.2fr]">
                        <div className="px-5 py-20 sm:px-10">
                            <Label>CLI</Label>
                            <h2 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
                                Lives where you work.
                            </h2>
                            <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                                Approve your device in the browser, link a folder, and pull your
                                .env, or run commands with variables injected. Sessions last
                                7 days and can be revoked anytime.
                            </p>
                        </div>

                        <div className="flex items-center border-t px-5 py-10 sm:px-10 md:border-t-0 md:border-l">
                            <div className="w-full overflow-hidden border bg-card font-mono text-[13px] leading-6">
                                <div className="flex h-9 items-center border-b px-4 text-xs text-muted-foreground">
                                    ~/acme/api
                                </div>
                                <div className="space-y-4 p-5">
                                    <div>
                                        <p><span className="text-muted-foreground">$</span> eit login</p>
                                        <p className="text-muted-foreground">✓ Logged in as harsh@acme.dev</p>
                                    </div>
                                    <div>
                                        <p><span className="text-muted-foreground">$</span> eit link</p>
                                        <p className="text-muted-foreground">✓ Linked to Acme / api / .env.production</p>
                                    </div>
                                    <div>
                                        <p><span className="text-muted-foreground">$</span> eit pull</p>
                                        <p className="text-muted-foreground">✓ Pulled 24 variables into .env</p>
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
                                {LANDING_FAQS.map((faq) => (
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

                <Section className="overflow-hidden">
                    <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0 rotate-180" />
                    <div className="relative flex flex-col items-start justify-between gap-10 px-5 py-24 sm:px-10 md:flex-row md:items-end">
                        <h2 className="max-w-xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl">
                            Stop pasting secrets. Start sharing them properly.
                        </h2>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <PrimaryButton href={SIGN_IN_PATH}>Start for free</PrimaryButton>
                            <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
                                <a href={APP_REPOSITORY_URL}>
                                    <FaGithub />
                                    Star on GitHub
                                </a>
                            </Button>
                        </div>
                    </div>
                </Section>
            </div>

            <footer className="border-t">
                <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-10 md:grid-cols-[1.5fr_1fr_1fr] md:border-x">
                    <div>
                        <Logo markClassName="size-6" />
                        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                            Open-source secret management for teams that ship.
                        </p>
                    </div>
                    <FooterLinks title="Product" links={LANDING_FOOTER_PRODUCT_LINKS} />
                    <FooterLinks title="Project" links={LANDING_FOOTER_PROJECT_LINKS} />
                </div>
                <div className="border-t">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 text-xs text-muted-foreground sm:px-10 md:border-x">
                        <span>© {new Date().getFullYear()} env.garden · MIT License</span>
                        <span>
                            Built by{" "}
                            <a
                                href={LANDING_AUTHOR_URL}
                                className="font-medium text-foreground underline decoration-foreground/20 underline-offset-4 transition hover:decoration-foreground"
                            >
                                {LANDING_AUTHOR_NAME}
                            </a>
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
