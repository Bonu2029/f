/**
 * Builds a single self-contained HTML preview of every screen.
 *
 * Captures the server-rendered markup from a running dev/prod server, inlines
 * the stylesheet and its fonts, and wires the pages together with a small
 * screen switcher. The result opens anywhere with no server and no network.
 *
 *   npm run build && npm run start      # in one terminal
 *   node scripts/build-preview.mjs      # in another
 *
 * Forms and menus are inert in the output; it is a visual snapshot, not the
 * running app.
 */
import { writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_BASE ?? "http://localhost:3000";
const OUT = new URL("../servicetag-preview.html", import.meta.url);

const screens = [
  { id: "home", path: "/", label: "Home", group: "Website" },
  { id: "how", path: "/how-it-works", label: "How It Works", group: "Website" },
  { id: "pricing", path: "/pricing", label: "Pricing", group: "Website" },
  { id: "biz", path: "/for-businesses", label: "For Businesses", group: "Website" },
  { id: "privacy", path: "/privacy", label: "Privacy", group: "Website" },
  { id: "terms", path: "/terms", label: "Terms", group: "Website" },
  { id: "contact", path: "/contact", label: "Contact", group: "Website" },

  { id: "signup", path: "/signup", label: "Sign Up", group: "Accounts" },
  { id: "login", path: "/login", label: "Log In", group: "Accounts" },
  { id: "forgot", path: "/forgot-password", label: "Forgot Password", group: "Accounts" },
  { id: "reset", path: "/reset-password", label: "Reset Password", group: "Accounts" },

  { id: "overview", path: "/dashboard", label: "Overview", group: "Dashboard" },
  { id: "tags", path: "/dashboard/tags", label: "Tags", group: "Dashboard" },
  { id: "activate", path: "/dashboard/tags/new", label: "Activate Tag", group: "Dashboard" },
  { id: "customers", path: "/dashboard/customers", label: "Customers", group: "Dashboard" },
  { id: "requests", path: "/dashboard/requests", label: "Service Requests", group: "Dashboard" },
  { id: "settings", path: "/dashboard/settings", label: "Settings", group: "Dashboard" },
  { id: "billing", path: "/dashboard/billing", label: "Billing", group: "Dashboard" },

  { id: "tag", path: "/t/AB72KD", label: "Tag Page", group: "Customer", phone: true },
  { id: "req", path: "/t/AB72KD/request", label: "Request Service", group: "Customer", phone: true },
  { id: "notag", path: "/t/ZZZZZZ", label: "Inactive Tag", group: "Customer", phone: true },
];

const pathToId = new Map(screens.map((s) => [s.path, s.id]));

async function text(url) {
  const res = await fetch(url);
  return res.text();
}

// --- stylesheet, with fonts inlined so the page is fully self-contained ----
const homeHtml = await text(`${BASE}/`);
const cssHref = homeHtml.match(/href="(\/_next\/static\/[^"]+\.css)"/)[1];
let css = await text(`${BASE}${cssHref}`);

const fontRefs = [...new Set([...css.matchAll(/url\(\.\.\/media\/([^)]+)\)/g)].map((m) => m[1]))];
for (const file of fontRefs) {
  const res = await fetch(`${BASE}/_next/static/media/${file}`);
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  css = css.split(`url(../media/${file})`).join(`url(data:font/woff2;base64,${b64})`);
}
const interVar = css.match(/--font-inter:\s*([^;}]+)/);
if (!interVar) throw new Error("Could not find the --font-inter declaration.");
console.log(`css ${(css.length / 1024).toFixed(0)}kb, ${fontRefs.length} fonts inlined, font var ${interVar[1]}`);

// --- page bodies -----------------------------------------------------------
function extractBody(html) {
  const open = html.indexOf("<body");
  const start = html.indexOf(">", open) + 1;
  const end = html.lastIndexOf("</body>");
  let body = html.slice(start, end);

  // Drop all runtime script and template payloads; this is a static preview.
  body = body.replace(/<script[\s\S]*?<\/script>/g, "");
  body = body.replace(/<template[\s\S]*?<\/template>/g, "");
  body = body.replace(/<next-route-announcer[\s\S]*?<\/next-route-announcer>/g, "");

  // Route internal links through the preview switcher.
  body = body.replace(/href="(\/[^"#]*)"/g, (match, href) => {
    const clean = href.split("?")[0];
    const id = pathToId.get(clean);
    return id ? `href="#${id}" data-nav="${id}"` : `href="#" data-nav="none"`;
  });

  return body;
}

function bodyClass(html) {
  const body = html.match(/<body[^>]*class="([^"]*)"/);
  // The font CSS variable is declared on <html>, so carry that class down too.
  const root = html.match(/<html[^>]*class="([^"]*)"/);
  return [root ? root[1] : "", body ? body[1] : ""].filter(Boolean).join(" ");
}

const rendered = [];
for (const screen of screens) {
  const html = await text(`${BASE}${screen.path}`);
  rendered.push({ ...screen, body: extractBody(html), cls: bodyClass(html) });
  console.log(`captured ${screen.path}`);
}

