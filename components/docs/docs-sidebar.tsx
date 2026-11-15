import type { DocsSidebarProps } from "@/types/docs";

export function DocsSidebar({ groups }: DocsSidebarProps) {
    return (
        <nav aria-label="Docs" className="space-y-6 text-sm">
            {groups.map((group) => (
                <div key={group.title}>
                    <p className="px-2 text-xs tracking-wide text-muted-foreground uppercase">{group.title}</p>
                    <ul className="mt-2 space-y-0.5">
                        {group.sections.map((section) => (
                            <li key={section.id}>
                                <a
                                    href={`#${section.id}`}
                                    className="block border-l-2 border-transparent px-2 py-1 text-muted-foreground transition hover:border-foreground hover:text-foreground"
                                >
                                    {section.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}
