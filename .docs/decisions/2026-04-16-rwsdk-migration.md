# Decisions: RedwoodSDK Migration (2026-04-16)

## Architecture Decisions

### Decision: Global CSS over CSS Modules or Inline Styles

**Status**: Adopted

**What**: Body-level styling (`max-width: 480px`, `line-height: 1.6`, `padding: 20px`) is implemented via a global CSS file (`src/app/styles.css`), imported in the Document component and linked via `<link rel="stylesheet">`.

**Why**: 
- CSS Modules scope class names to a single component. The `body` element exists outside any component's render output, so it cannot be styled via modules. Using modules would require the `:global()` escape hatch, which defeats the purpose of modular scoping.
- Inline React styles (`style={{ maxWidth: '480px' }}`) would require placing them on a wrapper `<div>` inside the component, changing the DOM structure and semantic meaning compared to the original site where styles applied to `body` directly.
- Global CSS is the minimal, correct approach: three declarations targeting the document root, imported once, applied universally.

**Trade-offs**: Global CSS is less encapsulated than modules or inline styles, but for a site with only body-level styles and no component-level styling, this trade-off is negligible.

**Evidence**: Blueprint §5, §8 (Learnings & Anti-Patterns section on CSS approach).

---

### Decision: Retain `wrangler.jsonc` Format (Do Not Rename to `.toml`)

**Status**: Adopted

**What**: The scaffold generates `wrangler.jsonc` (JSON with comments). This format is kept as-is rather than being migrated to `wrangler.toml`.

**Why**:
- Both `.jsonc` and `.toml` formats are supported by wrangler equally.
- The scaffold explicitly chooses `.jsonc`. Renaming it introduces a unnecessary diff and diverges from the scaffold's baseline without architectural benefit.
- The `.jsonc` format allows inline comments (e.g., explaining field purposes), which can improve readability.

**Trade-offs**: Some projects may prefer `.toml` as a standard across the Cloudflare ecosystem, but matching the scaffold reduces cognitive overhead for new developers.

**Evidence**: Blueprint §8 (Learnings & Anti-Patterns), §6 (API Reference notes format choice).

---

### Decision: Single `HomePage` Server Component (No Client Interactivity)

**Status**: Adopted

**What**: All homepage content (heading, bio, social links, side projects) is rendered in a single server component named `HomePage` with no `"use client"` directive. There are no interactive elements on the page.

**Why**:
- The original `index.html` is purely static — no user interactions, form submissions, or dynamic state changes.
- A single server component is simpler, faster, and more maintainable than splitting into subcomponents (`<Bio>`, `<SocialLinks>`, `<SideProjects>`) where the content is short and non-reused.
- Server components by default in RedwoodSDK provide better performance (no JavaScript sent to the browser for non-interactive content).

**Trade-offs**: If the site grows to include interactive features (e.g., theme switching, dynamic project loading), this decision would need to be revisited. For now, simplicity wins.

**Evidence**: Blueprint §5 (Core Architecture, §8 Anti-Patterns), implementation in `src/app/pages/home.tsx`.

---

### Decision: Defer HTTP Routing Tests to a Follow-Up Effort

**Status**: Adopted (Deferred)

**What**: Two test stubs (`it.todo` entries) verify that `/` returns HTTP 200 and unknown paths return HTTP 404. These are marked as todos and deferred.

**Why**:
- Verifying HTTP routing requires running the full Cloudflare Worker in a test environment and making real HTTP requests against it.
- This requires the `@cloudflare/vitest-pool-workers` Vitest plugin, which adds complexity and is out of scope for the initial migration.
- The blueprint explicitly designates HTTP-level testing as a separate infrastructure concern in §8 (Learnings: "Risk: HTTP routing tests require...").
- The acceptance criteria are achieved: 12 core behavioral tests pass (content, links, styling, page title), and the test framework is in place for future expansion.

**Trade-offs**: The test suite does not yet verify HTTP status codes, but this is acceptable because:
1. The application is simple and can be manually verified via `pnpm run dev`
2. The framework is prepared for future test additions
3. The routing configuration is minimal and low-risk (one route, rwsdk default 404 handling)

**Evidence**: Blueprint §4 (Behavior Spec, footnote on routing), §5 (Learnings & Pitfalls on HTTP routing), `src/app/__tests__/routing.test.ts` (two `it.todo` stubs).

---

### Decision: Use `pnpm exec wrangler deploy` in CI (Not `npx`)

**Status**: Adopted

**What**: The GitHub Actions workflow uses `pnpm exec wrangler deploy` instead of `npx wrangler deploy`.

**Why**:
- The project constraint is "pnpm only" — no npm or yarn. The `pnpm exec` command ensures the executable is resolved and executed through pnpm's resolve chain.
- This is consistent with the codebase's package management philosophy and ensures reproducibility.

**Evidence**: `.github/workflows/deploy.yml` (line with `pnpm exec wrangler deploy`), Blueprint §9.

---

## Constraint Decisions

### CNAME File Remains Untouched

**Status**: Adhered to

**What**: The `CNAME` file containing `peterp.org` is not modified during the migration.

**Why**:
- The file is essential for GitHub Pages to route traffic to the custom domain.
- Traffic cutover from GitHub Pages to the new Cloudflare Worker is a separate concern tracked in issue #2.
- Modifying it during this phase would interfere with the current GitHub Pages hosting.

**Evidence**: All commits in phases 3, 4, 5, and 6 respect this boundary. Git history shows `CNAME` last modified in commit `6142aff` (pre-migration). Blueprint §7 (Constraints).

---

### pnpm Used Exclusively

**Status**: Adhered to

**What**: All package management commands use `pnpm` (not npm or yarn). Scaffold scripts were updated to use `pnpm run` instead of `npm run` internally.

**Why**:
- The issue brief explicitly mandates pnpm-only package management.
- Consistency across all package invocation points (CLI, scripts, CI) ensures reproducibility and avoids implicit npm fallback behavior.

**Evidence**: Scaffold created via `pnpx create-rwsdk . --force`, `package.json` scripts updated, `.github/workflows/deploy.yml` uses `pnpm` throughout, Blueprint §7 (Constraints).
