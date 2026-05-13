import Image from "next/image";
import type { Partner, Review, SiteSettings } from "@/lib/types";

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-cocoa">Customer love</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <figure
            key={r.id}
            className="overflow-hidden rounded-2xl border border-cocoa/10 bg-white p-4 shadow-sm"
          >
            <div className="flex gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-honey/25">
                {r.photo_url ? (
                  <Image src={r.photo_url} alt="" fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-display text-terracotta">
                    {r.customer_name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <figcaption className="font-semibold text-cocoa">{r.customer_name}</figcaption>
                <blockquote className="mt-1 text-sm leading-relaxed text-cocoa/75">“{r.quote}”</blockquote>
              </div>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PartnersSection({ settings, partners }: { settings: SiteSettings | null; partners: Partner[] }) {
  if (partners.length === 0 && !settings?.coffee_partner_body) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-cocoa">Ingredients & partners</h2>
      <div className="rounded-2xl border border-cocoa/10 bg-white p-5 shadow-sm">
        <p className="font-semibold text-cocoa">{settings?.coffee_partner_title ?? "Trusted products"}</p>
        <p className="mt-2 text-sm leading-relaxed text-cocoa/75">
          {settings?.coffee_partner_body ??
            "We highlight the brands and ingredients behind our drinks and bakes."}
        </p>
        {partners.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {partners.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-cream p-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-cocoa/10 bg-white">
                  {p.logo_url ? (
                    <Image src={p.logo_url} alt="" fill className="object-contain p-1" sizes="48px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-cocoa/35">
                      logo
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-cocoa">{p.company_name}</p>
                  {p.note ? <p className="text-xs text-cocoa/65">{p.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export function VisitSection({ settings }: { settings: SiteSettings | null }) {
  const has =
    settings?.address_line ||
    settings?.hours ||
    settings?.maps_url ||
    settings?.phone ||
    settings?.email;
  if (!has) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-cocoa">Visit & contact</h2>
      <div className="rounded-2xl border border-cocoa/10 bg-white p-5 shadow-sm">
        {settings?.address_line ? (
          <p className="text-sm font-medium text-cocoa">{settings.address_line}</p>
        ) : null}
        {settings?.hours ? (
          <p className="mt-2 whitespace-pre-line text-sm text-cocoa/75">{settings.hours}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 text-sm">
          {settings?.phone ? (
            <a className="font-semibold text-terracotta" href={`tel:${settings.phone.replace(/\s/g, "")}`}>
              {settings.phone}
            </a>
          ) : null}
          {settings?.email ? (
            <a className="font-semibold text-terracotta" href={`mailto:${settings.email}`}>
              {settings.email}
            </a>
          ) : null}
          {settings?.maps_url ? (
            <a
              className="inline-flex w-fit items-center rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-cream"
              href={settings.maps_url}
              target="_blank"
              rel="noreferrer"
            >
              Open in Maps
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
