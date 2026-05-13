import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import { MENU_GROUP_LABEL, MENU_GROUPS, normalizeMenuGroup } from "@/lib/menu-groups";
import type { MenuItem } from "@/lib/types";

function itemCategoryLabel(item: MenuItem): string | null {
  return item.category_name?.trim() || item.category?.trim() || null;
}

function bucketByCategory(items: MenuItem[]) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  type Bucket = { key: string; subtitle: string | null; items: MenuItem[] };
  const buckets: Bucket[] = [];
  for (const it of sorted) {
    const key = it.category_id ?? `legacy:${itemCategoryLabel(it) ?? "none"}`;
    const subtitle = it.category_id ? itemCategoryLabel(it) : itemCategoryLabel(it);
    const last = buckets[buckets.length - 1];
    if (last && last.key === key) {
      last.items.push(it);
    } else {
      buckets.push({ key, subtitle, items: [it] });
    }
  }
  return buckets;
}

export function MenuBoard({
  items,
  showUnavailable = true,
  heading = "What’s available now",
}: {
  items: MenuItem[];
  showUnavailable?: boolean;
  heading?: string;
}) {
  const rows = showUnavailable ? items : items.filter((i) => i.is_available);

  return (
    <section className="space-y-4" id="menu">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-cocoa">{heading}</h2>
          <p className="text-sm text-cocoa/65">Prices and availability update from the admin phone.</p>
        </div>
        <Link
          href="/menu"
          className="text-sm font-semibold text-terracotta underline decoration-terracotta/30 underline-offset-4"
        >
          Open shareable page
        </Link>
      </div>

      {MENU_GROUPS.map((group) => {
        const inGroup = rows.filter((i) => normalizeMenuGroup(i.menu_group) === group);
        if (inGroup.length === 0) return null;
        const buckets = bucketByCategory(inGroup);
        return (
          <div key={group} className="space-y-2">
            <h3 className="font-display text-xl text-cocoa">{MENU_GROUP_LABEL[group]}</h3>
            <div className="overflow-hidden rounded-2xl border border-cocoa/10 bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-cocoa/5 text-xs uppercase tracking-wide text-cocoa/60">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.flatMap((bucket) => {
                    const head =
                      bucket.subtitle && bucket.items.length > 0 ? (
                        <tr key={`${bucket.key}-h`} className="border-t border-cocoa/10 bg-cocoa/[0.04]">
                          <td colSpan={3} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-cocoa/55">
                            {bucket.subtitle}
                          </td>
                        </tr>
                      ) : null;
                    const body = bucket.items.map((item) => (
                      <tr key={item.id} className="border-t border-cocoa/10 align-top">
                        <td className="px-3 py-3">
                          <div className="flex gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-cocoa/35">
                                  photo
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-cocoa">{item.name}</p>
                              {!item.category_id && item.category ? (
                                <p className="text-xs text-cocoa/50">{item.category}</p>
                              ) : null}
                              {item.description ? (
                                <p className="mt-1 text-xs leading-snug text-cocoa/65">{item.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-cocoa">
                          {formatPrice(item.price_cents)}
                        </td>
                        <td className="px-3 py-3">
                          {item.is_available ? (
                            <span className="inline-flex rounded-full bg-moss/15 px-2 py-0.5 text-xs font-semibold text-moss">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-cocoa/10 px-2 py-0.5 text-xs font-semibold text-cocoa/70">
                              Sold out
                            </span>
                          )}
                        </td>
                      </tr>
                    ));
                    return head ? [head, ...body] : body;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-cocoa/10 bg-white shadow-sm">
          <p className="px-3 py-8 text-center text-sm text-cocoa/60">Menu items will appear here once added in admin.</p>
        </div>
      ) : null}
    </section>
  );
}