// --- assemble --------------------------------------------------------------
const groups = [...new Set(screens.map((s) => s.group))];

const tabs = groups
  .map((group) => {
    const items = rendered
      .filter((s) => s.group === group)
      .map(
        (s) =>
          `<button class="pv-tab" data-target="${s.id}" type="button">${s.label}</button>`,
      )
      .join("");
    return `<div class="pv-group"><span class="pv-group-label">${group}</span>${items}</div>`;
  })
  .join("");

const panels = rendered
  .map(
    (s) =>
      `<div class="pv-screen${s.phone ? " pv-phone" : ""}" id="pv-${s.id}" hidden>` +
      `<div class="${s.cls} pv-page">${s.body}</div></div>`,
  )
  .join("\n");

const page = `<title>ServiceTag Preview</title>
<style>
${css}

/* ---- preview chrome (not part of the product) ---- */

/*
 * next/font declares this on a class it puts on <html>. The captured markup
 * lives in a div, so without this --font-sans resolves to an invalid value at
 * :root and every page silently falls back off Inter.
 */
:root { --font-inter: ${interVar[1]}; }

body { background: #ffffff; color: #0a0b0d; margin: 0; }
.pv-bar {
  position: sticky; top: 0; z-index: 9999;
  background: #0a0b0d; color: #fff;
  padding: 10px 14px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 14px;
  font-family: var(--font-sans, system-ui);
  box-shadow: 0 1px 0 rgba(255,255,255,.08);
}
.pv-brand { font-size: 13px; font-weight: 600; letter-spacing: -.01em; white-space: nowrap; }
.pv-brand span { color: rgba(255,255,255,.5); font-weight: 400; }
.pv-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.pv-group-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: .07em;
  color: rgba(255,255,255,.4); margin-right: 4px; white-space: nowrap;
}
.pv-tab {
  appearance: none; border: 0; cursor: pointer;
  background: rgba(255,255,255,.08); color: rgba(255,255,255,.82);
  font: inherit; font-size: 12.5px; line-height: 1;
  padding: 7px 11px; border-radius: 999px;
  transition: background .12s ease, color .12s ease;
  white-space: nowrap;
}
.pv-tab:hover { background: rgba(255,255,255,.16); color: #fff; }
.pv-tab[aria-current="true"] { background: #1f5cff; color: #fff; }
.pv-note {
  font-family: var(--font-sans, system-ui);
  font-size: 12.5px; color: #6b7280;
  background: #f1f1ef; border-bottom: 1px solid #e6e6e3;
  padding: 9px 16px; text-align: center;
}
.pv-note code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; color: #16181d;
  background: #ffffff; border: 1px solid #e6e6e3;
  border-radius: 5px; padding: 1px 6px;
}
.pv-stage { background: #ffffff; }
/* Captured markup lives in a div, so re-apply what globals.css puts on body. */
.pv-page {
  font-family: var(--font-sans);
  color: var(--color-ink-950);
  -webkit-font-smoothing: antialiased;
}
.pv-screen[hidden] { display: none; }
.pv-page { min-height: 60vh; }

/* Customer pages are phone-first, so frame them at phone width. */
.pv-phone { background: #e9e9e6; padding: 28px 16px 40px; }
.pv-phone .pv-page {
  max-width: 402px; margin: 0 auto;
  border: 1px solid #d6d6d2; border-radius: 32px; overflow: hidden;
  background: #f7f7f6; box-shadow: 0 24px 60px -28px rgba(10,11,13,.35);
}
</style>

<div class="pv-bar">
  <span class="pv-brand">ServiceTag <span>· static preview</span></span>
  ${tabs}
</div>
<p class="pv-note">
  A snapshot of the real pages. Links move between screens; forms and menus are inert here —
  run <code>npm run dev</code> for the live app.
</p>

<div class="pv-stage">
${panels}
</div>

<script>
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".pv-tab"));
  var screens = Array.prototype.slice.call(document.querySelectorAll(".pv-screen"));

  function show(id) {
    var found = false;
    screens.forEach(function (el) {
      var match = el.id === "pv-" + id;
      el.hidden = !match;
      if (match) found = true;
    });
    tabs.forEach(function (tab) {
      tab.setAttribute("aria-current", String(tab.dataset.target === id));
    });
    if (found) {
      try { history.replaceState(null, "", "#" + id); } catch (e) {}
      window.scrollTo(0, 0);
    }
    return found;
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { show(tab.dataset.target); });
  });

  // Links inside the captured pages jump between screens instead of navigating.
  document.querySelector(".pv-stage").addEventListener("click", function (event) {
    var link = event.target.closest("a[data-nav]");
    if (!link) return;
    event.preventDefault();
    if (link.dataset.nav !== "none") show(link.dataset.nav);
  });

  var initial = (location.hash || "").replace("#", "");
  if (!initial || !show(initial)) show("home");
})();
</script>`;

const escaped = page.replace(/[\u0080-\uFFFF]/g, (ch) => `&#${ch.charCodeAt(0)};`);

writeFileSync(OUT, escaped);
console.log(`\nwrote servicetag-preview.html - ${(escaped.length / 1024 / 1024).toFixed(2)} MB`);
