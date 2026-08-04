/* ============================================================================
 * STATIC EXPORT BUILD
 * ----------------------------------------------------------------------------
 * Produces out/ — a plain folder of files you can drag straight onto Netlify
 * (or any static host) with no build step on their side.
 *
 * The one thing a static host cannot do is run the booking endpoint, so the
 * API route is moved aside for the duration of the build. The booking form
 * already handles its absence honestly: it reports that nothing was sent and
 * points at the salon's own booking link, rather than showing a fake
 * confirmation.
 *
 *   node scripts/build-static.mjs
 * ========================================================================== */

import { existsSync, renameSync, rmSync, cpSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const apiDir = resolve(root, "src/app/api");
const parked = resolve(root, ".api-parked");

let moved = false;

function restore() {
  if (moved && existsSync(parked)) {
    if (existsSync(apiDir)) rmSync(apiDir, { recursive: true, force: true });
    renameSync(parked, apiDir);
    moved = false;
  }
}

// Restore the route handler whatever happens — a failed build must not leave
// the repository missing a directory.
process.on("exit", restore);
process.on("SIGINT", () => {
  restore();
  process.exit(130);
});

try {
  if (existsSync(parked)) rmSync(parked, { recursive: true, force: true });

  if (existsSync(apiDir)) {
    renameSync(apiDir, parked);
    moved = true;
    console.log("Parked src/app/api for the static build");
  }

  rmSync(resolve(root, "out"), { recursive: true, force: true });

  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_STATIC_EXPORT: "1" },
  });

  if (result.status !== 0) {
    restore();
    process.exit(result.status ?? 1);
  }

  restore();

  // Netlify serves _redirects from the publish root.
  const redirects = resolve(root, "public/_redirects");
  if (existsSync(redirects)) {
    cpSync(redirects, resolve(root, "out/_redirects"));
  }

  console.log("\nStatic site written to out/ — drag that folder onto Netlify.");
} catch (error) {
  restore();
  throw error;
}
