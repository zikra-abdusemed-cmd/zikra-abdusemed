# Zikra Abdusemed — Portfolio

Next.js 15 (App Router) + Tailwind CSS v4, with a password-protected admin panel backed by a JSON-file store.

## Setup

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD and SESSION_SECRET
npm run dev                  # http://localhost:3000, admin at /admin
```

`SESSION_SECRET` must be at least 16 characters (`openssl rand -hex 32`).

## Content

| What | Where | Edited via |
| --- | --- | --- |
| Projects, skill categories, skills, soft skills, extracurricular activities | `data/content.json` | `/admin` |
| Bio, tagline, email, socials | `lib/site.ts` | code |
| Sample data | `data/seed.json` | code |

`data/content.json` is created from `data/seed.json` on first request. `npm run seed` resets it to the sample data.
Set `CONTENT_DIR` to store it somewhere else (e.g. a mounted volume).

## Structure

```
app/
  page.tsx               public site (reads store on every request)
  admin/actions.ts       server actions: login/logout + all CRUD (each re-checks the session)
  admin/page.tsx         dashboard
  admin/login/page.tsx
components/              Hero, About, Skills, SkillCategory, Projects, ProjectCard, Contact,
                         CustomCursor, Reveal, NoiseBackground, ...
components/admin/        AdminLogin, AdminDashboard, ProjectManager, ProjectForm,
                         SkillManager, AdminSkillCategory, InlineEdit, ConfirmButton
lib/store.ts             JSON store (serialized, atomic writes)
lib/session.ts           HMAC-signed session cookie (Web Crypto)
middleware.ts            redirects unauthenticated /admin requests to /admin/login
```

## Design system

- `.noise-layer` (in `app/globals.css`): `position: fixed` SVG `feTurbulence` grain + faint grid on its own compositor layer.
- Utilities: `brutal-box`, `brutal-btn`, `brutal-input`, `brutal-border`; shadows `shadow-brutal(-sm|-lg)`.
- Reveals: `<Reveal variant="rise|wipe|shutter">` animates `clip-path` + skew when scrolled into view.
- Cursor: add `data-cursor-label="Text"` to any element to make the cursor morph into a labelled blob over it.
- `prefers-reduced-motion` disables all motion; content is visible without JavaScript.

## Deployment note

The JSON store needs a writable, persistent disk: a VPS, Railway/Render/Fly with a volume, or Docker with a mounted `data/` directory.
Serverless hosts like Vercel have a read-only, ephemeral filesystem, so admin edits would not persist there. For Vercel, swap `lib/store.ts` for a hosted database (e.g. Turso/libSQL, Postgres); its exported functions are the only interface the rest of the app uses.
