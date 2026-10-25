// Renders frames of world.js with headless Chromium (software WebGL).
// Usage: node render.js <from_seconds> <to_seconds> <out_dir> [workers] [fps]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [from, to, outDir, workers = '4', fps = '30'] = process.argv.slice(2);
const FPS = +fps;
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  fs.mkdirSync(outDir, { recursive: true });
  const first = Math.round(+from * FPS), last = Math.round(+to * FPS);
  const n = +workers;
  let done = 0;
  await Promise.all([...Array(n).keys()].map(async (w) => {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForFunction('window.ready === true && typeof window.renderAt === "function"', null, { timeout: 60000 });
    for (let f = first + w; f < last; f += n) {
      const url = await page.evaluate((t) => window.renderAt(t), f / FPS);
      fs.writeFileSync(path.join(outDir, `${String(f).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
      if (++done % 30 === 0) console.log(`${done}/${last - first} frames`);
    }
    await browser.close();
  }));
  server.close();
  console.log('done');
})();
