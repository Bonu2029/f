// Render AfterTheFlash_Ep1.mp4 from episode1.html.
//  1. Playwright (headless Chromium) steps time through every frame (frame f -> t = f / 30)
//     and saves JPEG frames, in chunks across parallel workers (nothing times out).
//  2. The full mix (narration + music + SFX) is rendered with OfflineAudioContext -> WAV.
//  3. FFmpeg joins frames + WAV -> 1080x1920, 30 fps, H.264 CRF 18 + AAC 192k.
// Usage (from after-the-flash/): node tools/render.js [--ep ep2] [--workers 4] [--from 0] [--to N] [--keep]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const root0 = path.resolve(__dirname, '..'), ep = arg('--ep', 'ep1'), n = ep.slice(2);
  const root = ep === 'ep1' ? root0 : path.join(root0, ep), html = 'file://' + path.join(root, `episode${n}.html`);
  const frames = path.join(root, '.frames'); fs.mkdirSync(frames, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const open = async () => { const p = await browser.newPage({ viewport: { width: 540, height: 960 } }); p.on('pageerror', e => console.error('PAGE ERROR', e.message)); await p.goto(html); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); return p; };
  const p0 = await open();
  const { TOTAL, FPS } = await p0.evaluate(() => window.EPISODE);
  const N = Math.round(TOTAL * FPS), from = +arg('--from', 0), to = +arg('--to', N), workers = +arg('--workers', 4), CHUNK = 120;
  console.log(`episode ${TOTAL}s -> ${N} frames @${FPS}fps; rendering ${from}..${to - 1} with ${workers} workers`);
  // ---- audio
  const wavPath = path.join(root, '.mix.wav');
  if (!fs.existsSync(wavPath) || process.argv.includes('--audio')) {
    const b64 = await p0.evaluate(async () => await window.renderAudioWav());
    fs.writeFileSync(wavPath, Buffer.from(b64, 'base64')); console.log('audio mix rendered');
  }
  // ---- frames
  const chunks = []; for (let a = from; a < to; a += CHUNK) chunks.push([a, Math.min(to, a + CHUNK)]);
  const t0 = Date.now(); let done = 0;
  const work = async (id) => {
    const p = id === 0 ? p0 : await open();
    while (chunks.length) {
      const [a, b] = chunks.shift();
      for (let f = a; f < b; f++) {
        const fn = path.join(frames, `f${String(f).padStart(5, '0')}.jpg`);
        if (fs.existsSync(fn) && !process.argv.includes('--force')) { done++; continue; }
        const d = await p.evaluate(t => window.frameJPEG(t, 0.93), f / FPS);
        fs.writeFileSync(fn, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64')); done++;
      }
      const el = (Date.now() - t0) / 1000; console.log(`frames ${done}/${to - from}  ${(el).toFixed(0)}s  eta ${((to - from - done) * el / Math.max(1, done)).toFixed(0)}s`);
    }
  };
  await Promise.all(Array.from({ length: workers }, (_, i) => work(i)));
  await browser.close();
  // ---- mux
  const out = path.join(root, `AfterTheFlash_Ep${n}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'), '-i', wavPath,
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '20', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('wrote', out);
  if (!process.argv.includes('--keep')) fs.rmSync(frames, { recursive: true, force: true });
})();
