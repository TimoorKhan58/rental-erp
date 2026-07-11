export function matchesReturnDateRange(
  returnDate: string,
  from?: string,
  to?: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const timestamp = new Date(returnDate).getTime();

  if (from && timestamp < new Date(from).getTime()) {
    return false;
  }

  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    if (timestamp > end.getTime()) {
      return false;
    }
  }

  return true;
}
