/** Top-level menus on the site and in admin (extend later if you add sections). */
export const MENU_GROUPS = ["drinks", "bakes"] as const;
export type MenuGroup = (typeof MENU_GROUPS)[number];

export const MENU_GROUP_LABEL: Record<MenuGroup, string> = {
  drinks: "Frapes, coffee & drinks",
  bakes: "Baked goods",
};

export const MENU_GROUP_ADMIN_LABEL: Record<MenuGroup, string> = {
  drinks: "Drinks menu",
  bakes: "Bakes menu",
};

export function isMenuGroup(v: unknown): v is MenuGroup {
  return typeof v === "string" && (MENU_GROUPS as readonly string[]).includes(v);
}

export function normalizeMenuGroup(v: unknown): MenuGroup {
  return isMenuGroup(v) ? v : "drinks";
}
