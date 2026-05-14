---
description: "Use when editing Next.js frontend pages, route handlers, components, styling, dashboard screens, auth views, or backend API proxy code in the Iwifunni web app. Covers App Router structure, shared API access patterns, and styling rules."
name: "Iwifunni Frontend Instructions"
applyTo:
  - "web/src/**/*.ts"
  - "web/src/**/*.tsx"
  - "web/src/**/*.css"
  - "web/package.json"
  - "web/next.config.mjs"
  - "web/tsconfig.json"
---

# Frontend Instructions

- Follow the current Next.js App Router layout under [web/src/app](../../web/src/app). Keep route-level code, layouts, and route handlers in that tree instead of creating parallel structures.
- Prefer server components by default. Add `use client` only when the component needs browser APIs, local state, effects, or client-only libraries.
- Reuse the existing backend access path in [web/src/lib/backend-api.ts](../../web/src/lib/backend-api.ts) and route handlers under [web/src/app/api](../../web/src/app/api). Do not scatter raw backend fetch logic across unrelated components.
- Preserve the existing auth token flow. Requests should keep using the `Authorization` header or `access_token` cookie handling already centralized in [web/src/lib/backend-api.ts](../../web/src/lib/backend-api.ts).
- Keep component placement consistent with the existing split between page-local app components under [web/src/app/components](../../web/src/app/components) and reusable shared primitives under [web/src/components](../../web/src/components).
- Match the current styling system in [web/src/app/css/globals.css](../../web/src/app/css/globals.css): Tailwind v4, theme tokens, and layered CSS imports. Avoid introducing a competing styling system or hard-coded colors when tokens already exist.
- Preserve the current app shell conventions in [web/src/app/layout.tsx](../../web/src/app/layout.tsx), including theme provider usage and global styles.
- If a frontend task depends on backend behavior, verify the actual API contract in the Go handlers or docs before building UI around it. Some docs describe capabilities that are ahead of the current implementation.
- Prefer the smallest validation that matches the change. Use the relevant `pnpm` script from [web/package.json](../../web/package.json), usually `pnpm build`, and run a narrower check when one exists.