-- Run after 001_diary_submission.sql through 003_api_permissions.sql on an
-- existing project. It gives an exchange participant read access only to the
-- other participant's diary and attached image.

create or replace function public.can_read_matched_diary_image(p_object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entries as image_entry
    join public.exchanges as exchange_row
      on exchange_row.first_entry_id = image_entry.id
      or exchange_row.second_entry_id = image_entry.id
    join public.entries as viewer_entry
      on viewer_entry.id = case
        when exchange_row.first_entry_id = image_entry.id
          then exchange_row.second_entry_id
        else exchange_row.first_entry_id
      end
    where image_entry.image_path = p_object_name
      and viewer_entry.author_id = auth.uid()
  );
$$;

revoke all on function public.can_read_matched_diary_image(text) from public;
grant execute on function public.can_read_matched_diary_image(text) to authenticated;

drop policy if exists "Read matched diary image" on storage.objects;
create policy "Read matched diary image"
on storage.objects for select to authenticated
using (
  bucket_id = 'diary-images'
  and public.can_read_matched_diary_image(name)
);

create or replace function public.get_received_entry_for_exchange(p_exchange_id uuid)
returns table(entry_id uuid, body text, image_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  received_entry_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select case
    when exchange_row.first_entry_id = own_entry.id then exchange_row.second_entry_id
    else exchange_row.first_entry_id
  end
  into received_entry_id
  from public.exchanges as exchange_row
  join public.entries as own_entry
    on own_entry.id = exchange_row.first_entry_id
    or own_entry.id = exchange_row.second_entry_id
  where exchange_row.id = p_exchange_id
    and own_entry.author_id = auth.uid();

  if received_entry_id is null then
    raise exception 'EXCHANGE_NOT_FOUND';
  end if;

  return query
  select entry_row.id, entry_row.body, entry_row.image_path
  from public.entries as entry_row
  where entry_row.id = received_entry_id;
end;
$$;

revoke all on function public.get_received_entry_for_exchange(uuid) from public;
grant execute on function public.get_received_entry_for_exchange(uuid) to authenticated;
