import { ChevronRight, Copy, Eye, EyeOff, Search } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Label } from "@/components/landing/label";
import {
    LANDING_PREVIEW_ACTIVE_ENVIRONMENT,
    LANDING_PREVIEW_ENVIRONMENTS,
    LANDING_PREVIEW_PROJECTS,
    LANDING_PREVIEW_ROWS,
} from "@/constants/landing";
import { cn } from "@/utils";

/** Static mock of the env file editor shown in the hero. */
export function DashboardPreview() {
    return (
        <div className="overflow-hidden rounded-xl border bg-card text-left shadow-[0_24px_80px_-24px_rgb(0_0_0/0.25)] dark:shadow-[0_24px_80px_-24px_rgb(0_0_0/0.8)]">
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
                    <span>{LANDING_PREVIEW_PROJECTS[0]}</span>
                    <ChevronRight className="size-3" />
                    <span className="text-foreground">{LANDING_PREVIEW_ACTIVE_ENVIRONMENT}</span>
                </div>
            </div>

            <div className="grid md:grid-cols-[180px_1fr]">
                <aside className="hidden border-r p-3 md:block">
                    <div className="flex h-8 items-center gap-2 rounded-md border px-2 text-xs text-muted-foreground">
                        <Search className="size-3.5" />
                        Search
                    </div>
                    <Label className="mt-5 px-2 text-[10px]">Projects</Label>
                    <ul className="mt-2 space-y-0.5 text-[13px]">
                        {LANDING_PREVIEW_PROJECTS.map((project, index) => (
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

                <div className="min-w-0">
                    <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
                        <div className="flex items-center gap-4 text-[13px]">
                            {LANDING_PREVIEW_ENVIRONMENTS.map((environment) => (
                                <span
                                    key={environment}
                                    className={cn(
                                        "relative py-1",
                                        environment === LANDING_PREVIEW_ACTIVE_ENVIRONMENT
                                            ? "font-medium after:absolute after:inset-x-0 after:-bottom-[13px] after:h-px after:bg-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {environment}
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
                            {LANDING_PREVIEW_ROWS.map((row, index) => (
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
