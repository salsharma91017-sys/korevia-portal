# KoreVia client portal

Progress, test evidence and acceptance for the M-Powered Pathways build, at **portal.korevia.solutions**. It is KoreVia's tool (agreement section 7), separate from the Pathways app and its accounts.

What it shows, per module (the 18 modules in Schedule A):

- **Status and accept**: Backlog, In development, Ready for review, Accepted; a link to the UAT site; the client's Accept and Request-changes actions; full history.
- **Scope**: the Schedule A features for the module.
- **Test guide**: step-by-step test scripts with screenshots, pushed automatically from the Pathways repo.
- **Results**: automatic test results with screenshots, plus results (with screenshots) recorded by people.
- **Evidence**: acceptance records, change requests, test runs with Word packs, and the change notes (design or scope changes).

## Who can do what

| Role | Who | Can |
|---|---|---|
| owner | KoreVia (Sal) | Set status, target dates and test links; manage people. Cannot accept a module. |
| client | M-Powered Pathways director | Accept a module, request changes, record test results. |
| tester | Dee's team | Record test results and screenshots. |
| viewer | anyone else | Read only. Every new login starts here. |

Sign-in is email and password. Acceptance is recorded with the person's name, a typed sign-off and a snapshot of the latest test results, and cannot be edited afterwards.

## Set-up (once)

1. **New Supabase project** (region Sydney), separate from the Pathways projects. Name it `korevia-portal`.
   - Authentication, Sign In / Providers: turn **off** "Allow new users to sign up". Only people you create can sign in.
   - Authentication, URL Configuration: Site URL `https://portal.korevia.solutions`.
   - SQL editor: run `supabase/migrations/20261126000001_portal.sql`, then `20261126000002_seed_schedule_a.sql`. (The second loads the 18 modules and 121 features.)
2. **People.** Authentication, Users, Add user: create your login and the client's login (you type the passwords; send the client theirs yourself and ask them to change it). Then in the SQL editor set the roles and exact names (the client types this name to sign off):
   ```sql
   update public.profiles set role = 'owner',  full_name = 'Sal Sharma'    where email = 'YOUR-EMAIL';
   update public.profiles set role = 'client', full_name = 'Deepeeka Pal'  where email = 'DEE-EMAIL';
   ```
   Further logins can be added the same way and given a role on the People page in the portal.
3. **Vercel project** for this repository (a new project, e.g. `korevia-portal`). Environment variables, Production scope, from `.env.example`:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_PROJECT_REF`, `INGEST_TOKEN` (32+ random characters, make one up), `DEFAULT_UAT_URL`.
   Then add the domain `portal.korevia.solutions` under Settings, Domains, and add the DNS record Vercel shows at wherever korevia.solutions is hosted.
4. **Connect the Pathways repo** (so each test run appears here). In the Pathways GitHub repo, Settings, Secrets and variables, Actions:
   - Secret `PORTAL_INGEST_TOKEN` = the same value as `INGEST_TOKEN` above.
   - Variable `PORTAL_URL` = `https://portal.korevia.solutions`.
   - Variable `PORTAL_MODULE` = `1` (change to the number of the module being built; Module 2 later is `2`).
5. Sign in, open Module 1, and check the tabs. The first Browser tests run after step 4 fills in Test guide, Results and Evidence.

## Day to day

- Building a module: it sits at *In development*. When the automatic tests pass and you are ready, open the module, Status and accept, and choose *Ready for review*. The client then sees the review form.
- The client tests with the Test guide (and records results under Results), then accepts or requests changes. A change request puts the module back to *In development*; when you resubmit, open requests are marked resolved.
- Target dates come from the signed agreement: enter them on each module (the build price is already loaded).

## Email notifications

The portal emails people when something needs their attention (sent through Resend, branded with the KoreVia logo):

- **Ready for review**: every client with emails switched on.
- **Accepted** and **Changes requested**: every owner and every client with emails switched on (the person who acted gets a copy as their receipt).

Every attempt is listed under *People, Email notifications, Recent emails*, with the reason if one did not go. Each person's emails can be switched off on the People page.

Set-up (once; the keys are entered by you in Resend and Vercel, never in chat):

1. Create a free Resend account that KoreVia owns (this is separate from the Resend account Pathways uses for the client's own emails).
2. In Resend, Domains, add `korevia.solutions`. Resend shows a few DNS records (SPF and DKIM). Add them exactly as shown in the DNS for korevia.solutions, then press Verify. Do not change anything at the client's DNS.
3. In Resend, API Keys, create a key with *Sending access* only.
4. In the portal's Vercel project, Settings, Environment Variables, add `RESEND_API_KEY` (mark it Sensitive). Optional: `EMAIL_FROM` (default `KoreVia Client Portal <portal@korevia.solutions>`; the address must be on the verified domain) and `EMAIL_REPLY_TO` (default `admin@korevia.solutions`).
5. Redeploy, sign in as owner, open People and press *Send me a test email*.

Until the key is set the portal works as before and the People page shows "Email is not set up yet".

## Branding

Colours, fonts and logos match the KoreVia CompIQ site (navy and teal, Barlow Condensed and Public Sans). The logos are loaded from `https://compiq.korevia.solutions/assets/brand/`; the addresses are all in `src/lib/brand.ts`. The services text ("Built and supported by KoreVia Solutions") is in `src/lib/brand.ts` and `src/components/ServicesBand.tsx`.

## Developing

```
npm install
cp .env.example .env.local   # fill in
npm run dev
npm run typecheck
npm run test:unit            # guide parser
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
```

Never commit `.env*` files or keys. The service-role key only ever lives in Vercel and your own password manager.

## How CI pushes in

`POST /api/ingest/start` (token in the `Authorization: Bearer` header) saves the guides, cases, change notes and results and returns one-time upload links; the files go straight to private storage; `POST /api/ingest/finish` records them and totals the run. Files are private: the portal signs short-lived links when a page is viewed.

## Not built yet

- Password reset by the person (for now KoreVia resets it in Supabase).
- Authenticator codes at sign-in (chosen: email and password only for now).
- A view of the database test report and change report per module (the Browser tests run is what is shown).
