import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
import {
  isMenuItemsMissingNewColumnsError,
  isMissingMenuCategoriesTableError,
  menuRowHasSplitColumns,
} from "@/lib/menu-categories-db";
import { isMenuGroup, normalizeMenuGroup } from "@/lib/menu-groups";
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

  const admin = createSupabaseServiceClient();
  const { data: current, error: curErr } = await admin.from("menu_items").select("*").eq("id", id).maybeSingle();
  if (curErr || !current) {
    return NextResponse.json({ error: curErr?.message || "Not found" }, { status: curErr ? 500 : 404 });
  }

  const hasSplit = menuRowHasSplitColumns(current);
  const row = current as Record<string, unknown>;
  let nextGroup = normalizeMenuGroup(hasSplit ? row.menu_group : undefined);
  if (hasSplit && "menu_group" in body && isMenuGroup(body.menu_group)) {
    nextGroup = body.menu_group;
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (typeof body.category === "string") patch.category = body.category.trim() || null;
  if ("image_url" in body) {
    if (body.image_url === null) patch.image_url = null;
    else if (typeof body.image_url === "string") patch.image_url = body.image_url.trim() || null;
  }
  if (typeof body.price_cents === "number" && Number.isFinite(body.price_cents) && body.price_cents >= 0) {
    patch.price_cents = body.price_cents;
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = body.sort_order;
  }
  if (typeof body.is_available === "boolean") patch.is_available = body.is_available;

  if (hasSplit) {
    if ("menu_group" in body && isMenuGroup(body.menu_group)) {
      patch.menu_group = body.menu_group;
      nextGroup = body.menu_group;
    }

    if ("category_id" in body) {
      if (body.category_id === null) {
        patch.category_id = null;
      } else if (typeof body.category_id === "string" && body.category_id) {
        const { data: cat, error: catErr } = await admin
          .from("menu_categories")
          .select("menu_group")
          .eq("id", body.category_id)
          .maybeSingle();
        if (catErr && isMissingMenuCategoriesTableError(catErr.message)) {
          return NextResponse.json(
            {
              error:
                "The menu_categories table is missing. Run supabase/migration_menu_sections.sql in the Supabase SQL Editor, then refresh.",
              code: "MENU_MIGRATION_REQUIRED",
            },
            { status: 422 }
          );
        }
        if (catErr || !cat || cat.menu_group !== nextGroup) {
          return NextResponse.json(
            { error: "category_id must belong to this item’s menu (drinks or bakes)" },
            { status: 400 }
          );
        }
        patch.category_id = body.category_id;
      }
    } else if ("menu_group" in body && isMenuGroup(body.menu_group) && row.category_id) {
      const { data: cat, error: catErr } = await admin
        .from("menu_categories")
        .select("menu_group")
        .eq("id", row.category_id as string)
        .maybeSingle();
      if (!catErr && cat && cat.menu_group !== body.menu_group) {
        patch.category_id = null;
      }
    }
  }

  const runUpdate = async (p: Record<string, unknown>) =>
    admin.from("menu_items").update(p).eq("id", id).select("*").single();

  let { data, error } = await runUpdate(patch);
  if (error && isMenuItemsMissingNewColumnsError(error.message)) {
    const legacy = { ...patch };
    delete legacy.menu_group;
    delete legacy.category_id;
    ({ data, error } = await runUpdate(legacy));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) return adminUnauthorized();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createSupabaseServiceClient();
  const { error } = await admin.from("menu_items").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
