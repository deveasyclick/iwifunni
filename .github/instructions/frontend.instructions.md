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
- Prefer the smallest validation that matches the change. Use the relevant `pnpm` script from [web/package.json](../../web/package.json), usually `pnpm build` and `pnpm lint`
- For form validation, use the [zod](https://github.com/colinhacks/zod) library. It's a zero-dependency library that provides a type-safe schema for validation and error handling.
- For form, input, and select components, use the [react-hook-form](https://react-hook-form.com/) and shadcn/ui form components. They provide a simpler API and a more consistent UX.
- For icons, use the [iconify](https://iconify.design/docs/icon-components/react/) library. It's a zero-dependency library that provides a set of SVG icons and a React component for rendering them.
- Prefer breaking large components into smaller, more focused components. This makes it easier to reuse and test.
- Extract dialogs, modals, and overlays into separate component files under `components/`. Do not inline them inside parent components.
- Always update pasted codes styling to follow my theme's color scheme in [web/src/app/css/globals.css](../../web/src/app/css/globals.css)
- **Hooks (`hooks/`) are for stateful logic only.** Never place pure functions (data fetching helpers, utility functions, type guards, formatters, parsers) inside a hook file. Extract them to `utils/` and import them into the hook. A file should only be a hook if it uses React hooks (`useState`, `useEffect`, `useCallback`, etc.) internally and is named `use*`.
- **Call `api.ts` directly, don't wrap it.** Each feature has its own `api.ts` that is the single source of truth for all its backend calls. Never create a service layer or utility wrapper that re-wraps a method from a feature's `api.ts` — call the exported API object directly from the hook or component. If you need to transform raw API response types into UI types, do the mapping inline where the API call is made.
- **Always run `pnpm build` and `pnpm lint` after frontend changes.** Before finishing any frontend task, run both to catch type errors, missing imports, bundling issues, and lint violations. Fix any errors introduced by your changes before reporting done.
- Always write component name in PascalCase.