# Iwifunni — pi Agent Instructions

This project's canonical instructions live in the `.github/` folder. Load and follow them as follows:

## Source of Truth

1. **`.github/copilot-instructions.md`** — General project guidelines: architecture, guardrails, validation, frontend conventions, workflow builder conventions, and commit message rules. Follow this for all work.

2. **`.github/instructions/backend.instructions.md`** — Backend-specific rules: Go handler layering, auth split, tenant scoping, queue-driven notifications, provider registry, repository patterns, and validation expectations. Apply when editing Go code.

3. **`.github/instructions/frontend.instructions.md`** — Frontend-specific rules: Next.js App Router conventions, server components, backend API proxy, auth flow, component placement, styling (Tailwind v4 + shadcn/ui + zod + react-hook-form + iconify), and build/lint validation. Apply when editing TypeScript/React/CSS code.

4. **`.github/instructions/docs.instructions.md`** — Documentation rules: code as source of truth, reconciling aspirational docs, auth/notification doc precision. Apply when editing Markdown docs.

## Preference: Ask Before Proceeding

When there are multiple valid approaches, trade-offs, or design decisions to make, present the options to the user and ask for their preference before proceeding. Do not make assumptions about which approach they'd prefer. List pros/cons of each option and ask them to decide.

## Scope

These instructions apply to all work in this repository. The `.github/` files are the authoritative source — if any instruction here conflicts with what's in those files, the `.github/` files win.
