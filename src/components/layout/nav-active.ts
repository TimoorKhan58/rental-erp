export function isNavItemActive(
  pathname: string,
  href: string,
  allHrefs: readonly string[],
): boolean {
  const matches = allHrefs.filter(
    (candidate) =>
      pathname === candidate ||
      (candidate !== "/" && pathname.startsWith(`${candidate}/`)),
  );

  if (matches.length === 0) {
    return false;
  }

  const bestMatch = matches.reduce((longest, current) =>
    current.length > longest.length ? current : longest,
  );

  return bestMatch === href;
}
