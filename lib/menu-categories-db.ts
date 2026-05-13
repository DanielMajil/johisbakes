/** PostgREST: table not exposed / not created yet. */
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

/** Postgres: column was never added (migration not run). */
export function isMenuItemsMissingNewColumnsError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    (m.includes("menu_group") && m.includes("does not exist")) ||
    (m.includes("category_id") && (m.includes("does not exist") || m.includes("schema cache")))
  );
}

/** True when the row was loaded from a DB that already has split-menu columns. */
export function menuRowHasSplitColumns(row: unknown): boolean {
  return !!(row && typeof row === "object" && Object.prototype.hasOwnProperty.call(row, "menu_group"));
}

export const MENU_SPLIT_MIGRATION_INSTRUCTIONS =
  "In Supabase: open SQL Editor, paste and run the full file supabase/migration_menu_sections.sql, then wait a minute (or run: NOTIFY pgrst, 'reload schema';). After that, refresh this page.";
