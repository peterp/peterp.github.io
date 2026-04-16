# Architecture Blueprint: peterp.org → RedwoodSDK Migration

**Date**: 2026-04-16  
**Status**: Draft  
**Sub-issues covered**: #4, #5, #6, #7, #8, #9, #20

---

## 1. 2000ft View

Peter Pistorius's personal site (`peterp.org`) is currently a single static `index.html` file served via GitHub Pages. The site contains a bio paragraph, social links, and a list of side projects. The migration replaces this with a RedwoodSDK (rwsdk) application — a Vite-based React framework that executes on Cloudflare Workers.

The motivation is forward compatibility: the new structure can grow to include React Server Components, server functions, and dynamic behavior without a rearchitecting step. The content and visual presentation remain identical to the existing site; only the delivery mechanism changes.

The migration is decomposed into seven sub-issues: scaffolding the project, porting the HTML content into a React component, porting the styles, verifying local development, configuring the Cloudflare Worker, adding a CI/CD deployment pipeline, and installing the agent-ci toolchain for local validation of GitHub Actions workflows.

The `CNAME` file (`peterp.org`) must remain untouched throughout this migration. Traffic cutover from GitHub Pages to the new Worker is tracked separately in issue #2 and is out of scope here.

---

## 2. System Flow

### Request Lifecycle (Production)

```
Browser
  └─▶ Cloudflare Edge (Workers runtime)
        └─▶ src/worker.tsx (defineApp entry point)
              ├─▶ setCommonHeaders() middleware — sets security headers
              └─▶ render(Document, [route("/", HomePage)])
                    ├─▶ Document component — HTML shell, loads client bundle
                    └─▶ HomePage component — server-rendered React, no client state
                          └─▶ HTTP 200 response with full HTML
```

### Request Lifecycle (Development)

```
Browser (http://localhost:5173)
  └─▶ Vite dev server
        └─▶ @cloudflare/vite-plugin (Workers simulation)
              └─▶ src/worker.tsx (same code path as production)
```

### Static Asset Flow

```
Browser requests /favicon-dark.svg or /favicon-light.svg
  └─▶ Cloudflare Workers (ASSETS binding)
        └─▶ Serves from public/ directory (bound at deploy time)
```

### CI/CD Flow

```
git push → main branch
  └─▶ GitHub Actions: .github/workflows/deploy.yml
        ├─▶ pnpm install
        ├─▶ pnpm run build (vite build)
        └─▶ wrangler deploy (uploads worker + assets to Cloudflare)
```

---

## 3. Database Schema

**Not applicable.** This application has no database. All content is static, rendered at request time from JSX source. No persistence layer is required.

---

## 4. Behavior Spec

The following behaviors define the observable contract of the finished application, expressed in Gherkin for use by QA in phase 5.

```gherkin
Feature: peterp.org personal homepage

  Scenario: Page title
    Given a user navigates to "/"
    Then the page title is "Peter Pistorius"

  Scenario: Main heading
    Given a user navigates to "/"
    Then the page contains an h1 element with the text "Hi, my name is Peter."

  Scenario: Social links
    Given a user navigates to "/"
    Then the page contains a link to "https://twitter.com/appfactory/" with visible text "Twitter"
    And the page contains a link to "https://github.com/peterp/" with visible text "GitHub"

  Scenario: Side projects list
    Given a user navigates to "/"
    Then the page contains a "Side Projects" heading
    And the page contains a link to "https://redwoodjs.com" with visible text "RedwoodJS"
    And the page contains a link to "https://machinen.dev" with visible text "Machinen"
    And the page contains a link to "https://github.com/peterp/Blackspace" with visible text "Blackspace"
    And the page contains a link to "http://billable.me" with visible text "Billable"

  Scenario: Layout constraint
    Given a user navigates to "/"
    Then the body element has a max-width of 480px
    And the body element has a line-height of 1.6
    And the body element has padding of 20px

  Scenario: Unknown route returns 404
    Given a user navigates to "/does-not-exist"
    Then the response status is 404
```

---

## 5. Core Architecture

### Entry Point: `src/worker.tsx`

The worker entry point is the composition root. It wires together middleware and routes, and exports the app for the Cloudflare Workers runtime.

```tsx
import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { HomePage } from "@/app/pages/home";

export type AppContext = {};

export default defineApp([
  setCommonHeaders(),
  render(Document, [
    route("/", HomePage),
  ]),
]);
```

