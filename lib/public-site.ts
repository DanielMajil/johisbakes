import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MenuItem, Partner, Review, SiteSettings } from "@/lib/types";

export type PublicSitePayload = {
  menu: MenuItem[];
  reviews: Review[];
  partners: Partner[];
  settings: SiteSettings | null;
  error?: string;
};

export async function loadPublicSite(): Promise<PublicSitePayload> {
  const empty: PublicSitePayload = {
    menu: [],
    reviews: [],
    partners: [],
    settings: null,
  };

  try {
    const sb = await createSupabaseServerClient();
    const [menuR, reviewsR, partnersR, settingsR] = await Promise.all([
      sb.from("menu_items").select("*").order("sort_order", { ascending: true }),
      sb.from("reviews").select("*").order("sort_order", { ascending: true }),
      sb.from("partners").select("*").order("sort_order", { ascending: true }),
      sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    const err = menuR.error || reviewsR.error || partnersR.error || settingsR.error;
    if (err) {
      return { ...empty, error: err.message };
    }

    return {
      menu: (menuR.data ?? []) as MenuItem[],
      reviews: (reviewsR.data ?? []) as Review[],
      partners: (partnersR.data ?? []) as Partner[],
      settings: (settingsR.data ?? null) as SiteSettings | null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load site";
    return { ...empty, error: message };
  }
}
