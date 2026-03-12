## ChargeNext

This repository contains the ChargeNext marketing site: a scroll-driven story that showcases on-demand EV charging across the DC, Maryland, and Virginia region. The experience features a sticky hero, animated story panels, feature highlights, transparent pricing, and clear calls to action.

### Tech Stack
- Next.js 15 App Router (TypeScript)
- Tailwind CSS for styling
- Framer Motion for scroll-linked animations
- Lucide Icons for outline iconography

### Getting Started
Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to preview the site. The primary implementation lives in `src/app/page.tsx` and is a client component to support Framer Motion hooks.

### Available Scripts
- `npm run dev` – start the local development server with hot reload
- `npm run lint` – run ESLint with the project configuration
- `npm run build` – generate the production build and export static assets to `out/`
- `npm run build:pages` – build and copy the exported files into `docs/` for GitHub Pages
- `npm run start` – serve the generated `out/` directory locally (`npx serve out`)

### Deploying to GitHub Pages
The project is configured for static export so it can run on GitHub Pages.

Recommended setup (root-friendly): GitHub Actions deployment

1. Commit and push `.github/workflows/deploy-pages.yml`.
2. In GitHub: Settings -> Pages -> Build and deployment -> Source, choose `GitHub Actions`.
3. Push to `main` and GitHub Actions will build and deploy `out/` automatically.

The build automatically sets `basePath`/`assetPrefix` to `/chargenext` in production. If you fork this repo under a different name, update `basePath` in `next.config.ts` to match your repository slug.

Legacy option (main/docs)

```bash
npm run build:pages
git add docs
git commit -m "Publish GitHub Pages build"
git push
```

### Project Notes
- UI primitives such as `Button` and `Card` are in `src/components/ui`.
- Global styles live in `src/app/globals.css`; metadata and layout wrapper are in `src/app/layout.tsx`.
- Remote imagery is rendered with `next/image` but marked `unoptimized` so the static export can run on GitHub Pages. If you migrate to a hosting provider with image optimization, remove the `unoptimized` flag in `next.config.ts`.
