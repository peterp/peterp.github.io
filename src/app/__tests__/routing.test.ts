import { describe, it } from "vitest";

/**
 * Routing behaviour tests.
 *
 * Verifying HTTP-level routing (e.g. that unknown paths return 404) requires
 * running the full Cloudflare Worker and making real HTTP requests against it.
 * These tests are marked as todo and should be promoted to full integration
 * tests once the project adds a worker-aware test pool
 * (e.g. @cloudflare/vitest-pool-workers).
 */
describe("Routing", () => {
  it.todo(
    "returns HTTP 200 for the root path"
  );

  it.todo(
    "returns HTTP 404 for a path that does not exist"
  );
});
