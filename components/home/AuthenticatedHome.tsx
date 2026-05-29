"use client";

import { Check, MoreHorizontal, Plus, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import type { DashboardServiceStatus } from "@/types/dashboard";
import type { AuthenticatedHomeProps } from "@/types/home";

const statusStyles: Record<
    DashboardServiceStatus,
    { label: string; className: string }
> = {
    deployed: {
        label: "Deployed",
        className: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
    },
    "manual-suspended": {
        label: "Manually suspended",
        className: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
    },
};

export default function AuthenticatedHome({
    name,
    email,
}: AuthenticatedHomeProps) {
    const dashboardData = getDashboardData(name);
    const { home } = dashboardData;

    return (
        <div className="space-y-8">
            <section className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs tracking-[0.18em] text-zinc-500 uppercase">{home.subtitle}</p>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight text-zinc-50">{home.title}</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        Signed in as {name ?? "Unnamed user"}
                        {email ? ` (${email})` : ""}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        className="border border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                    >
                        <Plus />
                        {home.createProjectLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
                        onClick={() => signOut({ callbackUrl: "/" })}
                    >
                        Sign out
                    </Button>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-zinc-100">Projects</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {home.projects.map((project) => (
                        <article
                            key={project.id}
                            className="border border-zinc-800 bg-[#090b11] p-4 transition hover:border-zinc-700"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-base font-medium text-zinc-100">{project.name}</h3>
                                <span className="text-xs text-zinc-500">{project.serviceCount} services</span>
                            </div>
                            <p className="mt-3 inline-flex items-center gap-1.5 border border-emerald-700/60 bg-emerald-900/30 px-2 py-1 text-xs text-emerald-300">
                                <Check className="size-3.5" />
                                {project.healthLabel}
                            </p>
                        </article>
                    ))}

                    <button
                        type="button"
                        className="grid place-items-center border border-zinc-800 bg-[#090b11] p-4 text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
                    >
                        <span className="inline-flex items-center gap-2 text-sm">
                            <Plus className="size-4" />
                            Create new project
                        </span>
                    </button>
                </div>
            </section>

            <section className="border border-zinc-800 bg-[#090b11]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4">
                    <h2 className="text-2xl font-semibold text-zinc-100">{home.environment.name}</h2>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
                    >
                        <Plus />
                        {home.addEnvironmentLabel}
                    </Button>
                </div>

                <div className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                        {home.environment.tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={cn(
                                    "border px-2 py-1 text-xs transition",
                                    tab.active
                                        ? "border-violet-700 bg-violet-900/50 text-violet-200"
                                        : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                                )}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2 border border-zinc-800 bg-zinc-950/70 px-2 py-2 text-sm text-zinc-400">
                        <Search className="size-4" />
                        <span className="truncate">{home.searchPlaceholder}</span>
                        <button
                            type="button"
                            className="ml-auto inline-flex size-6 items-center justify-center border border-zinc-700 text-zinc-400 hover:text-zinc-100"
                            aria-label="More options"
                        >
                            <MoreHorizontal className="size-4" />
                        </button>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-190 w-full border-collapse text-left text-sm">
                            <thead className="text-xs tracking-wide text-zinc-500 uppercase">
                                <tr className="border-b border-zinc-800">
                                    <th className="py-3 pr-3 font-medium">Service Name</th>
                                    <th className="py-3 pr-3 font-medium">Status</th>
                                    <th className="py-3 pr-3 font-medium">Runtime</th>
                                    <th className="py-3 pr-3 font-medium">Region</th>
                                    <th className="py-3 pr-3 font-medium">Updated</th>
                                    <th className="py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {home.environment.services.map((service) => {
                                    const statusMeta = statusStyles[service.status];

                                    return (
                                        <tr
                                            key={service.id}
                                            className="border-b border-zinc-900/80 text-zinc-200 transition hover:bg-zinc-900/30"
                                        >
                                            <td className="py-3 pr-3 font-medium text-zinc-100">{service.name}</td>
                                            <td className="py-3 pr-3">
                                                <span className={cn("inline-flex border px-2 py-0.5 text-xs", statusMeta.className)}>
                                                    {statusMeta.label}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-3 text-zinc-400">{service.runtime}</td>
                                            <td className="py-3 pr-3 text-zinc-400">{service.region}</td>
                                            <td className="py-3 pr-3 text-zinc-400">{service.updated}</td>
                                            <td className="py-3 text-right">
                                                <button
                                                    type="button"
                                                    className="inline-flex size-7 items-center justify-center border border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                                                    aria-label={`Open actions for ${service.name}`}
                                                >
                                                    <MoreHorizontal className="size-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr>
                                    <td colSpan={6} className="py-4 text-sm text-zinc-400">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-2 border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                                        >
                                            <Plus className="size-3.5" />
                                            New service
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <button
                        type="button"
                        className="mt-6 grid w-full place-items-center border border-zinc-800 bg-zinc-950/30 px-4 py-10 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
                    >
                        <span className="inline-flex items-center gap-2">
                            <Plus className="size-4" />
                            {home.addEnvironmentLabel}
                        </span>
                    </button>
                </div>
            </section>
        </div>
    );
}
