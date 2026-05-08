## Goal

Convert this TanStack Start (SSR) project into a plain **Vite + React SPA** that uses **`react-router-dom` HashRouter**, so it can be hosted on GitHub Pages. Same Supabase backend (Lovable Cloud) — no data migration.

## What changes

### 1. Strip TanStack Start

Remove:
- `@tanstack/react-start`, `@tanstack/react-start-plugin`, the TanStack Vite plugin
- `src/router.tsx`, `src/routeTree.gen.ts`
- `src/routes/__root.tsx`, `src/routes/api/*` (none currently in use beyond auth)
- `src/integrations/supabase/auth-middleware.ts`, `src/integrations/supabase/client.server.ts` (no server fns left)
- `_authenticated.tsx` layout file (replaced by a React component)

Keep:
- `src/integrations/supabase/client.ts` (browser client, RLS-scoped — already how the app talks to data)
- `src/integrations/supabase/types.ts`
- All UI components, hooks, styles, business logic

### 2. New SPA shell

- `src/main.tsx` — mounts `<App />`
- `src/App.tsx` — sets up `HashRouter`, `QueryClientProvider`, `AuthProvider`, `Toaster`, route table
- `src/components/AuthenticatedLayout.tsx` — top nav + `<Outlet />`, redirects to `/login` if no session
- `index.html` — Vite entry

### 3. Port routes

Each `src/routes/*.tsx` page becomes a `src/pages/*.tsx` component. Replace:
- `createFileRoute(...)` → plain function component
- `<Link to="/x">` from `@tanstack/react-router` → from `react-router-dom`
- `useNavigate`, `useParams`, `useLocation` → `react-router-dom` equivalents
- Any `loader` / server-fn data fetching → `useQuery` against the browser Supabase client (already the pattern)

Routes:
```
/                      → Landing
/login                 → Login (email + Google)
/reset-password        → Reset password
/app                   → Daily entry (protected)
/lists                 → TLP/Customer/Product (protected)
/reports               → Reports + CSV (protected)
/settings              → Profile + logout (protected)
```

### 4. Vite config for GH Pages

- `vite.config.ts`: replace TanStack plugin with `@vitejs/plugin-react`, set `base: '/<repo-name>/'`
- Hardcode Supabase URL + publishable key via `import.meta.env.VITE_*` (already public)
- Add `public/404.html` as a safety net (HashRouter doesn't strictly need it, but harmless)

### 5. GitHub Actions workflow

`.github/workflows/deploy.yml`:
- Trigger on push to `main`
- Install deps with bun
- `bun run build`
- Deploy `dist/` to `gh-pages` branch via `peaceiris/actions-gh-pages` (or GitHub Pages official action)

Auth redirect URLs in Supabase need to be updated by you to include `https://<username>.github.io/<repo>/` after deployment.

### 6. Things you lose

- SSR / server-rendered SEO (HashRouter URLs aren't crawlable by section)
- Ability to add `createServerFn` later (any backend logic must be Supabase RPC, edge functions, or RLS-scoped client queries)
- Lovable's one-click publish for THIS project (you'd be hosting elsewhere)

## What I need from you

1. **Repo name** for the `base` path (e.g. `time-tracker` → `base: '/time-tracker/'`). If you'll use a custom domain or `username.github.io` root, say so — the base becomes `/`.
2. Confirm you've already connected this Lovable project to GitHub (or will, before merging).

## Technical notes (skim if non-technical)

- HashRouter chosen over BrowserRouter to avoid the GH Pages 404-on-refresh issue without server-side config.
- The Supabase publishable key is safe to bake into the bundle; RLS still enforces per-user access.
- Google OAuth needs its authorized redirect URIs updated to include the GH Pages URL.
- The migrations under `supabase/migrations/` stay where they are — they describe the cloud DB and aren't run from the SPA.

Reply with the repo name (and custom domain if any) and I'll execute.