Key invariants:
- `defineApp` receives a flat array; middleware runs before `render()`
- `render(Document, [...])` wraps all matched routes in the Document HTML shell
- `route("/", HomePage)` handles the single route this site needs
- `setCommonHeaders()` is retained from the scaffold; it sets CSP and HSTS headers

### Document Wrapper: `src/app/document.tsx`

The Document component is the HTML shell. We modify the scaffold to:
1. Change the `<title>` to `"Peter Pistorius"`
2. Add a `<link>` to the global stylesheet (see §Styling below)
3. Retain the client hydration script

```tsx
import styles from "@/app/styles.css?url";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Peter Pistorius</title>
      <link rel="stylesheet" href={styles} />
      <link rel="modulepreload" href="/src/client.tsx" />
    </head>
    <body>
      {children}
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
```

The `?url` Vite suffix resolves the CSS file to an asset URL during build. The `<link rel="modulepreload">` preloads the client bundle for performance.

### Home Page Component: `src/app/pages/home.tsx`

A server component (no `"use client"` directive — the page has no interactivity). It replaces the scaffold's default `Welcome` component entirely.

```tsx
export const HomePage = () => (
  <>
    <h1>Hi, my name is Peter.</h1>

    <p>
      I'm a South African living in Berlin. I love programming and it tends to
      take all of my time, so I try to balance my life with friendship, cycling,
      hiking and woodwork.
    </p>

    <p>
      You can follow me on{" "}
      <a href="https://twitter.com/appfactory/">Twitter</a>, or see my code on{" "}
      <a href="https://github.com/peterp/">GitHub</a>.
    </p>

    <h2>Side Projects</h2>
    <ol>
      <li>
        <a href="https://redwoodjs.com"><i>RedwoodJS</i></a>
        {" – "}Bringing full-stack to the JAMstack
      </li>
      <li>
        <a href="https://machinen.dev"><i>Machinen</i></a>
        {" – "}Coming soon...
      </li>
      <li>
        <a href="https://github.com/peterp/Blackspace"><i>Blackspace</i></a>
        {" – "}Add blank spaces to your macOS Dock
      </li>
      <li>
        <a href="http://billable.me"><i>Billable</i></a>
        {" – "}Billing Made Simple. Period.
      </li>
    </ol>
  </>
);
```

**Content mapping from original HTML**:

| Original element | React equivalent | Notes |
|---|---|---|
| `<body style="...">` | `body {}` in `styles.css` | Styles moved to global CSS |
| `<title>Peter Pistorius</title>` | `<title>Peter Pistorius</title>` in Document | Unchanged |
| `<h1>Hi, my name is Peter.</h1>` | `<h1>Hi, my name is Peter.</h1>` | Unchanged |
| Bio `<p>` | `<p>...</p>` | Unchanged |
| Social links `<p>` | `<p>...<a>...</a>...<a>...</a>...</p>` | Unchanged |
| `<h2>Side Projects</h2>` | `<h2>Side Projects</h2>` | Unchanged |
| `<ol>` with 4 `<li>` items | `<ol>` with 4 `<li>` items | Fixed malformed `<a>` tag on Machinen item |
| `&dash;` entity (non-standard) | `{" – "}` (Unicode en dash) | `&dash;` is not a valid HTML entity; replaced with `–` |

**Note on original HTML**: The Machinen list item has a malformed anchor tag: `<a href="..."></a><i>Machinen</i></a>`. The correct intent is `<a href="..."><i>Machinen</i></a>`. The migration corrects this.

### Styling: `src/app/styles.css`

**Approach: Global CSS file, imported in Document.**

**Rationale**: The original site's styles apply exclusively to the `body` element (`max-width`, `line-height`, `padding`). CSS Modules scope styles to a single component's class names — they cannot target `body`. A global CSS file is the only correct approach for body-level styles. The file is minimal (three declarations) and there is no component-level style isolation to gain from modules.

The `?url` Vite import in `document.tsx` resolves the file to a content-hashed asset URL and serves it as a static file, consistent with how rwsdk handles assets.

```css
body {
  max-width: 480px;
  line-height: 1.6;
  padding: 20px;
}
```

This exactly replicates the original `<style>` block. No other styles are needed. The browser's default font stack and link colors are preserved, matching the original site's unstyled aesthetic.

### Scaffold Files: Modified vs. Created

