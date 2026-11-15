export type ParsedEnvEntry = {
    key: string;
    value: string;
    note: string;
    isCommented: boolean;
};

export type ParsedEnvAssignment = {
    key: string;
    value: string;
    inlineComment: string;
};

export type EnvTextEntry = {
    key: string;
    value: string;
    note?: string | null;
    isCommented?: boolean;
};
