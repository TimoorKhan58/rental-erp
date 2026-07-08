import type { SearchInput } from "./query-specification";

export interface ResolvedSearchSpec {
  term: string;
  fields: readonly string[];
}

export function normalizeSearchTerm(term?: string): string | undefined {
  if (term === undefined) {
    return undefined;
  }

  const trimmed = term.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveSearchSpec(
  search?: SearchInput,
  defaultFields?: readonly string[],
): ResolvedSearchSpec | undefined {
  const term = normalizeSearchTerm(search?.term);
  const fields = search?.fields ?? defaultFields;

  if (term === undefined || fields === undefined || fields.length === 0) {
    return undefined;
  }

  return { term, fields };
}

export function buildPrismaSearchWhere<TWhere extends Record<string, unknown>>(
  search: ResolvedSearchSpec,
): TWhere {
  return {
    OR: search.fields.map((field) => ({
      [field]: {
        contains: search.term,
        mode: "insensitive" as const,
      },
    })),
  } as unknown as TWhere;
}

export function buildSearchWhereFromInput<TWhere extends Record<string, unknown>>(
  search?: SearchInput,
  defaultFields?: readonly string[],
): TWhere | undefined {
  const resolved = resolveSearchSpec(search, defaultFields);

  if (resolved === undefined) {
    return undefined;
  }

  return buildPrismaSearchWhere<TWhere>(resolved);
}
