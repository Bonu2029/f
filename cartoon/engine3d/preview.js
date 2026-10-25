// Renders single frames at given times (one browser session): node preview.js <out_dir> t1 t2 ...
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [outDir, ...times] = process.argv.slice(2);
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.waitForFunction('window.ready === true && typeof window.renderAt === "function"', null, { timeout: 60000 });
  for (const t of times) {
    const url = await page.evaluate((x) => window.renderAt(x), +t);
    fs.writeFileSync(path.join(outDir, `t${(+t).toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
  server.close();
})();
