/* Bundle the whole app into one HTML file you can double-click.

   Vite's normal output loads a module script and a stylesheet as separate
   files, which browsers refuse to fetch over file://. This inlines both into
   a single document and drops the PWA bits that need a real server. */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist-single");

rmSync(out, { recursive: true, force: true });
execFileSync("npx", ["vite", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SINGLE: "1" },
});

const js = readFileSync(join(out, "app.js"), "utf8");
const cssPath = join(out, "app.css");
const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
const icon = readFileSync(join(root, "public", "icon.svg"), "utf8");
const favicon = "data:image/svg+xml," + encodeURIComponent(icon);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="fomo" />
    <link rel="icon" href="${favicon}" />
    <link rel="apple-touch-icon" href="${favicon}" />
    <title>fomo — never miss out</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>
`;

const target = join(root, "fomo.html");
writeFileSync(target, html);
console.log(`\nWrote ${target} (${(html.length / 1024).toFixed(0)} KB)`);
