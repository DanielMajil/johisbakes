import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { isMissingMenuCategoriesTableError } from "@/lib/menu-categories-db";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  if (!(await requireAdminCookie())) return adminUnauthorized();

  const admin = createSupabaseServiceClient();
  const [menu, menu_categories, reviews, partners, settings] = await Promise.all([
    admin.from("menu_items").select("*").order("sort_order", { ascending: true }),
    admin.from("menu_categories").select("*").order("menu_group", { ascending: true }).order("sort_order", { ascending: true }),
    admin.from("reviews").select("*").order("sort_order", { ascending: true }),
    admin.from("partners").select("*").order("sort_order", { ascending: true }),
    admin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const categoriesRecoverable =
    menu_categories.error && isMissingMenuCategoriesTableError(menu_categories.error.message);

  if (
    menu.error ||
    (!categoriesRecoverable && menu_categories.error ? menu_categories.error : null) ||
    reviews.error ||
    partners.error ||
    settings.error
  ) {
    return NextResponse.json(
      {
        error: "Database error",
        details: [
          menu.error,
          !categoriesRecoverable ? menu_categories.error : null,
          reviews.error,
          partners.error,
          settings.error,
        ].filter(Boolean),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    menu: menu.data ?? [],
    menu_categories: categoriesRecoverable ? [] : (menu_categories.data ?? []),
    reviews: reviews.data ?? [],
    partners: partners.data ?? [],
    settings: settings.data ?? null,
  });
}
