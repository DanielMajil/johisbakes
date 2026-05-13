/** True when PostgREST reports the table is missing (migration not applied yet). */
export function isMissingMenuCategoriesTableError(message: string | undefined): boolean {
  if (!message) return false;
  if (!message.includes("menu_categories")) return false;
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("undefined table")
  );
}
