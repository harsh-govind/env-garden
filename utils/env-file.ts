export const envKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type ParsedEnvEntry = {
    key: string;
    value: string;
    note: string;
    isCommented: boolean;
};

type ParsedAssignment = {
    key: string;
    value: string;
    inlineComment: string;
};

function unescapeDoubleQuoted(value: string) {
    return value.replace(/\\([nrt"\\])/g, (_, character: string) => {
        switch (character) {
            case "n":
                return "\n";
            case "r":
                return "\r";
            case "t":
                return "\t";
            default:
                return character;
        }
    });
}

function stripCommentMarker(comment: string) {
    return comment.replace(/^#\s?/, "").trimEnd();
}

/**
 * Parses `KEY=value` (optionally prefixed with `export`). Returns null when the
 * line isn't a valid assignment.
 */
function parseAssignment(line: string): ParsedAssignment | null {
    const body = line.startsWith("export ") ? line.slice("export ".length).trimStart() : line;
    const separatorIndex = body.indexOf("=");

    if (separatorIndex <= 0) {
        return null;
    }

    const key = body.slice(0, separatorIndex).trim();

    if (!envKeyPattern.test(key)) {
        return null;
    }

    const rawValue = body.slice(separatorIndex + 1).trim();
    const quote = rawValue[0];

    if (quote === '"' || quote === "'" || quote === "`") {
        let closingIndex = -1;

        for (let index = 1; index < rawValue.length; index += 1) {
            if (quote === '"' && rawValue[index] === "\\") {
                index += 1;
                continue;
            }

            if (rawValue[index] === quote) {
                closingIndex = index;
                break;
            }
        }

        if (closingIndex !== -1) {
            const inner = rawValue.slice(1, closingIndex);
            const rest = rawValue.slice(closingIndex + 1).trim();

            return {
                key,
                value: quote === '"' ? unescapeDoubleQuoted(inner) : inner,
                inlineComment: rest.startsWith("#") ? stripCommentMarker(rest) : "",
            };
        }
    }

    // Unquoted: an inline comment starts at whitespace followed by `#`.
    const inlineMatch = rawValue.match(/\s+#/);

    if (inlineMatch && inlineMatch.index !== undefined) {
        return {
            key,
            value: rawValue.slice(0, inlineMatch.index),
            inlineComment: stripCommentMarker(rawValue.slice(inlineMatch.index).trim()),
        };
    }

    return { key, value: rawValue, inlineComment: "" };
}

/**
 * Parses .env text, keeping comments:
 * - `# some text` lines become the note of the next variable.
 * - `#KEY=value` / `# KEY="value"` lines become commented-out variables.
 * - `KEY=value # text` inline comments are appended to the note.
 */
export function parseEnvText(text: string): ParsedEnvEntry[] {
    const entries: ParsedEnvEntry[] = [];
    let pendingComments: string[] = [];

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (line.length === 0) {
            continue;
        }

        let isCommented = false;
        let assignment: ParsedAssignment | null;

        if (line.startsWith("#")) {
            assignment = parseAssignment(line.replace(/^#+\s*/, ""));

            if (!assignment) {
                pendingComments.push(stripCommentMarker(line));
                continue;
            }

            isCommented = true;
        } else {
            assignment = parseAssignment(line);

            if (!assignment) {
                continue;
            }
        }

        const noteLines = [...pendingComments];

        if (assignment.inlineComment) {
            noteLines.push(assignment.inlineComment);
        }

        entries.push({
            key: assignment.key,
            value: assignment.value,
            note: noteLines.join("\n").trim(),
            isCommented,
        });
        pendingComments = [];
    }

    return entries;
}

function formatEnvValue(value: string) {
    if (value.length === 0 || !/[\s#"'`\\]/.test(value)) {
        return value;
    }

    return JSON.stringify(value);
}

/** Serializes variables back to .env text, writing notes as `#` comment lines. */
export function buildEnvText(
    entries: {
        key: string;
        value: string;
        note?: string | null;
        isCommented?: boolean;
    }[]
) {
    const lines: string[] = [];

    for (const entry of entries) {
        const note = entry.note?.trim() ?? "";

        if (note) {
            note.split(/\r?\n/).forEach((noteLine) => {
                lines.push(noteLine.trim() ? `# ${noteLine.trimEnd()}` : "#");
            });
        }

        const assignment = `${entry.key.trim()}=${formatEnvValue(entry.value)}`;
        lines.push(entry.isCommented ? `# ${assignment}` : assignment);
    }

    return lines.join("\n");
}
