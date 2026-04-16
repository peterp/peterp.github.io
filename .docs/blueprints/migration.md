<!--
  KEY DECISIONS SUMMARY
  =====================
  Placement:     Repo root (not web/ subdirectory). The scaffold produces no index.html
                 or CNAME, so there is no conflict with the preserved GitHub Pages files.
                 Root placement avoids a cd-prefixed CI pipeline and keeps the wrangler
                 config's "main" path as the clean src/worker.tsx.

  Styles:        Global stylesheet at src/app/styles/global.css, imported in src/client.tsx
                 (the browser-side entry point). The CSS targets <body> globally, making
                 CSS Modules semantically wrong. Importing in client.tsx guarantees Vite
                 bundles and injects the CSS for every page.

  Route structure: Single route "/" → Home component. No dynamic routes, no auth, no DB.
                   The Home component is a React Server Component — no "use client" needed
                   because it has no interactivity.

  Wrangler format: wrangler.jsonc (JSONC, not TOML). This is what the rwsdk scaffold
                   produces. sub-issue #8 says "wrangler.toml" but JSONC format satisfies
                   the intent and is the current rwsdk default. Named "peterp".

  CI deploy cmd:   pnpm exec wrangler deploy (not pnpm release). The "release" script runs
                   rw-scripts ensure-deploy-env which does interactive first-time setup
                   (worker renaming, D1 creation). CI is non-interactive and the worker
                   name is pre-configured in wrangler.jsonc.
-->

# Architecture Blueprint: peterp.org → RedwoodSDK Migration

> **Status:** Draft — Phase 1 (Blueprint)
> **Date:** 2026-04-16
> **Author:** Architect
> **Covers:** Sub-issues #4, #5, #6, #7, #8, #9, #20

---

## 1. Overview

This blueprint describes the migration of peterp.org from a bare single-file GitHub Pages site (one `index.html` plus a `CNAME`) to a RedwoodSDK (rwsdk) application deployed on Cloudflare Workers. RedwoodSDK is a Vite-based React framework with React Server Components running in a Cloudflare Worker (Workerd runtime). The result is a fully working application in the same GitHub repository, deployable via Wrangler, with a GitHub Actions pipeline and local CI validation via agent-ci.

