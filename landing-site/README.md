# Sholatin marketing landing

Standalone Next.js site for the public marketing page. Deploy this folder alone to Vercel (set **Root Directory** to `landing-site` in the Vercel project).

## GitHub + Vercel

1. **Create a repository** on GitHub (empty, no README/license if you will push an existing tree), or from this machine with [GitHub CLI](https://cli.github.com/):  
   `gh repo create sholatin --private --source=. --remote=origin --push`  
   (run from the **repository root** that contains both the Expo app and `landing-site/`, after your first commit).

2. **Push** (replace `YOUR_USER` and repo name):  
   `git remote add origin https://github.com/YOUR_USER/sholatin.git`  
   `git branch -M main`  
   `git push -u origin main`

3. **Vercel** — [New Project](https://vercel.com/new) → Import the GitHub repo → **Root Directory**: `landing-site` → Framework Preset: Next.js (auto). Leave build/output defaults. Add optional env vars below in Project → Settings → Environment Variables.

## Theme

Colors and radii mirror the main app ([`../src/ui/palettes.ts`](../src/ui/palettes.ts) and [`../src/ui/tokens.ts`](../src/ui/tokens.ts)). Update [`lib/sholatinTheme.ts`](lib/sholatinTheme.ts) when the app palette changes.

## Commands

```bash
npm install
npm run dev
npm run build
```

## Environment variables (optional)

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_APP_STORE_URL` | App Store link for the primary CTA |
| `NEXT_PUBLIC_PLAY_STORE_URL` | Google Play link for the secondary CTA |

If neither is set, the hero shows a neutral “coming soon” message instead of store buttons.

## Stack

- Next.js App Router
- [Lenis](https://github.com/darkroomengineering/lenis) smooth scrolling (disabled when `prefers-reduced-motion: reduce`)
- CSS-driven mount fade-in (also respects reduced motion)
