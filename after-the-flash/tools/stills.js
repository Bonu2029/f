// Render one PNG per scene (middle of the scene) into shots/ for review.
// Usage: node tools/stills.js [--times 1.2,5.5,...]   (run from after-the-flash/)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'shots'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(root, 'episode1.html'));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const ep = await page.evaluate(() => ({ scenes: window.EPISODE.SCENES }));
  const arg = process.argv.indexOf('--times');
  const list = arg > 0 ? process.argv[arg + 1].split(',').map(Number).map((t, i) => ({ t, name: `t_${t.toFixed(2)}` }))
    : ep.scenes.map(s => ({ t: (s.start + s.end) / 2, name: `scene${String(s.n).padStart(2, '0')}_${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }));
  for (const it of list) {
    const r = await page.evaluate(t => { const a = performance.now(); const d = window.frameJPEG(t, 0.9); return { ms: performance.now() - a, d }; }, it.t);
    // PNG via canvas
    const png = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
    fs.writeFileSync(path.join(out, it.name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
    console.log(it.name, it.t.toFixed(2), r.ms.toFixed(0) + 'ms');
  }
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})();