| File | Action | Notes |
|---|---|---|
| `src/worker.tsx` | **Modify** scaffold default | Wire `HomePage`, remove context setup placeholder |
| `src/app/document.tsx` | **Modify** scaffold default | Update title, add stylesheet link |
| `src/app/pages/home.tsx` | **Replace** scaffold default | Remove `Welcome` import, write `HomePage` |
| `src/app/pages/welcome.tsx` | **Delete** | Scaffold welcome page — not needed |
| `src/app/pages/welcome.module.css` | **Delete** | Scaffold welcome styles — not needed |
| `src/app/styles.css` | **Create** | Global body styles |
| `src/app/headers.ts` | **Keep** unchanged | Security headers middleware |
| `src/client.tsx` | **Keep** unchanged | Client hydration |
| `src/app/shared/links.ts` | **Keep** unchanged | Type-safe links utility |
| `wrangler.jsonc` | **Modify** | Change `name` from `__change_me__` to `peterp-org` |
| `public/` | **Keep** unchanged | Favicon assets |
| `CNAME` | **Do not touch** | GitHub Pages domain — scope boundary |

---

## 6. API Reference

### HTTP Routes

| Method | Path | Handler | Response |
|---|---|---|---|
| GET | `/` | `HomePage` | 200 HTML |
| GET | `/*` (unmatched) | rwsdk default | 404 |
| GET | `/favicon-dark.svg` | ASSETS binding | 200 SVG |
| GET | `/favicon-light.svg` | ASSETS binding | 200 SVG |

### Worker Configuration (`wrangler.jsonc`)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "peterp-org",
  "main": "src/worker.tsx",
  "compatibility_date": "2025-08-21",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS"
  },
  "observability": {
    "enabled": true
  }
}
```

**Field reference**:

| Field | Value | Required | Notes |
|---|---|---|---|
| `name` | `peterp-org` | Yes | Worker name in Cloudflare dashboard; used as subdomain on `workers.dev` |
| `main` | `src/worker.tsx` | Yes | Entry point; always this value for rwsdk |
| `compatibility_date` | `2025-08-21` | Yes | Pins the Workers runtime API surface |
| `compatibility_flags` | `["nodejs_compat"]` | Yes | Enables Node.js API compatibility in Workers runtime |
| `assets.binding` | `"ASSETS"` | Yes | Binds `public/` directory as `Fetcher` interface; referenced in `worker-configuration.d.ts` as `Env.ASSETS` |
| `observability.enabled` | `true` | No | Enables Cloudflare observability (logs, traces) |

**Format note**: The rwsdk scaffold generates `wrangler.jsonc` (JSON with comments), not `wrangler.toml`. Both formats are supported by wrangler, but `.jsonc` is used here for consistency with the scaffold.

### `package.json` Scripts

The scaffold provides these scripts; no additions are required for the migration:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite dev` | Start local dev server at `localhost:5173` |
| `build` | `vite build` | Production build |
| `release` | `rw-scripts ensure-deploy-env && ... && wrangler deploy` | Build + deploy to Cloudflare |
| `types` | `tsc` | Run TypeScript type checking |
| `check` | `npm run generate && npm run types` | Full type check including wrangler types |
| `generate` | `wrangler types --include-runtime false` | Regenerate `worker-configuration.d.ts` |

**Note**: The scaffold's `release` script uses `npm run` internally. Since the project uses pnpm, the CI pipeline uses `pnpm run build && wrangler deploy` directly (see §CI/CD).

---

## 7. Requirements, Invariants & Constraints

### Hard Constraints

