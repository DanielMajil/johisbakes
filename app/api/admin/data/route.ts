import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  if (!(await requireAdminCookie())) return adminUnauthorized();

  const admin = createSupabaseServiceClient();
  const [menu, reviews, partners, settings] = await Promise.all([
    admin.from("menu_items").select("*").order("sort_order", { ascending: true }),
    admin.from("reviews").select("*").order("sort_order", { ascending: true }),
    admin.from("partners").select("*").order("sort_order", { ascending: true }),
    admin.from("site_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (menu.error || reviews.error || partners.error || settings.error) {
    return NextResponse.json(
      {
        error: "Database error",
        details: [menu.error, reviews.error, partners.error, settings.error].filter(Boolean),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    menu: menu.data ?? [],
    reviews: reviews.data ?? [],
    partners: partners.data ?? [],
    settings: settings.data ?? null,
  });
}
