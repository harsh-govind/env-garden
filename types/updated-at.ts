export type UpdatedAtValue = Date | string | number | null | undefined;

export type UpdatedAtSource =
    | UpdatedAtValue
    | { updatedAt?: UpdatedAtValue }
    | UpdatedAtSource[];
