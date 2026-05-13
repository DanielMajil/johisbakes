import { normalizeMenuGroup } from "@/lib/menu-groups";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MenuCategory, MenuItem, Partner, Review, SiteSettings } from "@/lib/types";

export type PublicSitePayload = {
  menu: MenuItem[];
  menu_categories: MenuCategory[];
  reviews: Review[];
  partners: Partner[];
  settings: SiteSettings | null;
  error?: string;
};

export async function loadPublicSite(): Promise<PublicSitePayload> {
  const empty: PublicSitePayload = {
    menu: [],
    menu_categories: [],
    reviews: [],
    partners: [],
    settings: null,
  };

  try {
    const sb = await createSupabaseServerClient();
    const [menuR, catR, reviewsR, partnersR, settingsR] = await Promise.all([
      sb.from("menu_items").select("*").order("sort_order", { ascending: true }),
      sb.from("menu_categories").select("*").order("menu_group", { ascending: true }).order("sort_order", { ascending: true }),
      sb.from("reviews").select("*").order("sort_order", { ascending: true }),
      sb.from("partners").select("*").order("sort_order", { ascending: true }),
      sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    const err = menuR.error || catR.error || reviewsR.error || partnersR.error || settingsR.error;
    if (err) {
      return { ...empty, error: err.message };
    }

    const categories = (catR.data ?? []) as MenuCategory[];
    const catNames = new Map(categories.map((c) => [c.id, c.name]));
    const menu = (menuR.data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const category_id = typeof r.category_id === "string" ? r.category_id : null;
      return {
        ...(row as MenuItem),
        menu_group: normalizeMenuGroup(r.menu_group),
        category_id,
        category_name: category_id ? (catNames.get(category_id) ?? null) : null,
      };
    });

    return {
      menu,
      menu_categories: categories,
      reviews: (reviewsR.data ?? []) as Review[],
      partners: (partnersR.data ?? []) as Partner[],
      settings: (settingsR.data ?? null) as SiteSettings | null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load site";
    return { ...empty, error: message };
  }
}
