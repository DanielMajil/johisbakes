import { NextResponse } from "next/server";
import { adminUnauthorized, requireAdminCookie } from "@/lib/admin-api";
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
  const { data: current, error: curErr } = await admin.from("menu_items").select("menu_group, category_id").eq("id", id).maybeSingle();
  if (curErr || !current) {
    return NextResponse.json({ error: curErr?.message || "Not found" }, { status: curErr ? 500 : 404 });
  }

  let nextGroup = normalizeMenuGroup(current.menu_group);
  if ("menu_group" in body && isMenuGroup(body.menu_group)) {
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
      if (catErr || !cat || cat.menu_group !== nextGroup) {
        return NextResponse.json({ error: "category_id must belong to this item’s menu (drinks or bakes)" }, { status: 400 });
      }
      patch.category_id = body.category_id;
    }
  } else if ("menu_group" in body && isMenuGroup(body.menu_group) && current.category_id) {
    const { data: cat } = await admin
      .from("menu_categories")
      .select("menu_group")
      .eq("id", current.category_id)
      .maybeSingle();
    if (cat && cat.menu_group !== body.menu_group) {
      patch.category_id = null;
    }
  }

  const { data, error } = await admin.from("menu_items").update(patch).eq("id", id).select("*").single();
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
