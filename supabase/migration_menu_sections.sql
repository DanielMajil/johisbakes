-- =============================================================================
-- REQUIRED for drink/bake menus + categories (run once on existing projects)
-- =============================================================================
-- Supabase → SQL → New query → paste this entire file → Run.
--
-- Fixes errors like:
--   Could not find the table 'public.menu_categories' in the schema cache
--   Could not find the 'category_id' column of 'menu_items' in the schema cache
--   column menu_items.menu_group does not exist
--
-- After a successful run, wait ~1 minute for the API schema cache to refresh,
-- or run the NOTIFY line at the bottom (included) to reload PostgREST immediately.
-- =============================================================================

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_group text not null check (menu_group in ('drinks', 'bakes')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.menu_categories enable row level security;

drop policy if exists "menu_categories_select_public" on public.menu_categories;
create policy "menu_categories_select_public" on public.menu_categories for select using (true);

alter table public.menu_items add column if not exists menu_group text;
alter table public.menu_items add column if not exists category_id uuid;

update public.menu_items set menu_group = 'drinks' where menu_group is null;

alter table public.menu_items
  alter column menu_group set default 'drinks',
  alter column menu_group set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'menu_items_menu_group_check'
  ) then
    alter table public.menu_items add constraint menu_items_menu_group_check
      check (menu_group in ('drinks', 'bakes'));
  end if;
end $$;

alter table public.menu_items
  drop constraint if exists menu_items_category_id_fkey;

alter table public.menu_items
  add constraint menu_items_category_id_fkey
  foreign key (category_id) references public.menu_categories (id) on delete set null;

create index if not exists menu_categories_group_sort_idx on public.menu_categories (menu_group, sort_order);
create index if not exists menu_items_group_sort_idx on public.menu_items (menu_group, sort_order);

-- Ask PostgREST to reload the schema cache (avoids waiting on Supabase to pick up new tables/columns)
notify pgrst, 'reload schema';
