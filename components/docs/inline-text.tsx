import type { DocsInlineTextProps } from "@/types/docs";

export function InlineText({ text }: DocsInlineTextProps) {
    return (
        <>
            {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
                if (part.startsWith("`") && part.endsWith("`")) {
                    return (
                        <code key={index} className="border border-border bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
                            {part.slice(1, -1)}
                        </code>
                    );
                }

                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={index} className="font-medium text-foreground">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }

                return part;
            })}
        </>
    );
}
