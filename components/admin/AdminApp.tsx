"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MENU_GROUP_ADMIN_LABEL, MENU_GROUPS, type MenuGroup, normalizeMenuGroup } from "@/lib/menu-groups";
import type { MenuCategory, MenuItem, Partner, Review, SiteSettings } from "@/lib/types";

type AdminPayload = {
  menu: MenuItem[];
  menu_categories: MenuCategory[];
  reviews: Review[];
  partners: Partner[];
  settings: SiteSettings | null;
};

function enrichMenuItem(item: MenuItem, categories: MenuCategory[]): MenuItem {
  const category_name = item.category_id ? (categories.find((c) => c.id === item.category_id)?.name ?? null) : null;
  return {
    ...item,
    menu_group: normalizeMenuGroup(item.menu_group),
    category_name,
  };
}

function dollarsFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function centsFromDollarsString(s: string) {
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

async function uploadImage(file: File) {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(json.error || "Upload failed");
  if (!json.url) throw new Error("No URL returned");
  return json.url;
}

export function AdminApp() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuTab, setMenuTab] = useState<MenuGroup>("drinks");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    const json = (await res.json()) as AdminPayload & { error?: string };
    if (!res.ok) {
      setError(json.error || "Could not load admin data");
      setData(null);
      return;
    }
    const menu_categories = json.menu_categories ?? [];
    setData({
      menu: (json.menu ?? []).map((m) => enrichMenuItem(m as MenuItem, menu_categories)),
      menu_categories,
      reviews: json.reviews ?? [],
      partners: json.partners ?? [],
      settings: json.settings ?? null,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settings = data?.settings;

  const patchSite = async (partial: Record<string, string | null>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setData((d) => (d ? { ...d, settings: json.settings } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const patchMenu = async (id: string, partial: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setData((d) => {
        if (!d) return d;
        const item = enrichMenuItem(json.item as MenuItem, d.menu_categories);
        return {
          ...d,
          menu: d.menu.map((m) => (m.id === id ? item : m)),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/menu/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setData((d) => (d ? { ...d, menu: d.menu.filter((m) => m.id !== id) } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const createMenu = async () => {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const groupCount = data.menu.filter((m) => normalizeMenuGroup(m.menu_group) === menuTab).length;
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New item",
          price_cents: 0,
          description: "",
          category: null,
          menu_group: menuTab,
          category_id: null,
          is_available: true,
          sort_order: groupCount * 10,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      setData((d) => {
        if (!d) return d;
        const item = enrichMenuItem(json.item as MenuItem, d.menu_categories);
        return { ...d, menu: [...d.menu, item] };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const createMenuCategory = async (menu_group: MenuGroup, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const sort_order =
        (data?.menu_categories.filter((c) => c.menu_group === menu_group).length ?? 0) * 10;
      const res = await fetch("/api/admin/menu-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_group, name: trimmed, sort_order }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const patchMenuCategory = async (id: string, partial: { name?: string; sort_order?: number }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/menu-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setData((d) => {
        if (!d) return d;
        const nextCats = d.menu_categories.map((c) => (c.id === id ? (json.category as MenuCategory) : c));
        return {
          ...d,
          menu_categories: nextCats,
          menu: d.menu.map((m) => enrichMenuItem(m, nextCats)),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteMenuCategory = async (id: string) => {
    if (!confirm("Delete this category? Items using it will lose the category link.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/menu-categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const reviewMut = async (method: "POST" | "PATCH" | "DELETE", id: string | null, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const url = id ? `/api/admin/reviews/${id}` : "/api/admin/reviews";
      const res = await fetch(url, {
        method,
        headers: method === "DELETE" ? undefined : { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const partnerMut = async (method: "POST" | "PATCH" | "DELETE", id: string | null, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const url = id ? `/api/admin/partners/${id}` : "/api/admin/partners";
      const res = await fetch(url, {
        method,
        headers: method === "DELETE" ? undefined : { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const siteDefaults = useMemo(
    () => ({
      business_name: settings?.business_name ?? "Johis Bakes",
      tagline: settings?.tagline ?? "",
      about: settings?.about ?? "",
      address_line: settings?.address_line ?? "",
      maps_url: settings?.maps_url ?? "",
      phone: settings?.phone ?? "",
      email: settings?.email ?? "",
      hours: settings?.hours ?? "",
      hero_image_url: settings?.hero_image_url ?? "",
      coffee_partner_title: settings?.coffee_partner_title ?? "",
      coffee_partner_body: settings?.coffee_partner_body ?? "",
      instagram_url: settings?.instagram_url ?? "",
    }),
    [settings]
  );

  return (
    <div className="min-h-dvh bg-zinc-50 pb-24 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Admin</p>
            <p className="font-semibold">Johis Bakes</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold"
              onClick={() => void load()}
              disabled={busy}
            >
              Refresh
            </button>
            <button
              type="button"
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>
        ) : null}

        {!data ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : (
          <>
            <SiteForm
              key={JSON.stringify(siteDefaults)}
              defaults={siteDefaults}
              busy={busy}
              onSave={(partial) => void patchSite(partial)}
              onUploadHero={async (file) => {
                const url = await uploadImage(file);
                await patchSite({ hero_image_url: url });
              }}
            />

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Menu & availability</h2>
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => void createMenu()}
                  disabled={busy}
                >
                  Add item here
                </button>
              </div>
              <p className="text-xs text-zinc-600">
                Use the two menus below for drinks vs baked goods. Categories are created per menu, then assigned to
                each item. Customers see both sections on the home page and on <span className="font-semibold">/menu</span>.
              </p>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
                {MENU_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-sm font-semibold sm:flex-none ${
                      menuTab === g ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                    onClick={() => setMenuTab(g)}
                  >
                    {MENU_GROUP_ADMIN_LABEL[g]}
                  </button>
                ))}
              </div>

              <MenuCategoriesPanel
                group={menuTab}
                categories={data.menu_categories}
                busy={busy}
                onCreate={(name) => void createMenuCategory(menuTab, name)}
                onPatchCat={(id, p) => void patchMenuCategory(id, p)}
                onDeleteCat={(id) => void deleteMenuCategory(id)}
              />

              <div className="space-y-3">
                {data.menu
                  .filter((item) => normalizeMenuGroup(item.menu_group) === menuTab)
                  .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
                  .map((item) => (
                    <MenuEditorCard
                      key={item.id}
                      item={item}
                      categories={data.menu_categories.filter(
                        (c) => c.menu_group === normalizeMenuGroup(item.menu_group)
                      )}
                      busy={busy}
                      onPatch={(p) => void patchMenu(item.id, p)}
                      onDelete={() => void deleteMenu(item.id)}
                      onUpload={async (file) => {
                        const url = await uploadImage(file);
                        await patchMenu(item.id, { image_url: url });
                      }}
                    />
                  ))}
              </div>
            </section>

            <ReviewsAdmin
              reviews={data.reviews}
              busy={busy}
              onAdd={() =>
                void reviewMut("POST", null, {
                  customer_name: "Customer",
                  quote: "Loved it!",
                  is_published: true,
                  sort_order: data.reviews.length * 10,
                })
              }
              onSave={(id, body) => void reviewMut("PATCH", id, body)}
              onUploadPhoto={async (id, file) => {
                const url = await uploadImage(file);
                await reviewMut("PATCH", id, { photo_url: url });
              }}
              onDelete={(id) => {
                if (!confirm("Delete review?")) return;
                void reviewMut("DELETE", id);
              }}
            />

            <PartnersAdmin
              partners={data.partners}
              busy={busy}
              onAdd={() =>
                void partnerMut("POST", null, {
                  company_name: "Partner name",
                  is_published: true,
                  sort_order: data.partners.length * 10,
                })
              }
              onSave={(id, body) => void partnerMut("PATCH", id, body)}
              onUploadLogo={async (id, file) => {
                const url = await uploadImage(file);
                await partnerMut("PATCH", id, { logo_url: url });
              }}
              onDelete={(id) => {
                if (!confirm("Delete partner?")) return;
                void partnerMut("DELETE", id);
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <input
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
        {...props}
      />
    </label>
  );
}

function Area({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <textarea
        className="min-h-[88px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
        {...props}
      />
    </label>
  );
}

function SiteForm({
  defaults,
  busy,
  onSave,
  onUploadHero,
}: {
  defaults: Record<string, string>;
  busy: boolean;
  onSave: (partial: Record<string, string | null>) => void | Promise<void>;
  onUploadHero: (file: File) => Promise<void>;
}) {
  const [form, setForm] = useState(defaults);

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Business text & contact</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        <Field label="Tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
      </div>
      <Area label="About (shown on home)" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Address" value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
        <Field label="Maps link" value={form.maps_url} onChange={(e) => setForm({ ...form, maps_url: e.target.value })} />
        <Field label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Field label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <Area label="Hours (multi-line ok)" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
      <Field label="Instagram URL" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Partner section title"
          value={form.coffee_partner_title}
          onChange={(e) => setForm({ ...form, coffee_partner_title: e.target.value })}
        />
        <Field label="Hero image URL (optional)" value={form.hero_image_url} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} />
      </div>
      <Area
        label="Partner section body (e.g. Coffee Bean story)"
        value={form.coffee_partner_body}
        onChange={(e) => setForm({ ...form, coffee_partner_body: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => onSave({ ...form })}
        >
          Save business info
        </button>
        <label className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">
          Upload hero photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                await onUploadHero(f);
              } catch (err) {
                alert(err instanceof Error ? err.message : "Upload failed");
              }
            }}
          />
        </label>
      </div>
    </section>
  );
}

function MenuCategoriesPanel({
  group,
  categories,
  busy,
  onCreate,
  onPatchCat,
  onDeleteCat,
}: {
  group: MenuGroup;
  categories: MenuCategory[];
  busy: boolean;
  onCreate: (name: string) => void | Promise<void>;
  onPatchCat: (id: string, partial: { name?: string; sort_order?: number }) => void | Promise<void>;
  onDeleteCat: (id: string) => void | Promise<void>;
}) {
  const rows = categories.filter((c) => c.menu_group === group);
  const [newName, setNewName] = useState("");

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-xs font-semibold text-zinc-600">Categories for this menu</p>
      <p className="text-[11px] text-zinc-500">
        Example: Frapes, Iced coffee, Cookies. Items can pick one category from this list (or none).
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
          placeholder="New category name"
          value={newName}
          disabled={busy}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          className="rounded-full bg-white px-3 py-2 text-sm font-semibold ring-1 ring-zinc-200 disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            void onCreate(newName);
            setNewName("");
          }}
        >
          Add category
        </button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-xs text-zinc-500">No categories yet — add one above.</p> : null}
        {rows.map((c) => (
          <MenuCategoryRow key={c.id} category={c} busy={busy} onPatchCat={onPatchCat} onDeleteCat={onDeleteCat} />
        ))}
      </div>
    </div>
  );
}

function MenuCategoryRow({
  category,
  busy,
  onPatchCat,
  onDeleteCat,
}: {
  category: MenuCategory;
  busy: boolean;
  onPatchCat: (id: string, partial: { name?: string; sort_order?: number }) => void | Promise<void>;
  onDeleteCat: (id: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(category.name);
  const [sort, setSort] = useState(String(category.sort_order));

  useEffect(() => {
    setName(category.name);
    setSort(String(category.sort_order));
  }, [category]);

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-2">
      <label className="min-w-[8rem] flex-1 space-y-1">
        <span className="text-[10px] font-semibold text-zinc-500">Name</span>
        <input
          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="w-20 space-y-1">
        <span className="text-[10px] font-semibold text-zinc-500">Sort</span>
        <input
          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
          inputMode="numeric"
          value={sort}
          disabled={busy}
          onChange={(e) => setSort(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        disabled={busy}
        onClick={() =>
          void onPatchCat(category.id, {
            name: name.trim(),
            sort_order: Number.parseInt(sort, 10) || 0,
          })
        }
      >
        Save
      </button>
      <button
        type="button"
        className="text-xs font-semibold text-red-700 disabled:opacity-50"
        disabled={busy}
        onClick={() => void onDeleteCat(category.id)}
      >
        Delete
      </button>
    </div>
  );
}

function MenuEditorCard({
  item,
  categories,
  busy,
  onPatch,
  onDelete,
  onUpload,
}: {
  item: MenuItem;
  categories: MenuCategory[];
  busy: boolean;
  onPatch: (p: Record<string, unknown>) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUpload: (file: File) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [menuGroup, setMenuGroup] = useState<MenuGroup>(normalizeMenuGroup(item.menu_group));
  const [categoryId, setCategoryId] = useState(item.category_id ?? "");
  const [price, setPrice] = useState(dollarsFromCents(item.price_cents));
  const [sort, setSort] = useState(String(item.sort_order));

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setMenuGroup(normalizeMenuGroup(item.menu_group));
    setCategoryId(item.category_id ?? "");
    setPrice(dollarsFromCents(item.price_cents));
    setSort(String(item.sort_order));
  }, [item]);

  const categoryOptions = categories.filter((c) => c.menu_group === menuGroup);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Area label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-zinc-600">Menu</span>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
                value={menuGroup}
                disabled={busy}
                onChange={(e) => {
                  const g = normalizeMenuGroup(e.target.value);
                  setMenuGroup(g);
                  setCategoryId("");
                }}
              >
                {MENU_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {MENU_GROUP_ADMIN_LABEL[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-zinc-600">Category</span>
              <select
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/15"
                value={categoryId}
                disabled={busy}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">None</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Field label="Sort order" value={sort} inputMode="numeric" onChange={(e) => setSort(e.target.value)} />
          <Field label="Price (USD)" value={price} inputMode="decimal" onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <label className="relative h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 text-center text-[10px] text-zinc-500">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-2">Tap to add photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  await onUpload(f);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Upload failed");
                }
              }}
            />
          </label>
          {item.image_url ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-red-700 underline decoration-red-700/40 underline-offset-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => void onPatch({ image_url: null })}
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={item.is_available}
            disabled={busy}
            onChange={(e) => void onPatch({ is_available: e.target.checked })}
          />
          Available
        </label>
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => {
            const cents = centsFromDollarsString(price);
            if (cents === null) {
              alert("Enter a valid price");
              return;
            }
            void onPatch({
              name,
              description: description.trim() || null,
              category: null,
              menu_group: menuGroup,
              category_id: categoryId || null,
              price_cents: cents,
              sort_order: Number.parseInt(sort, 10) || 0,
            });
          }}
        >
          Save item
        </button>
        <button
          type="button"
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 disabled:opacity-50"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function ReviewsAdmin({
  reviews,
  busy,
  onAdd,
  onSave,
  onUploadPhoto,
  onDelete,
}: {
  reviews: Review[];
  busy: boolean;
  onAdd: () => void;
  onSave: (id: string, body: Record<string, unknown>) => void;
  onUploadPhoto: (id: string, file: File) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <button type="button" className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white" onClick={onAdd} disabled={busy}>
          Add review
        </button>
      </div>
      <p className="text-xs text-zinc-600">
        Customer photos: tap the square to upload, use “Remove photo” to clear, or paste an image URL and save.
      </p>
      <div className="space-y-3">
        {reviews.map((r) => (
          <ReviewRow key={r.id} review={r} busy={busy} onSave={onSave} onUploadPhoto={(file) => onUploadPhoto(r.id, file)} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function ReviewRow({
  review,
  busy,
  onSave,
  onUploadPhoto,
  onDelete,
}: {
  review: Review;
  busy: boolean;
  onSave: (id: string, body: Record<string, unknown>) => void;
  onUploadPhoto: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [customer_name, setCustomer] = useState(review.customer_name);
  const [quote, setQuote] = useState(review.quote);
  const [photo_url, setPhoto] = useState(review.photo_url ?? "");
  const [sort_order, setSort] = useState(String(review.sort_order));

  useEffect(() => {
    setCustomer(review.customer_name);
    setQuote(review.quote);
    setPhoto(review.photo_url ?? "");
    setSort(String(review.sort_order));
  }, [review]);

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Field label="Name" value={customer_name} onChange={(e) => setCustomer(e.target.value)} />
          <Area label="Quote" value={quote} onChange={(e) => setQuote(e.target.value)} />
          <Field label="Photo URL (optional)" value={photo_url} onChange={(e) => setPhoto(e.target.value)} />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <label className="relative h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-center text-[10px] text-zinc-500">
            {review.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={review.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-2">Tap to add photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  await onUploadPhoto(f);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Upload failed");
                }
              }}
            />
          </label>
          {review.photo_url ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-red-700 underline decoration-red-700/40 underline-offset-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => onSave(review.id, { photo_url: null })}
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Field label="Sort" value={sort_order} onChange={(e) => setSort(e.target.value)} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={review.is_published}
            disabled={busy}
            onChange={(e) => onSave(review.id, { is_published: e.target.checked })}
          />
          Published
        </label>
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white"
          disabled={busy}
          onClick={() =>
            onSave(review.id, {
              customer_name,
              quote,
              photo_url: photo_url.trim() || null,
              sort_order: Number.parseInt(sort_order, 10) || 0,
            })
          }
        >
          Save
        </button>
        <button type="button" className="text-sm font-semibold text-red-700" disabled={busy} onClick={() => onDelete(review.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function PartnersAdmin({
  partners,
  busy,
  onAdd,
  onSave,
  onUploadLogo,
  onDelete,
}: {
  partners: Partner[];
  busy: boolean;
  onAdd: () => void;
  onSave: (id: string, body: Record<string, unknown>) => void;
  onUploadLogo: (id: string, file: File) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Partners / logos</h2>
        <button type="button" className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white" onClick={onAdd} disabled={busy}>
          Add partner
        </button>
      </div>
      <p className="text-xs text-zinc-600">
        Logos: tap the square to upload, “Remove logo” to clear, or paste a URL and save.
      </p>
      <div className="space-y-3">
        {partners.map((p) => (
          <PartnerRow key={p.id} partner={p} busy={busy} onSave={onSave} onUploadLogo={(file) => onUploadLogo(p.id, file)} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function PartnerRow({
  partner,
  busy,
  onSave,
  onUploadLogo,
  onDelete,
}: {
  partner: Partner;
  busy: boolean;
  onSave: (id: string, body: Record<string, unknown>) => void;
  onUploadLogo: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [company_name, setName] = useState(partner.company_name);
  const [logo_url, setLogo] = useState(partner.logo_url ?? "");
  const [note, setNote] = useState(partner.note ?? "");
  const [sort_order, setSort] = useState(String(partner.sort_order));

  useEffect(() => {
    setName(partner.company_name);
    setLogo(partner.logo_url ?? "");
    setNote(partner.note ?? "");
    setSort(String(partner.sort_order));
  }, [partner]);

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Field label="Company" value={company_name} onChange={(e) => setName(e.target.value)} />
          <Field label="Logo URL (optional)" value={logo_url} onChange={(e) => setLogo(e.target.value)} />
          <Area label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <label className="relative h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-center text-[10px] text-zinc-500">
            {partner.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logo_url} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-2">Tap to add logo</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  await onUploadLogo(f);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Upload failed");
                }
              }}
            />
          </label>
          {partner.logo_url ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-red-700 underline decoration-red-700/40 underline-offset-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => onSave(partner.id, { logo_url: null })}
            >
              Remove logo
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Field label="Sort" value={sort_order} onChange={(e) => setSort(e.target.value)} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={partner.is_published}
            disabled={busy}
            onChange={(e) => onSave(partner.id, { is_published: e.target.checked })}
          />
          Published
        </label>
        <button
          type="button"
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white"
          disabled={busy}
          onClick={() =>
            onSave(partner.id, {
              company_name,
              logo_url: logo_url.trim() || null,
              note: note.trim() || null,
              sort_order: Number.parseInt(sort_order, 10) || 0,
            })
          }
        >
          Save
        </button>
        <button type="button" className="text-sm font-semibold text-red-700" disabled={busy} onClick={() => onDelete(partner.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
