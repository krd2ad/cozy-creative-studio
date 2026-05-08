
-- list kinds
create type public.list_kind as enum ('tlp','customer','product');

-- list_items
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind public.list_kind not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index list_items_user_kind_idx on public.list_items(user_id, kind);

alter table public.list_items enable row level security;

create policy "list_items_select_own" on public.list_items
  for select to authenticated using (auth.uid() = user_id);
create policy "list_items_insert_own" on public.list_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "list_items_update_own" on public.list_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "list_items_delete_own" on public.list_items
  for delete to authenticated using (auth.uid() = user_id);

-- time_entries
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entry_date date not null,
  tlp_id uuid not null references public.list_items(id) on delete restrict,
  customer_id uuid not null references public.list_items(id) on delete restrict,
  product_id uuid not null references public.list_items(id) on delete restrict,
  description text not null default '',
  hours numeric(4,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index time_entries_user_date_idx on public.time_entries(user_id, entry_date);

alter table public.time_entries enable row level security;

create policy "time_entries_select_own" on public.time_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "time_entries_insert_own" on public.time_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "time_entries_update_own" on public.time_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "time_entries_delete_own" on public.time_entries
  for delete to authenticated using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

-- hours validation: positive and 15-minute increments
create or replace function public.validate_time_entry_hours()
returns trigger
language plpgsql
as $$
begin
  if new.hours is null or new.hours <= 0 then
    raise exception 'hours must be greater than zero';
  end if;
  if (new.hours * 4)::numeric <> floor(new.hours * 4) then
    raise exception 'hours must be in 15-minute (0.25) increments';
  end if;
  return new;
end;
$$;

create trigger time_entries_validate_hours
before insert or update on public.time_entries
for each row execute function public.validate_time_entry_hours();

-- seed sample list items for new users
create or replace function public.seed_default_list_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.list_items (user_id, kind, name) values
    (new.id, 'tlp', 'Internal'),
    (new.id, 'tlp', 'Client Work'),
    (new.id, 'tlp', 'Admin'),
    (new.id, 'customer', 'Acme Corp'),
    (new.id, 'customer', 'Globex'),
    (new.id, 'customer', 'Internal'),
    (new.id, 'product', 'Consulting'),
    (new.id, 'product', 'Development'),
    (new.id, 'product', 'Support'),
    (new.id, 'product', 'Meetings');
  return new;
end;
$$;

create trigger on_auth_user_seed_lists
after insert on auth.users
for each row execute function public.seed_default_list_items();
