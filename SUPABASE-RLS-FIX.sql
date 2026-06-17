-- Fix for Supabase Security Advisor: rls_disabled_in_public
-- Run this in Supabase Dashboard -> SQL Editor.

-- Public catalog table:
-- anonymous users can only read active, visible products;
-- only the admin Auth user can create, edit, or hide products.
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

-- Dealer tables must not be readable or writable by the public.
-- Admin panel access is limited to the same Supabase Auth admin user.
alter table public.dealers enable row level security;
alter table public.dealer_prices enable row level security;

drop policy if exists "authenticated can manage dealers" on public.dealers;
drop policy if exists "admin can manage dealers" on public.dealers;
create policy "admin can manage dealers"
on public.dealers
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'compadmin@komputerra.local')
with check ((auth.jwt() ->> 'email') = 'compadmin@komputerra.local');

drop policy if exists "authenticated can manage dealer prices" on public.dealer_prices;
drop policy if exists "admin can manage dealer prices" on public.dealer_prices;
create policy "admin can manage dealer prices"
on public.dealer_prices
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'compadmin@komputerra.local')
with check ((auth.jwt() ->> 'email') = 'compadmin@komputerra.local');
