import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { isMissingMenuCategoriesTableError, MENU_SPLIT_MIGRATION_INSTRUCTIONS } from "@/lib/menu-categories-db";
import { isMenuGroup } from "@/lib/menu-groups";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!(await requireAdminCookie())) return adminUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isMenuGroup(body.menu_group)) {
    return NextResponse.json({ error: "menu_group must be drinks or bakes" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from("menu_categories")
    .insert({ menu_group: body.menu_group, name, sort_order })
    .select("*")
    .single();

  if (error) {
    if (isMissingMenuCategoriesTableError(error.message)) {
      return NextResponse.json(
        { error: MENU_SPLIT_MIGRATION_INSTRUCTIONS, code: "MENU_MIGRATION_REQUIRED" },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ category: data });
}
