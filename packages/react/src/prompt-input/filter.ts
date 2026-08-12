function filterByNameOrDesc<
  T extends { desc?: string; disabled?: boolean; name: string },
>(
  items: readonly T[],
  query: string,
  options?: { includeDisabled?: boolean }
): T[] {
  const q = query.toLowerCase();

  return items.filter((item) => {
    if (!options?.includeDisabled && item.disabled) {
      return false;
    }

    if (item.name.toLowerCase().includes(q)) {
      return true;
    }

    return (item.desc ?? "").toLowerCase().includes(q);
  });
}

export { filterByNameOrDesc };
