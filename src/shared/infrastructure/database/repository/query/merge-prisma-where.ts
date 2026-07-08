export function mergePrismaWhere<TWhere extends Record<string, unknown>>(
  ...clauses: Array<TWhere | undefined>
): TWhere | undefined {
  const defined = clauses.filter(
    (clause): clause is TWhere => clause !== undefined,
  );

  if (defined.length === 0) {
    return undefined;
  }

  if (defined.length === 1) {
    return defined[0];
  }

  return { AND: defined } as unknown as TWhere;
}
