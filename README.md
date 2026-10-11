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

## Deployment

For Vercel, create a **public Vercel Blob store** from the project's **Storage** tab and connect it to this project for Production (and Preview if needed). Vercel supplies the Blob credentials automatically. The app stores its editable content at `portfolio/content.json` and uploaded project photos in `portfolio/uploads/`.

The content JSON and project photos are public, matching the public portfolio. Without a connected Blob store, the homepage uses `data/seed.json` and admin saves show a setup message. Local development continues to use `data/content.json` and `data/uploads/`.

For other hosts, use a writable persistent volume and set `CONTENT_DIR` to its mount path.
