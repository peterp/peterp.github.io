# Learnings: RedwoodSDK Migration (2026-04-16)

## Scaffold Behavior

**`pnpx create-rwsdk --force` preserves existing files**: When scaffolding into an existing repository directory (e.g., one that already contains `CNAME` and `index.html`), the `--force` flag allows the scaffold to overlay new files without wiping the directory. Original files are preserved. Evidence: successful scaffold into repo root with `CNAME` and `index.html` untouched.

**Scaffold generates `wrangler.jsonc`, not `wrangler.toml`**: RedwoodSDK v1.1.0 scaffold creates a JSON-with-comments configuration file rather than TOML. Both formats are supported by wrangler, but don't rename it — keep the scaffold's choice to minimize unnecessary diffs. Evidence: `.docs/blueprints/rwsdk-migration.md` §6 and actual scaffold output.

## Styling in RedwoodSDK

**Global CSS must use `?url` Vite suffix and be linked in Document**: When importing a CSS file that targets `body`-level styles (which cannot be scoped to a component), use the Vite `?url` suffix to resolve it to a content-hashed asset URL. Import it in the Document component and link it via `<link rel="stylesheet">`. This ensures the stylesheet is served as a static asset and the CSS is applied globally.

Evidence: `src/app/document.tsx` imports `styles from "@/app/styles.css?url"` and renders `<link rel="stylesheet" href={styles} />`.

**Body styles cannot use CSS Modules**: CSS Modules scope class names to a single component. Since `body` exists outside any React component's render output, it cannot be styled via modules. Global CSS is the correct approach. Evidence: attempted module approach in blueprint phase would require `:global()` escape hatch, which is equivalent to a global file.

## Client Hydration

**Retain the scaffold's client hydration script verbatim**: The Document component includes `<script>import("/src/client.tsx")</script>` — a bare dynamic import without `type="module"`. This looks unusual but is how RedwoodSDK scaffolds client-side navigation. Do not modify or remove it.

Evidence: Blueprint §5 (Document Wrapper) explicitly documented this as Reviewer note #3; successfully retained and tests pass.

## Package Management

**Use `pnpm exec` instead of `npx` in scripts**: The scaffold generates `check`, `release`, and `clean` scripts that call `npm run` internally (e.g., `npm run clean`, `npm run build`). When the project uses pnpm exclusively, update these to `pnpm run` for consistency. This ensures all package invocations go through pnpm's resolve chain.

Evidence: `package.json` scripts updated post-scaffold; Blueprint §6 noted this as Reviewer note #2.

## Testing Infrastructure

**HTTP routing tests require `@cloudflare/vitest-pool-workers`**: Verifying that unknown paths return HTTP 404 (and known paths return 200) requires making real HTTP requests against the running Cloudflare Worker. This requires a worker-aware Vitest pool that is not installed by default. Two such tests are stubbed as `it.todo` entries and deferred to a follow-up effort.

Evidence: `src/app/__tests__/routing.test.ts` contains two `it.todo` stubs; QA phase output noted this limitation.

## Package Versions

**`@redwoodjs/agent-ci@0.10.7` is the correct published name**: The package for local GitHub Actions validation is published under the `@redwoodjs` scope. Verified at https://agent-ci.dev installation documentation.

Evidence: `pnpm add -D @redwoodjs/agent-ci` resolved to v0.10.7 with no 404 errors; package.json records this version.

## Build Process

**Production build succeeds with three environments** (SSR, client, worker): RedwoodSDK's build process compiles the application for three target environments: server-side rendering (Node.js), browser client bundle, and Cloudflare Worker. All three build successfully with no errors.

Evidence: `pnpm run build` output shows "Build complete!" with bundle sizes for all three environments.
