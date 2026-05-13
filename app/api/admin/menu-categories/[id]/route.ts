import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import { isMissingMenuCategoriesTableError, MENU_SPLIT_MIGRATION_INSTRUCTIONS } from "@/lib/menu-categories-db";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) return adminUnauthorized();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    patch.name = n;
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = body.sort_order;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin.from("menu_categories").update(patch).eq("id", id).select("*").single();
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

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) return adminUnauthorized();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createSupabaseServiceClient();
  const { error } = await admin.from("menu_categories").delete().eq("id", id);
  if (error) {
    if (isMissingMenuCategoriesTableError(error.message)) {
      return NextResponse.json(
        { error: MENU_SPLIT_MIGRATION_INSTRUCTIONS, code: "MENU_MIGRATION_REQUIRED" },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
