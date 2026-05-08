# Deploying to GitHub Pages

This project is now a plain Vite + React SPA using HashRouter, ready for GitHub Pages.

## One-time setup

1. **Connect this Lovable project to GitHub** (Plus menu → GitHub → Connect project).
2. In your GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables**, add three repository variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

   You can copy these values from your local `.env` file.
4. Push to `main`. The workflow `.github/workflows/deploy.yml` builds and publishes automatically.

## Supabase / Google OAuth

After the first successful deploy you'll get a URL like
`https://<username>.github.io/<repo>/`. Add that URL (with the trailing `#/app`)
to your Supabase project's **Authentication → URL Configuration** allow-list,
and to the authorized redirect URIs in the Google Cloud Console for OAuth.

## Routing notes

- Uses `HashRouter`, so URLs look like `https://.../#/app`. This is the
  simplest setup that survives page refresh on GH Pages.
- `vite.config.ts` uses `base: './'`, so the build works under any sub-path
  (`username.github.io/repo/`) and also under a custom domain at the root.