1. **`CNAME` file must not be modified.** The file contains `peterp.org` and is required for GitHub Pages to serve the current site. Traffic cutover is out of scope (tracked in #2).

2. **pnpm only.** All package operations use pnpm. No npm or yarn. The scaffold must be created with `pnpx create-rwsdk` (not `npx` or `bunx`).

3. **No database.** The site is static content. No database binding, Durable Object, or KV store is introduced.

4. **No authentication.** The site has no login flow. `setCommonHeaders()` middleware is retained for security headers but no auth middleware is added.

5. **No DNS/hosting changes.** The Cloudflare Worker deployment uses a `workers.dev` subdomain until traffic cutover is handled separately.

### Architectural Invariants

- All routes are server components (no `"use client"` on `HomePage`). There is no client-side interactivity.
- The `Document` component is the single HTML shell. No additional layouts are introduced.
- CSS is limited to global body styles. No CSS framework, no Tailwind, no component-level modules.
- The `@/` path alias maps to `src/`. All internal imports use this alias.
- The client hydration script in `document.tsx` must be retained exactly as scaffolded. It initializes client-side navigation.

### Dependency Constraints

- rwsdk version: whatever `pnpx create-rwsdk` scaffolds (pinned via `package.json`)
- wrangler version: whatever `pnpx create-rwsdk` scaffolds
- React version: 19.x (as scaffolded)
- TypeScript strict mode: enabled

### Scope Boundaries

| In scope (this epic) | Out of scope |
|---|---|
| Project scaffold | Domain registrar transfer (#3) |
| Content port | Traffic cutover to Workers (#2) |
| Style port | Adding new pages or features |
| Local dev verification (#7) | Authentication or database |
| Worker config (#8) | Performance optimization |
| CI/CD deploy workflow (#9) | Monitoring / alerting setup |
| agent-ci install (#20) | SEO / analytics |

---

## 8. Learnings & Anti-Patterns

### Why Not CSS Modules for body styles

CSS Modules scope class names to a single component. They cannot target the `body` element (which exists outside any component's render output). Attempting to put `body {}` in a `.module.css` file would require the `:global` escape hatch, which is exactly what a regular global CSS file achieves more directly. **Decision: global CSS file.**

### Why Not Inline React Styles

Inline styles (`style={{ maxWidth: '480px' }}`) would need to be placed on a wrapper `<div>` inside `HomePage`, not on `body`. This changes the DOM structure compared to the original. The original styles apply to `body` directly, which the browser treats as the layout root. A global CSS file preserves this semantic exactly. **Decision: global CSS file over inline styles.**

### Why Not Tailwind

Tailwind requires additional setup (install plugin, create `styles.css` with `@import "tailwindcss"`, add `environments: { ssr: {} }` to `vite.config.mts`). For three CSS declarations, this complexity is unjustified. **Decision: plain CSS.**

### Why Not `wrangler.toml`

The rwsdk scaffold generates `wrangler.jsonc`. Migrating to `.toml` would require manual translation and diverge from the scaffold's baseline. Both formats are supported by wrangler. Staying with `.jsonc` reduces diff surface. **Decision: keep `.jsonc` format.**

### Why Not Split Into Multiple Components

The homepage content is short and has no reused substructure. Splitting into `<Bio>`, `<SocialLinks>`, and `<SideProjects>` subcomponents adds indirection without benefit. A single `HomePage` component is readable and maintainable. **Decision: single component.**

### Why Not `workers.dev` Custom Domain in wrangler.jsonc

The `routes` or `custom_domains` field in wrangler.jsonc would bind the Worker to `peterp.org`, which would interfere with the current GitHub Pages setup during the transition period. Traffic cutover is deferred to issue #2. **Decision: no routes configured until cutover.**

### Risk: `&dash;` Non-Standard HTML Entity

The original `index.html` uses `&dash;` as a separator in the side projects list. `&dash;` is not a valid HTML named entity (the standards define `&ndash;` and `&mdash;`). Browsers may render it as literal text `&dash;` or silently drop it. The migration normalizes this to the Unicode en dash character (`–`) explicitly, which is the clearly-intended visual separator.

### Risk: wrangler Authentication in CI

The `wrangler deploy` command requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to be set. These must be added as GitHub repository secrets before the CI workflow can deploy. If these secrets are missing, the deploy step fails with an authentication error. The CI workflow itself is safe to merge without the secrets present — it will simply fail on the deploy step until secrets are configured.

### Risk: `workers.dev` Subdomain Availability

The `name` field in `wrangler.jsonc` determines the `workers.dev` subdomain (`peterp-org.workers.dev`). If this name is already taken in the target Cloudflare account, wrangler will error. The name `peterp-org` is chosen to match the domain convention; if unavailable, it must be changed in `wrangler.jsonc`.

---

## 9. Directory Mapping

### Full Directory Tree After Migration

```
/
├── .docs/
│   └── blueprints/
│       └── rwsdk-migration.md          ← this file
├── .github/
│   └── workflows/
│       └── deploy.yml                  ← CI/CD deploy workflow (new)
├── .gitignore                          ← scaffold-generated
├── .kindling/                          ← harness internals, do not touch
├── .vscode/
│   └── launch.json                     ← scaffold-generated
├── CNAME                               ← DO NOT TOUCH (peterp.org)
├── index.html                          ← original static site (remains)
├── public/
│   ├── favicon-dark.svg                ← scaffold-generated
│   └── favicon-light.svg               ← scaffold-generated
├── src/
│   ├── client.tsx                      ← scaffold-generated, unmodified
│   ├── worker.tsx                      ← scaffold-generated, MODIFIED
│   └── app/
│       ├── document.tsx                ← scaffold-generated, MODIFIED
│       ├── headers.ts                  ← scaffold-generated, unmodified
│       ├── styles.css                  ← NEW (global body styles)
│       ├── pages/
│       │   └── home.tsx                ← scaffold-generated, REPLACED
│       └── shared/
│           └── links.ts                ← scaffold-generated, unmodified
├── types/
│   ├── rw.d.ts                         ← scaffold-generated, unmodified
│   └── vite.d.ts                       ← scaffold-generated, unmodified
├── package.json                        ← scaffold-generated, unmodified
├── pnpm-lock.yaml                      ← generated by pnpm install
├── tsconfig.json                       ← scaffold-generated, unmodified
├── vite.config.mts                     ← scaffold-generated, unmodified
├── worker-configuration.d.ts           ← generated by wrangler types
└── wrangler.jsonc                      ← scaffold-generated, MODIFIED (name field)
```

**Legend**:
- `scaffold-generated` — created by `pnpx create-rwsdk`, kept as-is
- `MODIFIED` — scaffold-generated, then changed for this migration
- `REPLACED` — scaffold-generated file deleted and rewritten from scratch
- `NEW` — not in scaffold, created for this migration
- `DO NOT TOUCH` — scope boundary

### Feature-to-Source Mapping

| Feature | Source location |
|---|---|
| Worker entry point & routing | `src/worker.tsx` |
| HTML document shell | `src/app/document.tsx` |
| Homepage content | `src/app/pages/home.tsx` |
| Body styles | `src/app/styles.css` |
| Security headers middleware | `src/app/headers.ts` |
| Client hydration | `src/client.tsx` |
| Static assets (favicons) | `public/` |
| Worker configuration | `wrangler.jsonc` |
| CI/CD deploy pipeline | `.github/workflows/deploy.yml` |
| agent-ci toolchain | `node_modules/@redwoodjs/agent-ci` (dev dep) |
| Type declarations (Workers env) | `worker-configuration.d.ts` |
| Path alias configuration | `tsconfig.json` (`@/*` → `src/*`) |

---

## Appendix A: CI/CD Pipeline Design

### File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Deploy
        run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Required GitHub repository secrets**:

| Secret | How to obtain |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → Overview → Account ID (right sidebar) |

**Trigger**: push to `main` only. Pull requests do not deploy.

**No test step**: Tests are out of scope for the initial migration (phases 5–6). The CI pipeline runs build + deploy only. Tests can be added to the pipeline in a follow-up.

---

## Appendix B: agent-ci Integration Design

### What agent-ci does

`@redwoodjs/agent-ci` runs GitHub Actions workflows locally using the official GitHub Actions runner binary. It replaces the cloud-side API layer with a local implementation, enabling true compatibility between local runs and GitHub.com runs. Key capabilities:
- Host-filesystem caching (near-zero overhead for repeated runs)
- Pause-on-failure debugging (container stays alive; fix code and retry the failed step)
- Runs against the current working tree without requiring a commit

**Prerequisite**: Docker must be installed and running.

### Installation

Install as a dev dependency:

```bash
pnpm add -D @redwoodjs/agent-ci
```

Add a convenience script to `package.json`:

```json
{
  "scripts": {
    "agent-ci": "agent-ci"
  }
}
```

### Usage

Run all workflows relevant to the current branch:

```bash
pnpm agent-ci run --all --quiet
```

Run the deploy workflow specifically:

```bash
pnpm agent-ci run --workflow .github/workflows/deploy.yml
```

Run with pause-on-failure for debugging:

```bash
pnpm agent-ci run --all --quiet --pause-on-failure
```

Retry a paused runner from a specific step:

```bash
pnpm agent-ci retry --name <runner-name> --from-step <N>
```

### Local Secrets

Create `.env.agent-ci` in the repository root (add to `.gitignore`):

```
CLOUDFLARE_API_TOKEN=<your-token>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

agent-ci reads this file and injects secrets into workflow runs, emulating GitHub repository secrets.

### AI Agent Skill (optional)

Install the Claude Code skill for automated CI validation:

```bash
npx skills add redwoodjs/agent-ci --skill agent-ci
```

This installs a slash command that runs agent-ci in the background, monitors for failures, and retries automatically.

### Files introduced

| File | Purpose | Committed? |
|---|---|---|
| `.env.agent-ci` | Local secrets for workflow runs | No (add to `.gitignore`) |
| `node_modules/@redwoodjs/agent-ci` | Tool binary | No |

agent-ci does not create or modify any workflow files. It only reads `.github/workflows/*.yml`.
