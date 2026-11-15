import type { Metadata } from "next";
import { DocsBlock } from "@/components/docs/docs-block";
import { DocsHeader } from "@/components/docs/docs-header";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { APP_NAME } from "@/constants/app";
import { CLI_DOCS_DESCRIPTION, CLI_DOCS_GROUPS, CLI_DOCS_TITLE } from "@/constants/docs";

export const metadata: Metadata = {
    title: `${CLI_DOCS_TITLE} docs · ${APP_NAME}`,
    description: CLI_DOCS_DESCRIPTION,
};

export default function CliDocsPage() {
    return (
        <div className="min-h-screen w-full bg-background text-foreground">
            <DocsHeader />

            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:py-14">
                <aside className="hidden lg:block">
                    <div className="sticky top-24">
                        <DocsSidebar groups={CLI_DOCS_GROUPS} />
                    </div>
                </aside>

                <main className="min-w-0 max-w-3xl">
                    <p className="text-xs tracking-wide text-muted-foreground uppercase">Documentation</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{CLI_DOCS_TITLE}</h1>
                    <p className="mt-3 text-lg leading-8 text-muted-foreground">{CLI_DOCS_DESCRIPTION}</p>

                    <div className="mt-10 space-y-14">
                        {CLI_DOCS_GROUPS.map((group) => (
                            <div key={group.title} className="space-y-12">
                                {group.sections.map((section) => (
                                    <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                                        <h2 className="border-b border-border pb-2 text-xl font-semibold tracking-tight">
                                            <a href={`#${section.id}`} className="hover:underline">
                                                {section.title}
                                            </a>
                                        </h2>
                                        {section.blocks.map((block, index) => (
                                            <DocsBlock key={`${section.id}-${index}`} block={block} />
                                        ))}
                                    </section>
                                ))}
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
