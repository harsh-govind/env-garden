export type DocsBlock =
    | { kind: "text"; text: string }
    | { kind: "code"; code: string; label?: string }
    | { kind: "list"; items: string[] }
    | { kind: "table"; headers: string[]; rows: string[][] }
    | { kind: "note"; text: string };

export type DocsSection = {
    id: string;
    title: string;
    blocks: DocsBlock[];
};

export type DocsSectionGroup = {
    title: string;
    sections: DocsSection[];
};

export type DocsBlockProps = {
    block: DocsBlock;
};

export type DocsInlineTextProps = {
    text: string;
};

export type DocsCodeBlockProps = {
    code: string;
    label?: string;
};

export type DocsSidebarProps = {
    groups: DocsSectionGroup[];
};
