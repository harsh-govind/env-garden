import { Info } from "lucide-react";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineText } from "@/components/docs/inline-text";
import type { DocsBlockProps } from "@/types/docs";

export function DocsBlock({ block }: DocsBlockProps) {
    switch (block.kind) {
        case "text":
            return (
                <p className="leading-7 text-muted-foreground">
                    <InlineText text={block.text} />
                </p>
            );

        case "code":
            return <CodeBlock code={block.code} {...(block.label ? { label: block.label } : {})} />;

        case "list":
            return (
                <ul className="list-disc space-y-1.5 pl-5 leading-7 text-muted-foreground marker:text-foreground/40">
                    {block.items.map((item) => (
                        <li key={item}>
                            <InlineText text={item} />
                        </li>
                    ))}
                </ul>
            );

        case "note":
            return (
                <div className="flex gap-3 border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-foreground">
                    <Info className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    <p>
                        <InlineText text={block.text} />
                    </p>
                </div>
            );

        case "table":
            return (
                <div className="overflow-x-auto border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                                {block.headers.map((header) => (
                                    <th key={header} className="px-4 py-2 font-medium">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row) => (
                                <tr key={row.join("|")} className="border-b border-border last:border-0">
                                    {row.map((cell, index) => (
                                        <td
                                            key={`${index}-${cell}`}
                                            className={
                                                index === 0
                                                    ? "px-4 py-2.5 align-top font-mono text-[13px] whitespace-nowrap text-foreground"
                                                    : "px-4 py-2.5 align-top text-muted-foreground"
                                            }
                                        >
                                            <InlineText text={cell} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
    }
}
