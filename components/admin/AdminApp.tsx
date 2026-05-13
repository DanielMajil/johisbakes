"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuItem, Partner, Review, SiteSettings } from "@/lib/types";

type AdminPayload = {
  menu: MenuItem[];
  reviews: Review[];
  partners: Partner[];
  settings: SiteSettings | null;
};

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

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    const json = (await res.json()) as AdminPayload & { error?: string };
    if (!res.ok) {
      setError(json.error || "Could not load admin data");
      setData(null);
      return;
    }
    setData({
      menu: json.menu ?? [],
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
        return {
          ...d,
          menu: d.menu.map((m) => (m.id === id ? json.item : m)),
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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New item",
          price_cents: 0,
          description: "",
          category: "",
          is_available: true,
          sort_order: (data?.menu.length ?? 0) * 10,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      setData((d) => (d ? { ...d, menu: [...d.menu, json.item] } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Menu & availability</h2>
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => void createMenu()}
                  disabled={busy}
                >
                  Add item
                </button>
              </div>
              <p className="text-xs text-zinc-600">
                Toggle “Available” when something sells out. Customers always see the live list on{" "}
                <span className="font-semibold">/menu</span>.
              </p>
              <div className="space-y-3">
                {data.menu.map((item) => (
                  <MenuEditorCard
                    key={item.id}
                    item={item}
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

function MenuEditorCard({
  item,
  busy,
  onPatch,
  onDelete,
  onUpload,
}: {
  item: MenuItem;
  busy: boolean;
  onPatch: (p: Record<string, unknown>) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onUpload: (file: File) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category ?? "");
  const [price, setPrice] = useState(dollarsFromCents(item.price_cents));
  const [sort, setSort] = useState(String(item.sort_order));

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setCategory(item.category ?? "");
    setPrice(dollarsFromCents(item.price_cents));
    setSort(String(item.sort_order));
  }, [item]);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Area label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Field label="Sort order" value={sort} inputMode="numeric" onChange={(e) => setSort(e.target.value)} />
          </div>
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
              category: category.trim() || null,
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
