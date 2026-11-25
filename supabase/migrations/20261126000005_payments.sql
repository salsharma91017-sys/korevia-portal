-- Payments received against each module (so the portal can show what is paid and what is still to invoice).
-- Module 1 is covered by the $5,000 project initiation fee, which has been paid.
alter table public.modules add column if not exists paid_cents integer not null default 0 check (paid_cents >= 0);
alter table public.modules add column if not exists paid_note  text;

update public.modules
   set paid_cents = amount_cents,
       paid_note  = 'Project initiation fee, paid. It covers this module, so accepting it does not trigger an invoice.'
 where n = 1 and paid_cents = 0;
