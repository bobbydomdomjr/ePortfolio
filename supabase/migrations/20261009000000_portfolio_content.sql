create table if not exists public.portfolio_content (
  id text primary key check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;

revoke all on public.portfolio_content from anon, authenticated;
grant select on public.portfolio_content to anon, authenticated;
grant insert, update on public.portfolio_content to authenticated;

create policy "Portfolio content is public"
  on public.portfolio_content for select
  to anon, authenticated
  using (id = 'main');

create policy "Portfolio admins can add content"
  on public.portfolio_content for insert
  to authenticated
  with check (
    id = 'main'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "Portfolio admins can update content"
  on public.portfolio_content for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (
    id = 'main'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
