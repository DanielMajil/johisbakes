-- Run this in Supabase SQL Editor (Dashboard → SQL → New query) after creating a project.

-- Categories belong to one top-level menu (drinks vs bakes). Items pick a category from the same menu.
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_group text not null check (menu_group in ('drinks', 'bakes')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Menu items (prices in cents; toggle is_available for sold out)
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  category text,
  menu_group text not null default 'drinks' check (menu_group in ('drinks', 'bakes')),
  category_id uuid references public.menu_categories (id) on delete set null,
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  quote text not null,
  photo_url text,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  logo_url text,
  note text,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Single-row site copy & contact (id always 1)
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  business_name text not null default 'Johis Bakes',
  tagline text default 'Frapes, drinks & baked goods',
  about text default '',
  address_line text default '',
  maps_url text default '',
  phone text default '',
  email text default '',
  hours text default '',
  hero_image_url text default '',
  coffee_partner_title text default 'Proudly using quality ingredients',
  coffee_partner_body text default 'We craft our drinks using Coffee Bean & Tea Leaf products and other trusted partners.',
  instagram_url text default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.reviews enable row level security;
alter table public.partners enable row level security;
alter table public.site_settings enable row level security;

-- Public read (anon key used by the website)
create policy "menu_categories_select_public" on public.menu_categories for select using (true);
create policy "menu_items_select_public" on public.menu_items for select using (true);
create policy "reviews_select_public" on public.reviews for select using (is_published = true);
create policy "partners_select_public" on public.partners for select using (is_published = true);
create policy "site_settings_select_public" on public.site_settings for select using (true);

-- Writes happen only with the service role key from your server (API routes), which bypasses RLS.

create index if not exists menu_categories_group_sort_idx on public.menu_categories (menu_group, sort_order);
create index if not exists menu_items_sort_idx on public.menu_items (sort_order, name);
create index if not exists menu_items_group_sort_idx on public.menu_items (menu_group, sort_order);
create index if not exists reviews_sort_idx on public.reviews (sort_order);
create index if not exists partners_sort_idx on public.partners (sort_order);

-- Storage: public bucket for images (create in Dashboard → Storage → New bucket named "media", public)
-- Then run:
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects
for select using (bucket_id = 'media');

-- Optional: allow authenticated users to upload — we use service role from API instead, so no insert policy for anon.
