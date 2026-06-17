-- One-time setup for retail admin editing via Supabase Auth
-- 1) In Supabase Dashboard open Authentication -> Users -> Add user
-- 2) Create this user:
--    email: compadmin@komputerra.local
--    password: 2V66htmPFf
--    confirm email: true
-- 3) Run this SQL in SQL Editor

alter table public.products enable row level security;

drop policy if exists "public can read visible products" on public.products;
create policy "public can read visible products"
on public.products
for select
to anon
using (
  is_active = true
  and coalesce(hidden_by_admin, false) = false
);

drop policy if exists "admin full access on products" on public.products;
create policy "admin full access on products"
on public.products
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'compadmin@komputerra.local')
with check ((auth.jwt() ->> 'email') = 'compadmin@komputerra.local');