The existing `index.html` and `CNAME` are **preserved** throughout this migration. They are not deleted — the GitHub Pages site may remain live until a separate DNS cutover (sub-issues #2/#3, out of scope). The rwsdk application coexists with those files at the repo root.

---

## 2. Project Placement Decision

**Decision: Scaffold the rwsdk application into the repo root.**

### Rationale

The rwsdk scaffold (`pnpm create rwsdk`) produces these files:
`.gitignore`, `.vscode/`, `package.json`, `public/`, `src/`, `tsconfig.json`, `types/`, `vite.config.mts`, `worker-configuration.d.ts`, `wrangler.jsonc`

None of these conflict with the existing `index.html` or `CNAME`. There is no `index.html` in the scaffold — the HTML document is fully server-rendered by a React component (`Document`).

Root placement provides:
- CI workflow has no `cd` step before every command.
- `wrangler.jsonc` field `"main"` is `"src/worker.tsx"` (not `"web/src/worker.tsx"`).
- `pnpm install` and `pnpm dev` work from the repo root without workspace configuration.
- Standard single-app project layout.

### Rejected alternative: `web/` subdirectory

A `web/` subdirectory was explicitly mentioned in the issue as a possibility. It was rejected because:
- Every CI step requires prefixing commands with `cd web && ...`.
- The `wrangler.jsonc` `main` path would be `web/src/worker.tsx`.
- No file conflicts exist that would force isolation into a subdirectory.
- The site is a simple single-page app — monorepo workspace overhead is not justified.

### Scaffolding procedure

`pnpm create rwsdk` expects a project name and creates a new directory. To scaffold into the existing repo root, the developer should:

```bash
# From repo root
pnpm create rwsdk __scaffold_temp
cp -r __scaffold_temp/. .
rm -rf __scaffold_temp
```

The `.` copy brings all scaffold files (including hidden files like `.gitignore`) into the repo root. The existing `index.html` and `CNAME` are untouched.

---

## 3. Current Content Inventory

### CNAME

```
peterp.org
```

### `index.html` — Full Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Peter Pistorius</title>
  <style>
    body {
      max-width: 480px;
      line-height: 1.6;
      padding: 20px;
    }
  </style>
  <link id="favicon" rel="icon" type="image/x-icon" href="data:image/png;base64,…(large base64 PNG)…">
</head>

<body>
  <h1>Hi, my name is Peter.</h1>

  <p>I'm a South African living in Berlin. I love programming and it tends to take all of my time, so I try to balance my life with friendship, cycling, hiking and woodwork.</p>

  <p>You can follow me on
    <a href="https://twitter.com/appfactory/">Twitter</a>, or see my code on
    <a href="https://github.com/peterp/">GitHub</a>.
  </p>

  <h2>Side Projects</h2>
  <ol>
    <li>
      <a href="https://redwoodjs.com"><i>RedwoodJS</i></a> &dash; Bringing full-stack to the JAMstack
    </li>
    <li>
      <a href="https://machinen.dev"></a><i>Machinen</i></a> &dash; Coming soon...
    </li>
    <li>
      <a href="https://github.com/peterp/Blackspace">
        <i>Blackspace</i>
      </a> &dash; Add blank spaces to your macOS Dock
    </li>
    <li>
      <a href="http://billable.me">
        <i>Billable</i>
      </a> &dash; Billing Made Simple. Period.
    </li>
  </ol>
</body>
</html>
```

### Content items

| Item | Type | Value |
|------|------|-------|
| Page title | `<title>` | `Peter Pistorius` |
| H1 | Heading | `Hi, my name is Peter.` |
| Bio paragraph | `<p>` | `I'm a South African living in Berlin. I love programming and it tends to take all of my time, so I try to balance my life with friendship, cycling, hiking and woodwork.` |
| Twitter link | `<a>` | href `https://twitter.com/appfactory/` |
| GitHub link | `<a>` | href `https://github.com/peterp/` |
| Side project 1 | `<li>` | RedwoodJS → `https://redwoodjs.com` — Bringing full-stack to the JAMstack |
| Side project 2 | `<li>` | Machinen → `https://machinen.dev` — Coming soon... |
| Side project 3 | `<li>` | Blackspace → `https://github.com/peterp/Blackspace` — Add blank spaces to your macOS Dock |
| Side project 4 | `<li>` | Billable → `http://billable.me` — Billing Made Simple. Period. |

### HTML bugs to fix in migration

The original `index.html` has two issues that must be corrected in the React migration:

1. **Machinen link is malformed.** Original: `<a href="https://machinen.dev"></a><i>Machinen</i></a>` — the anchor closes immediately before the `<i>` tag, meaning the link text is empty and the visible text is outside the anchor. Fix: `<a href="https://machinen.dev"><i>Machinen</i></a>`.

2. **`&dash;` is not a valid HTML entity.** The correct em-dash entity is `&mdash;` (or the literal character `—`). Use `—` (literal) in JSX for clarity.

### Inline styles

```css
body {
  max-width: 480px;
  line-height: 1.6;
  padding: 20px;
}
```

### Favicon

A base64-encoded PNG is inlined in the original `<link>` tag (`type="image/x-icon"`, data URI `data:image/png;base64,…`). The PNG must be extracted from the data URI and written to `public/favicon.png`. The Document component references it as `href="/favicon.png"`.

---

## 4. Target File Tree

Full directory layout of the repo root after migration. Files marked `[scaffold]` come from `pnpm create rwsdk` unchanged. Files marked `[modified]` or `[new]` require developer action.

```
.                                    ← repo root
├── .github/
│   └── workflows/
│       └── deploy.yml               [new] — GitHub Actions CI/CD workflow
├── .gitignore                       [scaffold]
├── .vscode/
│   └── launch.json                  [scaffold]
├── AGENTS.md                        [new] — agent-ci usage note
├── CNAME                            [preserved] — GitHub Pages domain config
├── index.html                       [preserved] — GitHub Pages site
├── package.json                     [scaffold]
├── pnpm-lock.yaml                   [generated] — committed, never hand-edited
├── public/
│   ├── favicon.png                  [new] — extracted from index.html base64 data URI
│   ├── favicon-dark.svg             [scaffold]
│   └── favicon-light.svg            [scaffold]
├── src/
│   ├── client.tsx                   [modified] — adds global.css import
│   ├── worker.tsx                   [modified] — routes to Home, removes Welcome
│   └── app/
│       ├── document.tsx             [modified] — title, favicon link
│       ├── headers.ts               [scaffold]
│       ├── pages/
│       │   └── home.tsx             [new] — personal site content
│       ├── shared/
│       │   └── links.ts             [scaffold]
│       └── styles/
│           └── global.css           [new] — body styles from index.html
├── tsconfig.json                    [scaffold]
├── types/
│   ├── css.d.ts                     [scaffold]
│   ├── rw.d.ts                      [scaffold]
│   └── vite.d.ts                    [scaffold]
├── vite.config.mts                  [scaffold]
├── worker-configuration.d.ts        [scaffold]
└── wrangler.jsonc                   [modified] — name set to "peterp"
```

**Deleted scaffold files** (these exist in the scaffold but must be removed):

| File | Reason |
|------|--------|
| `src/app/pages/welcome.tsx` | Replaced by `home.tsx` |
| `src/app/pages/welcome.module.css` | Belongs to welcome.tsx, removed with it |

---

## 5. Component Map

### `src/app/document.tsx` — HTML Shell

Modified from scaffold. Changes:
- `<title>` changed to `Peter Pistorius`
- `<link rel="icon" type="image/png" href="/favicon.png" />` added to `<head>`
- No other changes — `modulepreload` and client script remain as-is

```tsx
export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Peter Pistorius</title>
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="modulepreload" href="/src/client.tsx" />
    </head>
    <body>
      {children}
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
```

### `src/client.tsx` — Browser Entry Point

Modified from scaffold. Adds global CSS import at the top:

```tsx
import "./app/styles/global.css";
import { initClient, initClientNavigation } from "rwsdk/client";

const { handleResponse, onHydrated } = initClientNavigation();
initClient({ handleResponse, onHydrated });
```

### `src/worker.tsx` — Worker Entry Point

Modified from scaffold. Routes to `Home`, removes the `Welcome` import:

```tsx
import { render, route } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

import { Document } from "@/app/document";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/home";

export type AppContext = {};

export default defineApp([
  setCommonHeaders(),
  render(Document, [route("/", Home)]),
]);
```

The anonymous `({ ctx }) => { ctx; }` middleware from the scaffold default is removed — it is a placeholder and serves no purpose in this app.

### `src/app/pages/home.tsx` — Home Page (new file)

React Server Component. No `"use client"` directive. Contains all page content ported from `index.html`. The Machinen link bug is corrected. Em dashes are literal `—` characters.

```tsx
export const Home = () => {
  return (
    <>
      <h1>Hi, my name is Peter.</h1>

      <p>
        I'm a South African living in Berlin. I love programming and it tends
        to take all of my time, so I try to balance my life with friendship,
        cycling, hiking and woodwork.
      </p>

      <p>
        You can follow me on{" "}
        <a href="https://twitter.com/appfactory/">Twitter</a>, or see my code
        on <a href="https://github.com/peterp/">GitHub</a>.
      </p>

      <h2>Side Projects</h2>
      <ol>
        <li>
          <a href="https://redwoodjs.com">
            <i>RedwoodJS</i>
          </a>{" "}
          — Bringing full-stack to the JAMstack
        </li>
        <li>
          <a href="https://machinen.dev">
            <i>Machinen</i>
          </a>{" "}
          — Coming soon...
        </li>
        <li>
          <a href="https://github.com/peterp/Blackspace">
            <i>Blackspace</i>
          </a>{" "}
          — Add blank spaces to your macOS Dock
        </li>
        <li>
          <a href="http://billable.me">
            <i>Billable</i>
          </a>{" "}
          — Billing Made Simple. Period.
        </li>
      </ol>
    </>
  );
};
```

---

## 6. Styles Plan

### Decision: Global Stylesheet

**File:** `src/app/styles/global.css`
**Import location:** `src/client.tsx` (browser entry point)

The CSS from `index.html` targets the `body` element — a global, document-level selector. CSS Modules are for component-scoped styles with generated class names. Applying a CSS Module to `body` would require a `:global` escape and is semantically incorrect. A global stylesheet is the right tool.

Importing in `src/client.tsx` (the browser entry point) guarantees Vite picks up the file, processes it, and injects it for every page. Importing in a Server Component (`document.tsx`) is not the standard Vite CSS injection path for this setup.

### Full CSS content

```css
/* src/app/styles/global.css */
body {
  max-width: 480px;
  line-height: 1.6;
  padding: 20px;
}
```

This is the complete, verbatim CSS from `index.html`. No additions, no changes.

---

## 7. Wrangler Config

### Format note

The rwsdk scaffold produces `wrangler.jsonc` (JSONC format), not `wrangler.toml`. JSONC is the current wrangler default. Sub-issue #8 references `wrangler.toml` but the intent is satisfied by any wrangler configuration file being committed. We use `wrangler.jsonc`.

### Full `wrangler.jsonc` content

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "peterp",
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

### Field rationale

| Field | Value | Reason |
|-------|-------|--------|
| `name` | `"peterp"` | Worker name on Cloudflare. Replaces the scaffold default `"__change_me__"`. Used as the subdomain on `workers.dev` until custom domain is configured. |
| `main` | `"src/worker.tsx"` | Worker entry point. Standard rwsdk convention. |
| `compatibility_date` | `"2025-08-21"` | Scaffold default. Locks Cloudflare runtime behavior for reproducibility. |
| `compatibility_flags` | `["nodejs_compat"]` | Required by rwsdk for Node.js API compatibility in Workerd. |
| `assets.binding` | `"ASSETS"` | Enables static file serving from `public/`. Required for `favicon.png` and SVG files to be served. |
| `observability.enabled` | `true` | Scaffold default. Enables Cloudflare Workers Observability dashboard. |

No `vars` block is needed for this app — there are no environment variables.

---

## 8. CI Workflow

### File: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    name: Build and deploy to Cloudflare Workers
    runs-on: ubuntu-latest

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
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Deploy
        run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Design decisions

**Trigger:** `push` to `main` only. No PRs, no schedules. Deployment is automatic on merge.

**`pnpm/action-setup@v4`:** Required by sub-issue #9. `version: latest` fetches the current stable pnpm. The `cache: "pnpm"` setting on `setup-node` activates pnpm's global store cache, keyed on `pnpm-lock.yaml`.

**`pnpm exec wrangler deploy` instead of `pnpm release`:** The `pnpm release` script runs `rw-scripts ensure-deploy-env`, which interactively renames the worker and creates D1 databases on first run. This is incompatible with a non-interactive CI environment. The worker name is pre-configured as `"peterp"` in `wrangler.jsonc`, and this app has no D1 or secrets. Direct `wrangler deploy` is correct.

**`CLOUDFLARE_API_TOKEN`:** Injected from GitHub Actions secrets. The secret must be created in the repository settings at `Settings > Secrets and variables > Actions > New repository secret`. The token needs `Workers Scripts:Edit` and `Account:Read` permissions on the target Cloudflare account.

**Node.js version:** 20 LTS. Cloudflare Workers tooling (wrangler 4.x) requires Node 18+.

---

## 9. agent-ci Integration

### What it does

`@redwoodjs/agent-ci` runs GitHub Actions workflows locally using the actual GitHub Actions runner binary. It is used to validate CI workflow changes on the developer's machine before declaring work complete. It catches CI failures without requiring a push to the remote.

### Install command

```bash
pnpm add -D @redwoodjs/agent-ci
```

Run from the repo root. The package is added to `package.json` `devDependencies` and `pnpm-lock.yaml` is updated. Both are committed.

### Run command

To validate all workflows:
```bash
pnpm exec agent-ci run --all
```

To validate a specific workflow:
```bash
pnpm exec agent-ci run --workflow .github/workflows/deploy.yml
```

### Documentation note

Create a new file `AGENTS.md` at the repo root with the following content:

```markdown
# Agent Notes

## CI Validation

Before declaring any CI workflow change complete, validate it locally with agent-ci:

    pnpm exec agent-ci run --all

Fix any failures and re-run until the pipeline passes. Do not mark work done until
agent-ci passes.
```

This satisfies sub-issue #20's requirement for a note in `CLAUDE.md` or `AGENTS.md`.

---

## 10. Behavioral Specs

These are the observable, black-box acceptance criteria. QA derives runnable tests from these specs. Each spec must be verifiable without reading source code.

### Application behavior

| ID | Spec |
|----|------|
| B-01 | `GET /` returns HTTP 200 |
| B-02 | Response body for `GET /` contains the text `Hi, my name is Peter.` |
| B-03 | Response body contains the text `I'm a South African living in Berlin` |
| B-04 | Response body contains an anchor with `href="https://twitter.com/appfactory/"` |
| B-05 | Response body contains an anchor with `href="https://github.com/peterp/"` |
| B-06 | Response body contains the heading text `Side Projects` |
| B-07 | Response body contains an anchor with `href="https://redwoodjs.com"` |
| B-08 | Response body contains an anchor with `href="https://machinen.dev"` |
| B-09 | Response body contains an anchor with `href="https://github.com/peterp/Blackspace"` |
| B-10 | Response body contains an anchor with `href="http://billable.me"` |
| B-11 | Response `<title>` is `Peter Pistorius` |
| B-12 | Response body contains a favicon link (`<link rel="icon"`) pointing to `/favicon.png` |
| B-13 | `GET /favicon.png` returns HTTP 200 with `Content-Type: image/png` |

### Development environment

| ID | Spec |
|----|------|
| D-01 | `pnpm dev` starts without error and serves on `http://localhost:5173` |
| D-02 | No console errors appear in the browser after page load |
| D-03 | Hot reload: editing a source file while `pnpm dev` is running causes the browser to reflect the change without a full restart |

### Build and deploy

| ID | Spec |
|----|------|
| P-01 | `pnpm build` exits with code 0 |
| P-02 | `pnpm exec wrangler deploy --dry-run` exits with code 0 |

### Repository invariants

| ID | Spec |
|----|------|
| R-01 | `pnpm-lock.yaml` exists at the repo root |
| R-02 | `package-lock.json` does not exist at the repo root |
| R-03 | `yarn.lock` does not exist at the repo root |
| R-04 | The Machinen side-project link (`href="https://machinen.dev"`) has non-empty visible link text (`Machinen`) |

---

## 11. Requirements, Invariants & Constraints

| Constraint | Source |
|-----------|--------|
| `pnpm` exclusively — no npm or yarn commands anywhere | Issue #1, #4 |
| `pnpm-lock.yaml` must be committed | Issue #4 |
| `package-lock.json` must not exist | Issue #4 |
| `yarn.lock` must not exist | Issue #4 |
| CI workflow must use `pnpm/action-setup` action | Issue #9 |
| CI workflow must use `CLOUDFLARE_API_TOKEN` secret name | Issue #9 |
| `index.html` and `CNAME` must be preserved (not deleted) | Issue #1 — GitHub Pages live during migration |
| Scaffold command is `pnpm create rwsdk` | Issue #4 |
| Worker runtime is Cloudflare Workers (Workerd), not Node.js | Architecture |
| The `welcome.tsx` and `welcome.module.css` scaffold files must be deleted | This blueprint |
| `wrangler.jsonc` worker name must be set to `"peterp"` (not `"__change_me__"`) | This blueprint |

---

## 12. Learnings & Anti-Patterns

### `wrangler.jsonc` vs `wrangler.toml`

The rwsdk scaffold produces `wrangler.jsonc` (JSONC format). This is the current wrangler default as of wrangler 4.x. Sub-issue #8 references `wrangler.toml` but this is the sub-issue author using the name generically. Do not convert to TOML — JSONC is the format the framework expects and the one supported by the `$schema` reference.

### Do not use `pnpm release` in CI

`pnpm release` runs `rw-scripts ensure-deploy-env`, which interactively sets the worker name on first run and may create Cloudflare resources (D1 databases, secrets). This is unsuitable for CI. Use `pnpm exec wrangler deploy` directly after `pnpm build`.

### CSS Modules are wrong for global body styles

CSS Modules generate scoped class names. `body` is a global element — there is no way to apply a CSS Module to it without using `:global`, which defeats the purpose of the module. Use a global stylesheet for any styles that target global HTML elements.

### Do not inline the favicon as a base64 data URI in `document.tsx`

The original `index.html` uses a base64 PNG data URI for the favicon. This works but bloats every HTML response. Extract the PNG to `public/favicon.png` and serve it as a static file via the `ASSETS` binding. The `public/` directory is designed for this purpose in the rwsdk scaffold.

### The anonymous context middleware in `worker.tsx` is a placeholder

The scaffold's `defineApp` includes `({ ctx }) => { ctx; }` — a no-op middleware that exists to show developers where to set up context. Remove it in the final app to avoid dead code.

---

## 13. Directory Mapping

Maps each sub-issue to the source files it touches.

| Sub-issue | Files |
|-----------|-------|
| #4 Scaffold | All scaffold files: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.mts`, `wrangler.jsonc`, `src/worker.tsx`, `src/client.tsx`, `src/app/document.tsx`, `src/app/headers.ts`, `src/app/pages/home.tsx`, `src/app/shared/links.ts`, `public/favicon-dark.svg`, `public/favicon-light.svg`, `types/`, `worker-configuration.d.ts` |
| #5 Content | `src/app/pages/home.tsx`, `src/app/document.tsx` (title), `public/favicon.png` |
| #6 Styles | `src/app/styles/global.css`, `src/client.tsx` (import) |
| #7 Local dev | No new files — verification of #4–#6 |
| #8 Wrangler | `wrangler.jsonc` |
| #9 CI workflow | `.github/workflows/deploy.yml` |
| #20 agent-ci | `package.json` (devDep), `pnpm-lock.yaml`, `AGENTS.md` |
