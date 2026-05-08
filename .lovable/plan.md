## Personal Time Tracker — Build Plan

### Heads-up on stack (one important deviation)
Your brief asks for **React + Vite + GitHub Pages**. This Lovable project is a **TanStack Start** template (a React + Vite framework with SSR). The framework can't be swapped, but everything else in your brief works as written. Two practical implications:

- **Backend: external Supabase project (per brief).** I'll wire your own Supabase URL + publishable key into the app and run migrations against it. You'll paste those two values when prompted.
- **Hosting: GitHub Pages won't serve a TanStack Start app cleanly** (it's not pure static). Recommend publishing via Lovable's one-click hosting (free) instead. If you insist on GitHub Pages later, we'd need to refactor to plain Vite — say the word and I'll do that as a follow-up.

Everything else (features, UX, schema, CSV export, 15-min increments) follows the brief exactly.

---

### Design — Warm "Terracotta + Cream"
Replaces the blue/white theme with editorial warm tones, all defined as oklch tokens in `src/styles.css`:

- Background: cream `oklch(0.97 0.02 75)`
- Foreground: deep brown `oklch(0.25 0.04 50)`
- Primary: terracotta `oklch(0.62 0.16 40)` with a glow variant for gradients
- Accent: warm amber `oklch(0.78 0.13 70)`
- Muted: sand `oklch(0.92 0.03 75)`
- Border: dusty clay `oklch(0.86 0.04 60)`
- Destructive: deep rust `oklch(0.55 0.22 28)`
- Dark mode: espresso background with warm cream foreground

Typography: Fraunces (display, serif) for headings + Inter (body) for UI — a touch of editorial warmth without being heavy.

---

### Routes (file-based, TanStack Start)

```text
src/routes/
├── __root.tsx                   shell + providers + toaster
├── index.tsx                    marketing landing → "Sign in" CTA
├── login.tsx                    email/password + Google sign-in
├── _authenticated.tsx           auth gate (beforeLoad redirect)
├── _authenticated/app.tsx       main daily time entry page (default route after login)
├── _authenticated/lists.tsx     manage TLP / Customer / Product
├── _authenticated/reports.tsx   filters, summary, grouped tables, CSV export
└── _authenticated/settings.tsx  profile + logout
```

All authenticated pages share a top nav: **Time Tracker · Lists · Reports · Settings · Logout**.

---

### Database (Supabase, with RLS)

```text
list_items
  id uuid pk
  user_id uuid fk auth.users
  kind text check in ('tlp','customer','product')
  name text
  active boolean default true
  created_at timestamptz

time_entries
  id uuid pk
  user_id uuid fk auth.users
  entry_date date
  tlp_id uuid fk list_items
  customer_id uuid fk list_items
  product_id uuid fk list_items
  description text
  hours numeric(4,2) check (hours > 0 AND (hours * 4) = floor(hours * 4))
  created_at timestamptz
  updated_at timestamptz
```

- RLS: every row scoped to `auth.uid() = user_id` for select/insert/update/delete.
- DB-level quarter-hour check enforces the 15-min rule.
- List items are **soft-archived** (toggle `active`) — historical entries keep resolving their names via FK.
- Trigger: on new user signup, seed sample list items (3–5 each for TLP / Customer / Product) so the user can log time immediately.

---

### Main `/app` page — daily time entry

- Header line: `Time Tracker | Friday, May 8, 2026 | 6.25 hours`
- Mini month calendar (left rail on desktop, collapsible drawer on mobile) with prev/next arrows + "Today" button. Days with entries get a small terracotta dot.
- Entry form row: TLP · Customer · Product · Description · Hours dropdown (0.25 → 12.00 step 0.25) · **Add Entry**.
- Entries table below: TLP · Customer · Product · Description · Hours · Edit / Delete.
- Inline edit (row turns into editable form), delete asks for confirmation (AlertDialog).
- Daily total recalculates instantly on add/edit/delete via TanStack Query optimistic updates.

### `/lists` page
Three side-by-side cards (TLP, Customer, Product), each with: add input, list of items with active/inactive badge, edit-in-place, archive/restore button.

### `/reports` page
- Filters: start date, end date (default = last 30 days), optional TLP / Customer / Product.
- Summary cards: Total hours · # entries · Avg hours/day · Top TLP · Top Customer · Top Product.
- Tables: hours by date · by TLP · by customer · by product.
- **Download CSV** button — exports the filtered raw entries via browser Blob (`tlp,customer,product,description,hours,date`).

### `/settings` page
Email shown, "Sign out" button, "Change password" link (sends reset email). Password reset page at `/reset-password` (public route).

### `/login` page
Email + password (sign in / sign up tabs) and a **Continue with Google** button. Auth uses the browser Supabase client; session persists; on success we redirect back to the originally requested protected route.

---

### Technical details

- **Auth state** lives in a `useAuth()` hook backed by `supabase.auth.onAuthStateChange` + `getSession`. Session passed into router context for `_authenticated.beforeLoad` gate.
- **Data layer** uses TanStack Query against the browser Supabase client (RLS handles authorization). No server functions needed for this MVP — keeps it close to the brief's "no custom backend" constraint.
- **Forms** use react-hook-form + zod for validation (15-minute increment + required fields enforced both client and DB side).
- **shadcn/ui** components: Button, Card, Dialog, AlertDialog, Select, Input, Calendar, Table, Tabs, Badge, Sonner toasts.
- **Google OAuth**: enabled in Supabase dashboard (you'll need to add a Google client ID/secret there per Supabase docs — quick 5-min setup, I'll link the steps in chat after build).

---

### What I'll need from you after the plan is approved
1. Your Supabase project URL + publishable (anon) key — I'll prompt for them.
2. After deploy, you'll add Google OAuth credentials in your Supabase dashboard's Auth → Providers panel (I'll give you the exact steps and the redirect URL to paste).

### Out of scope for v1 (per brief)
Outlook integration, charts, multi-user sharing, mobile app.
