
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_time_entry_hours()
returns trigger
language plpgsql
set search_path = public
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

revoke execute on function public.seed_default_list_items() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_time_entry_hours() from public, anon, authenticated;
