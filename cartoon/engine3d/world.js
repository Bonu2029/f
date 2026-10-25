// 3D world for "Dead in the Water": ocean, sky, cruise ship, interiors, characters and nuclear flashes.
// The page exposes window.renderAt(t) -> JPEG data URL for the frame at narration time t.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const params = new URLSearchParams(location.search);
const WIDTH = +(params.get('w') || 1080);
const HEIGHT = +(params.get('h') || 1920);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
const ramp = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const HORIZON = new THREE.Color('#2c4f86');
scene.fog = new THREE.FogExp2(HORIZON.clone(), 0.00011);
const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.02, 20000);
scene.add(camera);

const target = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(WIDTH / 2, HEIGHT / 2), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const fill = new THREE.PointLight('#ffe2c4', 0, 4, 1.5);   // soft face light that travels with the camera
camera.add(fill);
fill.position.set(0.3, 0.2, 0);

function softTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m;
}

// =====================================================================
// OUTSIDE: sky, ocean, ship, flashes
// =====================================================================
const outside = new THREE.Group();
scene.add(outside);

const MOON_DIR = v(-0.45, 0.32, -1).normalize();
const hemi = new THREE.HemisphereLight('#7f9fe0', '#18243a', 1.1);
const moonLight = new THREE.DirectionalLight('#b8ccff', 1.6);
moonLight.position.copy(MOON_DIR).multiplyScalar(500);
outside.add(hemi, moonLight);

const SKY_NIGHT = { top: '#060d24', mid: '#14295a', horizon: '#2c4f86' };
const SKY_ASH = { top: '#16161c', mid: '#34303a', horizon: '#6a4c40' };
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(9000, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
                glow: { value: new THREE.Color(0, 0, 0) }, glowDir: { value: v(0, 0, 1) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; uniform vec3 glowDir; varying vec3 vP;
      void main(){ float h = max(vP.y, 0.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.7, h));
        float facing = max(dot(normalize(vec3(vP.x, 0.0, vP.z)), glowDir), 0.0);
        c += glow * (1.0 - smoothstep(0.0, 0.35, h)) * facing * facing;
        gl_FragColor = vec4(c, 1.0); }`,
  }));
outside.add(sky);
function setSky(p, k = 1) {
  const u = sky.material.uniforms;
  u.top.value.set(SKY_NIGHT.top).lerp(new THREE.Color(p.top), k);
  u.mid.value.set(SKY_NIGHT.mid).lerp(new THREE.Color(p.mid), k);
  u.horizon.value.set(SKY_NIGHT.horizon).lerp(new THREE.Color(p.horizon), k);
  scene.fog.color.copy(u.horizon.value);
}

const stars = (() => {
  const r = rng(4), pos = [];
  for (let i = 0; i < 2500; i++) {
    const th = r() * Math.PI * 2, y = 0.08 + r() * 0.92, rad = Math.sqrt(1 - y * y);
    pos.push(Math.cos(th) * rad * 8500, y * 8500, Math.sin(th) * rad * 8500);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe8ff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true }));
  outside.add(p); return p;
})();

const moon = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), new THREE.MeshBasicMaterial({ color: '#fff6e0', fog: false }));
moon.position.copy(MOON_DIR).multiplyScalar(7500);
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(200,215,255,0.55)', 'rgba(200,215,255,0)'), fog: false, depthWrite: false }));
moonHalo.position.copy(moon.position); moonHalo.scale.set(1800, 1800, 1);
outside.add(moon, moonHalo);

{  // soft clouds
  const r = rng(9), tex = softTexture('rgba(150,170,215,0.35)', 'rgba(150,170,215,0)');
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, opacity: 0.5 + r() * 0.5 }));
    const th = r() * Math.PI * 2;
    s.position.set(Math.cos(th) * 6500, 600 + r() * 1500, Math.sin(th) * 6500);
    s.scale.set(1600 + r() * 1800, 300 + r() * 300, 1);
    outside.add(s);
  }
}

const waterNormals = new THREE.TextureLoader().load('./assets/waternormals.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
const water = new Water(new THREE.PlaneGeometry(20000, 20000), {
  textureWidth: 512, textureHeight: 512, waterNormals,
  sunDirection: MOON_DIR.clone(), sunColor: '#d0dcff', waterColor: '#0b2f55', distortionScale: 3.2, fog: true,
});
water.rotation.x = -Math.PI / 2;
outside.add(water);

// ---------- cruise ship ----------
const ship = new THREE.Group();
outside.add(ship);
const DECK_TOP = 44;
const SUP_STERN = -128, TOP_FRONT = 30, SUP_FRONT = 84, SUP_BEAM = 24.8;

const shipLit = { windows: null, ports: null, bulbs: [], lamps: [], bridge: null, wake: null };

function superTextures() {
  // one texture set for the whole superstructure side: 10 decks of balconies, 3 m each.
  // rank texture: each window's random switch-off order, used by the lights-out shader.
  const r = rng(21), w = 4096, h = 640, len = SUP_FRONT - SUP_STERN, pxm = w / len;
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const base = mk(), emis = mk(), rank = mk();
  const b = base.getContext('2d'), e = emis.getContext('2d'), q = rank.getContext('2d');
  b.fillStyle = '#eef1f5'; b.fillRect(0, 0, w, h);
  e.fillStyle = '#000'; e.fillRect(0, 0, w, h);
  q.fillStyle = '#fff'; q.fillRect(0, 0, w, h);
  const rowH = h / 10, colW = 3.4 * pxm;
  for (let k = 0; k < 10; k++) {
    const y = h - (k + 1) * rowH;
    b.fillStyle = '#d5dbe4'; b.fillRect(0, y + rowH - 7, w, 7);
    for (let x = 6; x < w - colW; x += colW) {
      const on = k === 0 || r() < 0.96;
      const col = k === 0 ? '#ffe1a8' : ['#ffd48a', '#ffdca0', '#ffd090'][Math.floor(r() * 3)];
      const wx = x + colW * 0.16, wy = y + rowH * 0.14, ww = colW * 0.68, wh = rowH * 0.6;
      b.fillStyle = '#a6b1c0'; b.fillRect(x, y + 4, 3, rowH - 11);
      b.fillStyle = '#2a3650'; b.fillRect(wx, wy, ww, wh);
      if (on) { e.fillStyle = col; e.fillRect(wx, wy, ww, wh); }
      const g = Math.floor(8 + r() * 238); q.fillStyle = `rgb(${g},${g},${g})`; q.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      b.fillStyle = 'rgba(210,220,232,0.9)'; b.fillRect(x, y + rowH * 0.6, colW, 3);
    }
  }
  const tb = new THREE.CanvasTexture(base), te = new THREE.CanvasTexture(emis), tr = new THREE.CanvasTexture(rank);
  tb.colorSpace = te.colorSpace = THREE.SRGBColorSpace;
  tb.anisotropy = te.anisotropy = tr.anisotropy = 8;
  tr.minFilter = tr.magFilter = THREE.NearestFilter;
  return [tb, te, tr];
}

const white = std('#f1f3f6', { roughness: 0.55 });
const navy = std('#13254a');
{
  const hull = new THREE.Shape();
  hull.moveTo(-140, -17); hull.lineTo(85, -17);
  hull.quadraticCurveTo(128, -12, 145, 0); hull.quadraticCurveTo(128, 12, 85, 17);
  hull.lineTo(-140, 17); hull.quadraticCurveTo(-150, 0, -140, -17);
  const mk = (depth, mat, y) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(hull, { depth, bevelEnabled: false }), mat);
    m.rotation.x = -Math.PI / 2; m.position.y = y; ship.add(m);
  };
  mk(7, navy, -4);
  mk(11, white, 3);
  const port = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color: '#ffd896' }), 300);
  let n = 0;
  const m4 = new THREE.Matrix4(), r = rng(5);
  for (const side of [-1, 1]) for (const y of [6.5, 9.5]) for (let x = -132; x < 80; x += 2.8) {
    if (r() < 0.25 || n >= 300) continue;
    m4.makeRotationY(side > 0 ? 0 : Math.PI); m4.setPosition(x, y, side * 17.05);
    port.setMatrixAt(n++, m4);
  }
  port.count = n; ship.add(port);
  shipLit.ports = port.material;
  {
    const prof = new THREE.Shape();
    const top = DECK_TOP - 0.6;   // the bevel adds 0.6 m, so the finished deck lands on DECK_TOP
    prof.moveTo(SUP_STERN, 14); prof.lineTo(SUP_STERN, top);
    prof.lineTo(TOP_FRONT, top);
    prof.bezierCurveTo(TOP_FRONT + 32, top, SUP_FRONT - 6, 24, SUP_FRONT, 14);
    prof.lineTo(SUP_STERN, 14);
    const geo = new THREE.ExtrudeGeometry(prof, { depth: SUP_BEAM - 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6,
                                                  bevelSegments: 4, curveSegments: 64 });
    geo.translate(0, 0, -(SUP_BEAM - 1.2) / 2);
    const [tb, te, tr] = superTextures();
    for (const tx of [tb, te, tr]) {
      tx.repeat.set(1 / (SUP_FRONT - SUP_STERN), 1 / (top - 14));
      tx.offset.set(-SUP_STERN / (SUP_FRONT - SUP_STERN), -14 / (top - 14));
    }
    const wm = std('#ffffff', { map: tb, emissiveMap: te, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.5 });
    const lightsOn = { value: 1 };
    wm.onBeforeCompile = (sh) => {
      sh.uniforms.rankMap = { value: tr };
      sh.uniforms.lightsOn = lightsOn;
      sh.fragmentShader = 'uniform sampler2D rankMap;\nuniform float lightsOn;\n' + sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
         float rank = texture2D( rankMap, vEmissiveMapUv ).r;
         totalEmissiveRadiance *= emissiveColor.rgb * step( rank, lightsOn );`);
    };
    shipLit.windows = lightsOn;
    ship.add(new THREE.Mesh(geo, [wm, white]));
  }
  const bridgeM = std('#0e1c30', { emissive: '#2a4a70', emissiveIntensity: 0.5, roughness: 0.15 });
  box(3.5, 2.2, SUP_BEAM + 5, bridgeM, TOP_FRONT + 3, DECK_TOP - 1.6, 0, ship);
  shipLit.bridge = bridgeM;
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, 16, 32), std('#c62f36', { roughness: 0.5 }));
  funnel.scale.z = 0.6; funnel.position.set(-70, DECK_TOP + 8, 0); ship.add(funnel);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 2.5, 32), navy);
  cap.scale.z = 0.6; cap.position.set(-70, DECK_TOP + 16, 0); ship.add(cap);
  const boats = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1.4, 7, 6, 12), std('#ff7a1a', { roughness: 0.45 }), 40);
  n = 0;
  for (const side of [-1, 1]) for (let x = -110; x < 50; x += 12) {
    m4.makeRotationZ(Math.PI / 2); m4.setPosition(x, 17.6, side * (SUP_BEAM / 2 + 1.6)); boats.setMatrixAt(n++, m4);
  }
  boats.count = n; ship.add(boats);
  const bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const base = ['#ff5a5a', '#ffd45a', '#5aff9a', '#6aa8ff'];
  const cols = base.map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  cols.forEach((m, i) => { m.userData.base = new THREE.Color(base[i]); shipLit.bulbs.push(m); });
  const RAIL_Z = SUP_BEAM / 2 - 0.2, X0 = SUP_STERN + 8, X1 = TOP_FRONT - 4;
  for (const z of [-(RAIL_Z - 0.7), RAIL_Z - 0.7]) {
    for (let x = X0; x <= X1; x += 0.75) {
      const seg = ((x - X0) % 9) / 9;
      const b = new THREE.Mesh(bulbGeo, cols[Math.round((x - X0) / 0.75) % 4]);
      b.position.set(x, DECK_TOP + 4.6 - Math.sin(seg * Math.PI) * 0.7, z);
      ship.add(b);
    }
    for (let x = X0; x <= X1 + 0.01; x += 9) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6), navy);
      pole.position.set(x, DECK_TOP + 2.3, z); ship.add(pole);
    }
  }
  const wt = canvasTex(512, 512, (g) => {
    for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#8a6a4a' : '#7c5e40'; g.fillRect(0, i * 16, 512, 15); g.fillStyle = '#4a3624'; g.fillRect(0, i * 16 + 15, 512, 1); }
  }, [30, 2]);
  const deckLen = TOP_FRONT - SUP_STERN - 2, deckMid = (TOP_FRONT + SUP_STERN) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(deckLen, SUP_BEAM - 0.4), std('#ffffff', { map: wt, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(deckMid, DECK_TOP + 0.02, 0); ship.add(floor);
  const glassM = std('#9fc4e0', { transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide });
  const railM = std('#d7dde5', { metalness: 0.8, roughness: 0.25 });
  const railSide = (len, x, z, rotY) => {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.05), glassM);
    glass.position.set(x, DECK_TOP + 0.55, z); glass.rotation.y = rotY; ship.add(glass);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 8), railM);
    rail.rotation.set(0, rotY, Math.PI / 2); rail.position.set(x, DECK_TOP + 1.1, z); ship.add(rail);
  };
  railSide(deckLen, deckMid, -RAIL_Z, 0);
  railSide(deckLen, deckMid, RAIL_Z, 0);
  railSide(RAIL_Z * 2, TOP_FRONT - 1, 0, Math.PI / 2);
  railSide(RAIL_Z * 2, SUP_STERN + 1, 0, Math.PI / 2);
  for (const [c, i, p] of [['#ffcf9a', 30, [-1, 3.4, 10]], ['#ffb3c8', 18, [3, 3.4, 9]]]) {
    const l = new THREE.PointLight(c, i, 14, 1.6); l.position.set(p[0], DECK_TOP + p[1], p[2]); l.userData.base = i;
    ship.add(l); shipLit.lamps.push(l);
  }
  const shipGlow = new THREE.PointLight('#ffc888', 40, 300, 1); shipGlow.userData.base = 40;
  shipGlow.position.set(0, 30, 60); ship.add(shipGlow); shipLit.lamps.push(shipGlow);
  // wake behind the stern
  const wakeTex = canvasTex(256, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    const sx = g.createLinearGradient(0, 0, w, 0); sx.addColorStop(0, 'rgba(0,0,0,0)'); sx.addColorStop(0.5, 'rgba(0,0,0,1)'); sx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sx; g.fillRect(0, 0, w, h);
    const r2 = rng(3);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r2() * 0.8})`; g.beginPath(); g.arc(r2() * w, r2() * h, 2 + r2() * 10, 0, 7); g.fill(); }
  });
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(40, 600), new THREE.MeshBasicMaterial({ map: wakeTex, transparent: true, depthWrite: false, opacity: 0.8 }));
  wake.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); wake.position.set(-140 - 300, 0.3, 0); ship.add(wake);
  shipLit.wake = wake.material;
}

function setShipLights(level, party = level) {
  shipLit.windows.value = level;
  shipLit.ports.color.set('#ffd896').multiplyScalar(lerp(0.04, 1, level));
  for (const m of shipLit.bulbs) m.color.copy(m.userData.base).multiplyScalar(lerp(0.03, 1, party));
  for (const l of shipLit.lamps) l.intensity = l.userData.base * level;
  shipLit.bridge.emissiveIntensity = 0.5 * Math.max(level, 0.3);
}

// ---------- nuclear flashes ----------
const FLASHES = [
  { t: 5.0, until: 9.9, pos: v(-1600, 0, -4200) },          // the hook: seen behind the ship
  { t: 16.96, pos: v(-1100, 0, 3600) },
  { t: 18.96, pos: v(1500, 0, 3100) },
  { t: 21.06, pos: v(250, 0, 4300) },
];
const hot = new THREE.Color(1, 0.95, 0.85), fire = new THREE.Color(1, 0.42, 0.12);
for (const f of FLASHES) {
  f.group = new THREE.Group(); f.group.position.copy(f.pos); outside.add(f.group);
  f.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false }));
  f.stem = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ff8040', toneMapped: false, fog: false, transparent: true }));
  f.cap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: '#ff8040', toneMapped: false, fog: false, transparent: true }));
  f.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,200,140,1)', 'rgba(255,120,40,0)'), toneMapped: false, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  f.group.add(f.ball, f.stem, f.cap, f.halo);
  f.light = new THREE.DirectionalLight('#ffd6a8', 0);
  f.light.position.copy(f.pos).normalize().multiplyScalar(500);
  outside.add(f.light);
}

const whiteout = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
whiteout.position.z = -0.1; whiteout.renderOrder = 999; whiteout.scale.set(0.2, 0.3, 1);
camera.add(whiteout);

function updateFlashes(t, dim = 1) {
  let white = 0, glow = 0;
  const dir = v(0, 0, 0);
  for (const f of FLASHES) {
    const k = t - f.t;
    const on = k >= 0 && t < (f.until || 1e9);
    f.group.visible = on;
    f.light.intensity = 0;
    if (!on) continue;
    const r = 120 + 260 * ease(k / 1.2);
    const cool = ease(k / 2.5);
    f.ball.scale.setScalar(r * (1 - 0.35 * cool));
    f.ball.position.y = 200 * cool + 600 * ease((k - 1.5) / 6);
    f.ball.material.color.copy(hot).lerp(fire, cool).multiplyScalar(lerp(14, 3, cool) * lerp(0.5, 1, dim));
    const sh = ease((k - 0.8) / 5);
    f.stem.visible = f.cap.visible = sh > 0;
    f.stem.scale.set(90 + 40 * sh, 900 * sh + 1, 90 + 40 * sh);
    f.stem.position.y = 450 * sh;
    f.stem.material.color.copy(fire).multiplyScalar(2.2 * (1 - 0.4 * sh) * dim);
    f.stem.material.opacity = 0.85;
    f.cap.scale.set(260 + 260 * sh, 150 + 120 * sh, 260 + 260 * sh);
    f.cap.position.y = 900 * sh + 60;
    f.cap.material.color.copy(fire).multiplyScalar(2.6 * (1 - 0.3 * sh) * dim);
    f.cap.material.opacity = 0.9;
    f.halo.scale.setScalar(2500 + 1500 * ease(k / 2));
    f.halo.position.y = f.cap.position.y * 0.6;
    f.halo.material.opacity = (0.35 + 0.65 * Math.exp(-k * 1.4)) * dim;
    const burst = Math.exp(-k * 2.6) * clamp(k / 0.05);
    f.light.intensity = 3.5 * burst + 0.35 * dim;
    f.light.color.copy(hot).lerp(fire, ease(k / 0.8));
    white = Math.max(white, 0.9 * Math.exp(-k * 5) * clamp(k / 0.05));
    const g = 0.5 + 1.5 * burst;
    glow += g;
    dir.addScaledVector(v(f.pos.x, 0, f.pos.z).normalize(), g);
  }
  whiteout.material.opacity = white;
  const u = sky.material.uniforms;
  u.glow.value.setRGB(0.55, 0.22, 0.08).multiplyScalar(Math.min(glow, 2.5) * dim);
  if (dir.lengthSq() > 0) u.glowDir.value.copy(dir.normalize());
}

// =====================================================================
// CHARACTERS
// =====================================================================
function capsule(r, len, mat) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat); }
function sphere(r, mat, ws = 32) { return new THREE.Mesh(new THREE.SphereGeometry(r, ws, ws), mat); }

function makeCharacter(o) {
  const skin = std(o.skin, { roughness: 0.55 });
  const hairM = std(o.hair, { roughness: 0.75 });
  const top = std(o.top, { roughness: 0.7 });
  const pants = std(o.pants, { roughness: 0.8 });
  const dark = std('#1b1b20', { roughness: 0.4 });
  const eyeW = std('#f6f6f2', { roughness: 0.2 });
  const iris = std(o.eyes || '#4a3020', { roughness: 0.2 });
  const pupil = new THREE.MeshBasicMaterial({ color: '#050505' });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const lip = std(o.lip || '#b06a5a', { roughness: 0.5 });
  const mouthIn = std('#4a1218', { roughness: 0.8 });

  const s = o.scale || 1, hs = o.headScale || 1;
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const legs = [];
  for (const x of [-0.1, 0.1]) {
    const hip = new THREE.Group(); hip.position.set(x * s, 0.84 * s, 0); body.add(hip);
    const leg = capsule(0.075 * s, 0.68 * s, pants); leg.position.y = -0.4 * s; hip.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.08 * s, 0.26 * s), dark); shoe.position.set(0, -0.8 * s, 0.04 * s); hip.add(shoe);
    legs.push(hip);
  }
  const torso = capsule(0.19 * s, 0.42 * s, top); torso.scale.z = 0.62; torso.position.y = 1.12 * s; body.add(torso);
  if (o.collar) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.02 * s, 8, 24), std(o.collar, { roughness: 0.7 }));
    collar.rotation.x = Math.PI / 2; collar.position.y = 1.44 * s; body.add(collar);
  }
  if (o.epaulettes) for (const x of [-1, 1]) box(0.12 * s, 0.02 * s, 0.1 * s, std('#d9a520', { metalness: 0.6, roughness: 0.3 }), x * 0.2 * s, 1.43 * s, 0, body);
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.235 * s, 1.38 * s, 0); body.add(pivot);
    const arm = capsule(0.058 * s, 0.5 * s, top); arm.position.y = -0.3 * s; pivot.add(arm);
    if (o.detailHand && side > 0) {
      const hand = new THREE.Group(); hand.position.y = -0.63 * s; pivot.add(hand);
      const palm = sphere(0.05 * s, skin, 20); palm.scale.set(1, 0.35, 1.1); hand.add(palm);
      for (let i = 0; i < 4; i++) {
        const f = capsule(0.011 * s, 0.045 * s, skin); f.rotation.x = Math.PI / 2;
        f.position.set((-0.03 + i * 0.02) * s, 0.004 * s, (0.075 + (i === 1 || i === 2 ? 0.006 : 0)) * s); hand.add(f);
      }
      const th = capsule(0.012 * s, 0.035 * s, skin); th.rotation.set(Math.PI / 2, 0, 0.9); th.position.set(-0.055 * s, 0, 0.03 * s); hand.add(th);
      hand.userData.palm = true;
      arms.push(Object.assign(pivot, { hand }));
    } else {
      const hand = sphere(0.055 * s, skin, 16); hand.position.y = -0.62 * s; pivot.add(hand);
      arms.push(Object.assign(pivot, { hand }));
    }
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.055 * s, 0.12 * s, 16), skin); neck.position.y = 1.48 * s; body.add(neck);
  const head = new THREE.Group(); head.position.y = (1.48 * s) + 0.17 * hs; body.add(head);
  const cranium = sphere(0.12 * hs, skin, 48); cranium.scale.set(1, 1.12, 1.04); head.add(cranium);
  const jaw = sphere(0.095 * hs, skin, 40); jaw.scale.set(0.92, 0.8, 0.95); jaw.position.set(0, -0.05 * hs, 0.012 * hs); head.add(jaw);
  for (const x of [-1, 1]) { const ear = sphere(0.026 * hs, skin, 16); ear.scale.set(0.5, 1, 0.8); ear.position.set(x * 0.118 * hs, -0.005 * hs, 0); head.add(ear); }
  const nose = sphere(0.015 * hs, skin, 20); nose.scale.set(0.85, 1.1, 1); nose.position.set(0, -0.02 * hs, 0.123 * hs); head.add(nose);
  const eyes = [];
  for (const x of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(x * 0.042 * hs, 0.012 * hs, 0.098 * hs); head.add(e);
    e.add(sphere(0.023 * hs, eyeW, 24));
    const ir = sphere(0.0135 * hs, iris, 20); ir.scale.z = 0.5; ir.position.z = 0.0175 * hs; e.add(ir);
    const pu = sphere(0.0068 * hs, pupil, 16); pu.scale.z = 0.4; pu.position.z = 0.0228 * hs; e.add(pu);
    const sh = sphere(0.0028 * hs, shine, 8); sh.position.set(0.004 * hs, 0.005 * hs, 0.0245 * hs); e.add(sh);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0245 * hs, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin);
    e.add(lid);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(0.0243 * hs, 24, 12, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), skin));
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.026 * hs, 0.0042 * hs, 6, 16, Math.PI * 0.55), hairM);
    brow.position.set(x * 0.043 * hs, 0.03 * hs, 0.108 * hs); head.add(brow);
    eyes.push({ e, lid, brow, x });
  }
  const mouth = new THREE.Group(); mouth.position.set(0, -0.05 * hs, 0.113 * hs); head.add(mouth);
  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.022 * hs, 0.0055 * hs, 8, 24), lip); lips.scale.set(1, 0.25, 0.6); mouth.add(lips);
  const inner = sphere(0.02 * hs, mouthIn, 16); inner.scale.set(1, 0.05, 0.4); mouth.add(inner);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.128 * hs, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM);
  cap.scale.set(1.03, 1.12, 1.08); cap.rotation.x = -0.62; cap.position.set(0, 0.02 * hs, -0.018 * hs); head.add(cap);
  if (o.longHair) {
    const back = capsule(0.1 * hs, 0.16 * hs, hairM); back.scale.z = 0.6; back.position.set(0, -0.08 * hs, -0.07 * hs); head.add(back);
    for (const x of [-1, 1]) { const tail = capsule(0.035 * hs, 0.14 * hs, hairM); tail.position.set(x * 0.13 * hs, -0.1 * hs, -0.03 * hs); tail.rotation.z = x * 0.25; head.add(tail); }
  } else {
    const fringe = sphere(0.06 * hs, hairM, 20); fringe.scale.set(1.3, 0.35, 0.7); fringe.position.set(0.02 * hs, 0.118 * hs, 0.05 * hs); fringe.rotation.z = -0.15; head.add(fringe);
  }
  if (o.hat) {
    const hat = new THREE.Group(); hat.position.set(0, 0.1 * hs, -0.005 * hs); hat.rotation.x = -0.12; head.add(hat);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.145 * hs, 0.128 * hs, 0.08 * hs, 32), std('#f6f6f6', { roughness: 0.5 }));
    crown.position.y = 0.04 * hs; hat.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * hs, 0.13 * hs, 0.03 * hs, 32), std('#111522'));
    band.position.y = 0.0; hat.add(band);
    const visor = sphere(0.09 * hs, std('#0b0d14', { roughness: 0.2 }), 24); visor.scale.set(1, 0.12, 0.6); visor.position.set(0, -0.01 * hs, 0.1 * hs); hat.add(visor);
    box(0.04 * hs, 0.025 * hs, 0.01 * hs, std('#e0b030', { metalness: 0.7, roughness: 0.3 }), 0, 0.03 * hs, 0.135 * hs, hat);
  }
  return { g, body, head, eyes, mouth, lips, inner, arms, legs, hs, s, blinkSeed: o.blinkSeed || 0 };
}

function setFace(c, t, f = {}) {
  // f: {wide, open, browUp, worry, look:[x,y]}  (all 0..1)
  const blinkPhase = (t + c.blinkSeed) % 3.7;
  const blink = blinkPhase < 0.12 ? Math.sin(blinkPhase / 0.12 * Math.PI) : 0;
  const wide = f.wide ?? 0.25, open = f.open ?? 0;
  for (const { e, lid, brow, x } of c.eyes) {
    lid.rotation.x = lerp(1.25, -0.95, (1 - blink) * (0.55 + 0.45 * wide));
    e.rotation.y = (f.look ? f.look[0] : 0) * 0.35;
    e.rotation.x = -(f.look ? f.look[1] : 0) * 0.35;
    brow.position.y = (0.03 + 0.012 * (f.browUp ?? 0)) * c.hs;
    brow.rotation.z = Math.PI * 0.225 + x * (-0.18 * (f.worry ?? 0) + 0.06);
  }
  c.inner.scale.set(1, lerp(0.05, 0.9, open), 0.4);
  c.lips.scale.set(lerp(1, 0.75, open), lerp(0.25, 1.1, open), 0.6);
}

function pose(c, p = {}) {
  // p: {phase, amp (0 idle .. 1 run), lean, armL:[x,z], armR:[x,z], headX, headY}
  const ph = p.phase || 0, amp = p.amp || 0;
  c.legs[0].rotation.x = Math.sin(ph) * amp * 0.75;
  c.legs[1].rotation.x = -Math.sin(ph) * amp * 0.75;
  const aL = p.armL || [Math.sin(ph) * amp * 0.9, -0.08], aR = p.armR || [-Math.sin(ph) * amp * 0.9, 0.08];
  c.arms[0].rotation.set(aL[0], 0, aL[1]);
  c.arms[1].rotation.set(aR[0], 0, aR[1]);
  c.body.position.y = Math.abs(Math.sin(ph)) * amp * 0.05 * c.s;
  c.body.rotation.x = p.lean || 0;
  c.head.rotation.set(p.headX || 0, p.headY || 0, 0);
}

function place(c, parent, x, y, z, rotY = 0) {
  if (c.g.parent !== parent) parent.add(c.g);
  c.g.position.set(x, y, z); c.g.rotation.set(0, rotY, 0); c.g.visible = true;
}

const daniel = makeCharacter({ scale: 1, headScale: 1.05, skin: '#d9a07c', hair: '#3a2618', top: '#2f5d50', pants: '#2b3446',
                               eyes: '#4a3020', lip: '#b06a5a', collar: '#e8e8e8', blinkSeed: 0.3 });
const lily = makeCharacter({ scale: 0.66, headScale: 0.98, skin: '#e8b694', hair: '#8a4a22', top: '#f2c230', pants: '#3a5aa8',
                             eyes: '#3a6a8a', lip: '#d07a74', longHair: true, detailHand: true, blinkSeed: 1.9 });
const captain = makeCharacter({ scale: 1.02, headScale: 1.05, skin: '#d8a588', hair: '#b8b8b8', top: '#f4f4f4', pants: '#1a2238',
                                eyes: '#3a4a5a', lip: '#a86a5a', hat: true, epaulettes: true, blinkSeed: 0.9 });
const crew = makeCharacter({ scale: 0.98, headScale: 1.03, skin: '#efd2c4', hair: '#2a1a12', top: '#f2f2f2', pants: '#1a2238',
                             eyes: '#3a2a1a', lip: '#c09088', epaulettes: true, blinkSeed: 2.2 });
const crowd = [];
{
  const r = rng(77);
  const skins = ['#f1c7a8', '#d9a07c', '#b77a52', '#8a5636', '#e8b694', '#c48a64'];
  const hairs = ['#1a120c', '#3a2618', '#6a4a2a', '#b88a4a', '#8a4a22', '#d8c8a0', '#2a2a2a'];
  const tops = ['#c0392b', '#2e86c1', '#f4d03f', '#7d3c98', '#e67e22', '#16a085', '#ecf0f1', '#34495e', '#d35400', '#1abc9c', '#e84393', '#6c5ce7'];
  const pantsC = ['#2c3e50', '#34495e', '#1f2a44', '#4a3a2a', '#5d6d7e', '#202020'];
  for (let i = 0; i < 26; i++) {
    const kid = r() < 0.18;
    crowd.push(makeCharacter({ scale: kid ? 0.68 + r() * 0.1 : 0.92 + r() * 0.12, headScale: kid ? 0.98 : 1 + r() * 0.06,
      skin: skins[Math.floor(r() * skins.length)], hair: hairs[Math.floor(r() * hairs.length)], top: tops[Math.floor(r() * tops.length)],
      pants: pantsC[Math.floor(r() * pantsC.length)], longHair: r() < 0.45, blinkSeed: r() * 3 }));
  }
}
const ALL_CHARS = [daniel, lily, captain, crew, ...crowd];

// phone (held by Daniel in the phone shot)
const phoneCanvas = document.createElement('canvas'); phoneCanvas.width = 360; phoneCanvas.height = 780;
const phoneTex = new THREE.CanvasTexture(phoneCanvas); phoneTex.colorSpace = THREE.SRGBColorSpace;
const phone = new THREE.Group();
{
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.155, 0.009, 4, 0.01), std('#1c1d22', { metalness: 0.5, roughness: 0.3 })));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.147), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false }));
  scr.position.z = 0.0047; phone.add(scr);
  phone.userData.light = new THREE.PointLight('#b8c8ff', 0, 1.2, 1.5); phone.userData.light.position.z = 0.1; phone.add(phone.userData.light);
}
function drawPhone(t) {
  const g = phoneCanvas.getContext('2d'), w = 360, h = 780;
  const dead = t >= 30.68, glitch = t >= 29.9 && !dead;
  if (dead) { g.fillStyle = '#020203'; g.fillRect(0, 0, w, h); phoneTex.needsUpdate = true; return 0; }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3a8a'); gr.addColorStop(1, '#8a3aa8');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = 'bold 96px sans-serif'; g.fillText('9:43', w / 2, 200);
  g.font = 'bold 22px sans-serif'; g.fillText('Saturday, October 24', w / 2, 245);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.roundRect(24, 300, w - 48, 90, 20); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = 'bold 16px sans-serif'; g.fillText('SHIP WI-FI', 46, 332);
  g.font = 'bold 22px sans-serif'; g.fillText('Connected · Sea Pass', 46, 366);
  if (glitch) {
    const r = rng(Math.floor(t * 60));
    for (let i = 0; i < 14; i++) {
      const y = r() * h, hh = 6 + r() * 60;
      g.drawImage(phoneCanvas, 0, y, w, hh, (r() - 0.5) * 120, y, w, hh);
      g.fillStyle = ['rgba(0,255,120,0.6)', 'rgba(255,0,180,0.5)', 'rgba(0,160,255,0.6)'][Math.floor(r() * 3)];
      g.fillRect(0, y, w, hh * 0.4);
    }
    g.fillStyle = `rgba(0,0,0,${0.7 * ramp(t, 30.2, 30.68)})`; g.fillRect(0, 0, w, h);
  }
  phoneTex.needsUpdate = true;
  return glitch ? 0.4 + 0.6 * Math.random() : 1;
}

// =====================================================================
// INTERIOR SETS (each far from the ship, shown one at a time)
// =====================================================================
const sets = {};
function makeSet(name, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); g.visible = false; scene.add(g); sets[name] = g; return g; }

// ---------- grand atrium ----------
const atrium = makeSet('atrium', 6000, 0, 0);
const atriumLit = { warm: [], emis: [], chand: null, hemi: null, moon: null };
{
  const W = 30, D = 24, H = 18;
  const marble = canvasTex(1024, 1024, (g) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#e9e1d2' : '#cfc2ac'; g.fillRect(i * 128, j * 128, 128, 128); }
    g.strokeStyle = '#b89a5a'; g.lineWidth = 6; g.beginPath(); g.arc(512, 512, 300, 0, 7); g.stroke(); g.beginPath(); g.arc(512, 512, 200, 0, 7); g.stroke();
  }, [2, 2]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', { map: marble, roughness: 0.25, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; atrium.add(floor);
  const wallM = std('#d9c8ae');
  const shopTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#b8a688'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#ffe4b0'; g.fillRect(i * 170 + 15, 40, 140, 180); g.fillStyle = '#7a5a3a'; g.fillRect(i * 170 + 15, 20, 140, 20); }
  });
  const shopEmis = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#ffcf80'; g.fillRect(i * 170 + 15, 40, 140, 180); }
  });
  const shopM = std('#ffffff', { map: shopTex, emissiveMap: shopEmis, emissive: '#ffffff', emissiveIntensity: 0 });
  atriumLit.emis.push([shopM, 0.3]);
  for (const [w, x, z, ry] of [[W, 0, -D / 2, 0], [W, 0, D / 2, Math.PI], [D, -W / 2, 0, Math.PI / 2], [D, W / 2, 0, -Math.PI / 2]]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wallM); wall.position.set(x, H / 2, z); wall.rotation.y = ry; atrium.add(wall);
    for (const y of [0, 4.5, 9, 13.5]) {
      const shop = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, 3.2), shopM);
      shop.position.set(x, y + 1.8, z); shop.rotation.y = ry; shop.translateZ(0.05); atrium.add(shop);
    }
  }
  const slabM = std('#efe6d8'), goldM = std('#c9a24a', { metalness: 0.8, roughness: 0.3 }), glassM = std('#a8c8e0', { transparent: true, opacity: 0.2, side: THREE.DoubleSide });
  for (const y of [4.5, 9, 13.5]) {
    for (const [w, d, x, z] of [[W, 3, 0, -D / 2 + 1.5], [W, 3, 0, D / 2 - 1.5], [3, D - 6, -W / 2 + 1.5, 0], [3, D - 6, W / 2 - 1.5, 0]]) {
      box(w, 0.4, d, slabM, x, y, z, atrium);
    }
    for (const [w, x, z, ry] of [[W - 6, 0, -D / 2 + 3, 0], [W - 6, 0, D / 2 - 3, 0], [D - 6, -W / 2 + 3, 0, Math.PI / 2], [D - 6, W / 2 - 3, 0, Math.PI / 2]]) {
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, 1), glassM); gl.position.set(x, y + 0.7, z); gl.rotation.y = ry; atrium.add(gl);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, w, 8), goldM); rail.rotation.set(0, ry, Math.PI / 2); rail.position.set(x, y + 1.2, z); atrium.add(rail);
    }
  }
  for (const [x, z] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, H, 24), std('#efe6d8')); col.position.set(x, H / 2, z); atrium.add(col);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 24), goldM); ring.rotation.x = Math.PI / 2; ring.position.set(x, 1, z); atrium.add(ring);
  }
  const skyTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1a3060'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a9ab8'; g.lineWidth = 6;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: skyTex, color: '#9ab0e0' }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; atrium.add(ceil);
  // chandelier
  const chand = new THREE.Group(); chand.position.set(0, 12, 0); atrium.add(chand);
  const bulbM = new THREE.MeshBasicMaterial({ color: '#ffdca0', toneMapped: false });
  atriumLit.chandM = bulbM;
  const crystalM = std('#e8f0ff', { metalness: 0.9, roughness: 0.1 });
  for (let ring = 0; ring < 3; ring++) {
    const rr = 1.2 + ring * 0.8, n = 10 + ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const b = sphere(0.09, bulbM, 10); b.position.set(Math.cos(a) * rr, -ring * 0.7, Math.sin(a) * rr); chand.add(b);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), crystalM); c.position.set(Math.cos(a) * rr, -ring * 0.7 - 0.25, Math.sin(a) * rr); chand.add(c);
    }
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.03, 6, 48), goldM); hoop.rotation.x = Math.PI / 2; hoop.position.y = -ring * 0.7; chand.add(hoop);
  }
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 6), goldM); chain.position.y = 3; chand.add(chain);
  atriumLit.chandelier = chand;
  const chandLight = new THREE.PointLight('#ffd9a0', 0, 40, 1.2); chandLight.position.set(0, 11, 0); atrium.add(chandLight);
  atriumLit.warm.push([chandLight, 22]);
  for (const [x, z] of [[-10, -8], [10, -8], [-10, 8], [10, 8]]) {
    const l = new THREE.PointLight('#ffcf90', 0, 25, 1.3); l.position.set(x, 6, z); atrium.add(l); atriumLit.warm.push([l, 7]);
  }
  atriumLit.hemi = new THREE.HemisphereLight('#6f8fd0', '#2a2018', 0.5); atrium.add(atriumLit.hemi);
  const moonSpot = new THREE.SpotLight('#9fb8ff', 140, 40, 0.5, 0.6, 1.2); moonSpot.position.set(-3, H - 0.5, -2);
  moonSpot.target.position.set(0, 0, 2); atrium.add(moonSpot, moonSpot.target); atriumLit.moon = moonSpot;
  const exitM = new THREE.MeshBasicMaterial({ color: '#30ff70', toneMapped: false });
  for (const [x, z, ry] of [[-6, -D / 2 + 0.1, 0], [6, -D / 2 + 0.1, 0], [-W / 2 + 0.1, 4, Math.PI / 2]]) {
    const sgn = box(0.9, 0.3, 0.05, exitM, x, 3.3, z, atrium); sgn.rotation.y = ry;
    const l = new THREE.PointLight('#30ff70', 3, 6, 1.5); l.position.set(x, 3.2, z + (ry ? 0 : 0.5)); atrium.add(l);
  }
}
function setAtriumLights(k, flick = 1) {
  for (const [l, i] of atriumLit.warm) l.intensity = i * k * flick;
  for (const [m, i] of atriumLit.emis) m.emissiveIntensity = i * k * flick;
  atriumLit.chandM.color.set('#ffdca0').multiplyScalar(lerp(0.05, 1, k * flick));
  atriumLit.hemi.intensity = lerp(0.45, 0.5, k);
  atriumLit.hemi.color.set(k > 0.5 ? '#ffe8c8' : '#6f8fd0');
  atriumLit.moon.intensity = lerp(140, 30, k);
}

// ---------- corridor ----------
const corridor = makeSet('corridor', -6000, 0, 0);
const corridorLit = { red: [] };
{
  const L = 44, Wd = 2.6, Hh = 2.7;
  const carpet = canvasTex(256, 256, (g) => {
    g.fillStyle = '#1e2a5a'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 4;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 64 + 32, 0); g.lineTo(i * 64, 32); g.lineTo(i * 64 + 32, 64); g.lineTo(i * 64 + 64, 32); g.closePath(); g.stroke(); }
    g.fillStyle = '#8a1a2a'; g.fillRect(0, 0, 12, 256); g.fillRect(244, 0, 12, 256);
  }, [1, 14]);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(Wd, L), std('#ffffff', { map: carpet, roughness: 0.9 }));
  fl.rotation.x = -Math.PI / 2; corridor.add(fl);
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(Wd, L), std('#e8e2d6')); ce.rotation.x = Math.PI / 2; ce.position.y = Hh; corridor.add(ce);
  const wallTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e6dccb'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b9a88c'; g.fillRect(0, h * 0.62, w, 8);
  }, [8, 1]);
  for (const x of [-Wd / 2, Wd / 2]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, Hh), std('#ffffff', { map: wallTex }));
    wall.position.set(x, Hh / 2, 0); wall.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; corridor.add(wall);
    for (let z = -L / 2 + 2; z < L / 2 - 1; z += 3.2) {
      const door = box(0.06, 2.05, 0.95, std('#8a5a32', { roughness: 0.5 }), x - Math.sign(x) * 0.02, 1.03, z, corridor);
      box(0.02, 0.08, 0.14, std('#d0b060', { metalness: 0.8, roughness: 0.3 }), x - Math.sign(x) * 0.06, 1.65, z, corridor);
      box(0.03, 0.03, 0.12, std('#d0b060', { metalness: 0.8, roughness: 0.3 }), x - Math.sign(x) * 0.06, 1.0, z + 0.35, corridor);
      void door;
    }
  }
  const panelM = new THREE.MeshBasicMaterial({ color: '#fff4e0', toneMapped: false });
  corridorLit.panelM = panelM;
  const redM = new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false });
  corridorLit.redM = redM;
  for (let z = -L / 2 + 2; z < L / 2; z += 4) {
    box(0.6, 0.03, 0.6, panelM, 0, Hh - 0.02, z, corridor);
    box(0.25, 0.08, 0.12, redM, Wd / 2 - 0.2, Hh - 0.15, z + 2, corridor);
    const l = new THREE.PointLight('#ff2a2a', 0, 7, 1.4); l.position.set(0.6, Hh - 0.4, z + 2); corridor.add(l); corridorLit.red.push(l);
  }
  corridorLit.hemi = new THREE.HemisphereLight('#ffe8d0', '#40302a', 0.7); corridor.add(corridorLit.hemi);
}

// ---------- bridge ----------
const bridgeSet = makeSet('bridge', -6000, 0, 6000);
const screens = {};
function screen(name, w, h, cw, ch) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  screens[name] = { c, t, m }; return m;
}
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), std('#2a2e36', { roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; bridgeSet.add(fl);
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), std('#d8dce2')); ce.rotation.x = Math.PI / 2; ce.position.y = 3.2; bridgeSet.add(ce);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.2), std('#c8ccd2')); back.position.set(0, 1.6, 5); back.rotation.y = Math.PI; bridgeSet.add(back);
  // front windows with the night sea and the glowing horizon
  const view = canvasTex(2048, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1640'); gr.addColorStop(0.55, '#2c4f86'); gr.addColorStop(0.56, '#183660'); gr.addColorStop(1, '#06142a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (const x of [500, 1200, 1700]) { const r = g.createRadialGradient(x, h * 0.55, 0, x, h * 0.55, 260); r.addColorStop(0, 'rgba(255,140,60,0.9)'); r.addColorStop(1, 'rgba(255,100,40,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }
    g.fillStyle = '#fff'; const rr = rng(2); for (let i = 0; i < 200; i++) g.fillRect(rr() * w, rr() * h * 0.5, 2, 2);
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.8), new THREE.MeshBasicMaterial({ map: view }));
  win.position.set(0, 2.1, -5); bridgeSet.add(win);
  for (let x = -10; x <= 10; x += 2.5) box(0.12, 1.9, 0.12, std('#30343c'), x, 2.1, -4.95, bridgeSet);
  box(20, 1.2, 0.2, std('#3a3f48'), 0, 0.6, -4.9, bridgeSet);
  // console desk
  const deskM = std('#2c313a', { roughness: 0.5 });
  const desk = box(12, 1.0, 1.2, deskM, 0, 0.5, -3.4, bridgeSet);
  const top = box(12, 0.1, 1.3, std('#3c424c'), 0, 1.02, -3.4, bridgeSet); top.rotation.x = 0.25;
  void desk;
  const btnM = [new THREE.MeshBasicMaterial({ color: '#30ff90', toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ffb030', toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ff3030', toneMapped: false })];
  const rb = rng(8);
  for (let i = 0; i < 80; i++) box(0.04, 0.02, 0.04, btnM[Math.floor(rb() * 3)], -5.8 + rb() * 11.6, 1.09, -3.1 - rb() * 0.4, bridgeSet);
  const mk = (name, x, w = 0.9, h = 0.6) => {
    const s = screen(name, w, h, 640, 430); s.position.set(x, 1.55, -3.75); s.rotation.x = -0.25; bridgeSet.add(s);
    box(w + 0.06, h + 0.06, 0.04, std('#16191e'), x, 1.55, -3.79, bridgeSet).rotation.x = -0.25;
  };
  mk('radar', -2.4); mk('terminal', -1.2); mk('chart', 0.1, 1.2, 0.75); mk('engine', 1.5);
  // microphone on a gooseneck
  const mic = new THREE.Group(); mic.position.set(0.9, 1.08, -3.0); bridgeSet.add(mic);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 8), std('#222')); neck.position.y = 0.17; neck.rotation.x = 0.4; mic.add(neck);
  const head = capsule(0.02, 0.05, std('#111')); head.position.set(0, 0.33, 0.08); head.rotation.x = 1.2; mic.add(head);
  // alarm beacon
  const beacon = new THREE.Group(); beacon.position.set(0, 3.05, -1); bridgeSet.add(beacon);
  beacon.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 16), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false })));
  const spot = new THREE.SpotLight('#ff2020', 0, 20, 0.5, 0.5, 1); spot.position.set(0, -0.05, 0); beacon.add(spot); beacon.add(spot.target);
  screens.beacon = { beacon, spot };
  screens.hemi = new THREE.HemisphereLight('#9fb4e0', '#30343c', 0.9); bridgeSet.add(screens.hemi);
  const consoleGlow = new THREE.PointLight('#8ab8ff', 1.5, 5, 1.5); consoleGlow.position.set(-0.6, 1.2, -3.3); bridgeSet.add(consoleGlow);
}
function drawScreen(name, draw) { const s = screens[name]; draw(s.c.getContext('2d'), s.c.width, s.c.height); s.t.needsUpdate = true; }
function drawRadar(t) {
  drawScreen('radar', (g, w, h) => {
    g.fillStyle = '#021a10'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,255,140,0.5)'; g.lineWidth = 2;
    for (let r = 50; r < 220; r += 50) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); }
    const a = t * 2; g.strokeStyle = '#3cff8c'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * 200, h / 2 + Math.sin(a) * 200); g.stroke();
  });
}
function drawEngine(t, ok) {
  drawScreen('engine', (g, w, h) => {
    g.fillStyle = '#0a0f1a'; g.fillRect(0, 0, w, h);
    g.font = 'bold 34px monospace'; g.fillStyle = ok ? '#3cff8c' : '#ff4040';
    g.fillText(ok ? 'AUX POWER: ON' : 'POWER: LOW', 30, 70);
    for (let i = 0; i < 6; i++) { g.fillStyle = ok ? '#3cff8c' : '#ff4040'; g.fillRect(30 + i * 95, 360 - (ok ? 150 + 60 * Math.sin(t * 3 + i) : 30), 70, ok ? 150 + 60 * Math.sin(t * 3 + i) : 30); }
  });
}
function drawTerminal(t) {
  drawScreen('terminal', (g, w, h) => {
    g.fillStyle = '#021208'; g.fillRect(0, 0, w, h);
    g.fillStyle = (Math.floor(t * 3) % 2) ? '#ff3030' : '#601010'; g.fillRect(w - 170, 14, 156, 36);
    g.fillStyle = '#fff'; g.font = 'bold 22px monospace'; g.fillText('PRIORITY', w - 152, 40);
    g.fillStyle = '#3cff8c'; g.font = 'bold 24px monospace'; g.fillText('SAT-COM  INCOMING', 20, 40);
    const lines = [['FROM: COAST GUARD', 62.45, 63.3, 26], ['ALL PORTS ARE CLOSED.', 64.3, 65.35, 40], ['DO NOT APPROACH', 66.05, 66.8, 40], ['THE COAST.', 66.8, 67.4, 40]];
    let y = 110, cursor = null;
    for (const [s, a, b, size] of lines) {
      const n = Math.floor(s.length * clamp((t - a) / (b - a)));
      g.font = `bold ${size}px monospace`;
      if (n > 0) { g.fillStyle = size > 30 ? '#5cff9c' : '#a0c0b0'; g.fillText(s.slice(0, n), 20, y); cursor = [20 + g.measureText(s.slice(0, n)).width + 6, y]; }
      y += size > 30 ? 70 : 50;
    }
    if (cursor && Math.floor(t * 3) % 2) { g.fillStyle = '#5cff9c'; g.fillRect(cursor[0], cursor[1] - 32, 20, 36); }
  });
}
function drawChart(t) {
  drawScreen('chart', (g, w, h) => {
    g.fillStyle = '#081a30'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,160,255,0.15)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const r = rng(9); g.fillStyle = '#1e3a30'; g.strokeStyle = '#5ac8a0'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.78, 0);
    for (let y = 0; y <= h; y += 25) g.lineTo(w * (0.66 + r() * 0.12), y);
    g.lineTo(w, h); g.lineTo(w, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5ad0ff'; g.beginPath(); g.moveTo(200, 230); g.lineTo(170, 215); g.lineTo(170, 245); g.fill();
    g.strokeStyle = 'rgba(90,208,255,0.6)'; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(205, 230); g.lineTo(w * 0.72, 160); g.stroke(); g.setLineDash([]);
    const px = w * 0.73, py = 160;
    for (const [cx, cy, i] of [[w * 0.74, 300, 0], [w * 0.7, 380, 1], [w * 0.75, 60, 2]]) {
      g.fillStyle = `rgba(255,255,255,${1 - ramp(t, 68.6 + i * 0.3, 68.9 + i * 0.3) * 0.8})`; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill();
    }
    g.font = 'bold 26px sans-serif';
    if (t < 69.3) { g.fillStyle = '#3cff8c'; g.beginPath(); g.arc(px, py, 12, 0, 7); g.fill(); g.fillText('HOME PORT', px - 180, py - 20); }
    else {
      const blink = Math.floor(t * 4) % 2;
      g.strokeStyle = '#ff4040'; g.lineWidth = 5; const rr = 26 + 8 * Math.sin(t * 6);
      g.beginPath(); g.arc(px, py, rr, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(px - 14, py - 14); g.lineTo(px + 14, py + 14); g.moveTo(px - 14, py + 14); g.lineTo(px + 14, py - 14); g.stroke();
      g.fillStyle = '#ff4040'; g.fillText('HOME PORT', px - 200, py - 24);
      if (blink) g.fillText('NO SIGNAL', px - 190, py + 44);
    }
  });
}

// ---------- stairwell ----------
const stairs = makeSet('stairs', 6000, 0, 6000);
const stairsLit = { red: [] };
const STAIR_TOP = 4, STAIR_LEN = 7;
const stairY = (x) => x >= 0 ? STAIR_TOP : x <= -STAIR_LEN ? 0 : STAIR_TOP * (1 + x / STAIR_LEN);
{
  const stepM = std('#8a8f98', { roughness: 0.7 }), noseM = std('#e8c030');
  const n = 16;
  for (let i = 0; i < n; i++) {
    const x0 = -i * STAIR_LEN / n, yTop = STAIR_TOP - i * STAIR_TOP / n;
    box(STAIR_LEN / n, yTop, 2.6, stepM, x0 - STAIR_LEN / n / 2, yTop / 2, 0, stairs);
    box(0.05, 0.02, 2.6, noseM, x0 - 0.03, yTop + 0.01, 0, stairs);
  }
  box(6, STAIR_TOP, 2.6, stepM, 3, STAIR_TOP / 2, 0, stairs);
  box(8, 0.1, 2.6, stepM, -STAIR_LEN - 4, 0.05, 0, stairs);
  const wallTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#cfd3d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#9aa0a8'; g.fillRect(0, h - 40, w, 6); }, [6, 1]);
  for (const z of [-1.3, 1.3]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), std('#ffffff', { map: wallTex }));
    wall.position.set(-3, 4.5, z); wall.rotation.y = z < 0 ? 0 : Math.PI; stairs.add(wall);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(STAIR_LEN, STAIR_TOP), 8), std('#c0c4c8', { metalness: 0.8, roughness: 0.3 }));
    rail.rotation.z = Math.PI / 2 - Math.atan2(STAIR_TOP, STAIR_LEN); rail.position.set(-STAIR_LEN / 2, STAIR_TOP / 2 + 0.9, z * 0.92); stairs.add(rail);
  }
  const sign = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#123a8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 110px sans-serif'; g.textAlign = 'center'; g.fillText('DECK 4', w / 2, 130);
    g.font = 'bold 60px sans-serif'; g.fillText('▼  SAFE ZONE', w / 2, 220);
  });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }));
  sg.position.set(-4.5, 4.2, -1.28); stairs.add(sg);
  const lampM = new THREE.MeshBasicMaterial({ color: '#fff0d8', toneMapped: false });
  for (const x of [2, -2, -6, -10]) {
    box(0.4, 0.15, 0.1, lampM, x, stairY(x) + 2.6, 1.25, stairs);
    const l = new THREE.PointLight('#ffe8c8', 5, 9, 1.4); l.position.set(x, stairY(x) + 2.4, 1); stairs.add(l);
  }
  const redM = new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false });
  box(14, 0.05, 0.05, redM, -3, 0.25, -1.27, stairs);
  for (const x of [0, -5]) { const l = new THREE.PointLight('#ff3020', 20, 8, 1.4); l.position.set(x, stairY(x) + 1.5, -1); stairs.add(l); stairsLit.red.push(l); }
  stairs.add(new THREE.HemisphereLight('#d0d8e8', '#40302a', 0.45));
}

// ---------- watertight door ----------
const doorSet = makeSet('door', 6000, 0, -6000);
const doorParts = {};
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), std('#5a5e66', { roughness: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.position.x = 2; doorSet.add(fl);
  const steel = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#7d8590'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a616b'; for (let y = 0; y < h; y += 128) g.fillRect(0, y, w, 4);
    g.fillStyle = '#9aa2ac'; for (let y = 16; y < h; y += 128) for (let x = 16; x < w; x += 48) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  }, [3, 1]);
  const steelM = std('#ffffff', { map: steel, metalness: 0.5, roughness: 0.5 });
  const wall = new THREE.Shape(); wall.moveTo(-2, 0); wall.lineTo(2, 0); wall.lineTo(2, 3.2); wall.lineTo(-2, 3.2); wall.lineTo(-2, 0);
  const hole = new THREE.Path(); hole.moveTo(-0.8, 0); hole.lineTo(-0.8, 2.0); hole.lineTo(0.8, 2.0); hole.lineTo(0.8, 0); hole.lineTo(-0.8, 0);
  wall.holes.push(hole);
  const wallMesh = new THREE.Mesh(new THREE.ShapeGeometry(wall), steelM); wallMesh.rotation.y = Math.PI / 2; wallMesh.position.x = -4; doorSet.add(wallMesh);
  const stripes = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f0c020'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 32 + h, h); g.lineTo(i * 64 + h, h); g.fill(); } }, [1, 4]);
  const stripeM = std('#ffffff', { map: stripes });
  box(0.12, 2.2, 0.18, stripeM, -3.95, 1.1, -0.89, doorSet); box(0.12, 2.2, 0.18, stripeM, -3.95, 1.1, 0.89, doorSet);
  box(0.12, 0.18, 1.96, stripeM, -3.95, 2.09, 0, doorSet);
  for (const z of [-1.5, 1.5]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.2), steelM); sw.position.set(2, 1.6, z * 1.33); sw.rotation.y = z < 0 ? 0 : Math.PI; doorSet.add(sw); }
  const panel = new THREE.Group(); doorSet.add(panel);
  panel.add(box(0.14, 2.0, 1.65, std('#69717c', { metalness: 0.6, roughness: 0.4 }), 0, 1.0, 0));
  for (const y of [0.4, 1.0, 1.6]) panel.add(box(0.04, 0.08, 1.5, std('#4a5058'), 0.09, y, 0));
  panel.add(box(0.05, 0.3, 0.06, std('#c03030'), 0.1, 1.0, 0.65));
  doorParts.panel = panel;
  // the safe room behind the door
  const room = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), std('#c9b89a', { side: THREE.BackSide }));
  room.position.set(-7, 1.5, 0); doorSet.add(room);
  const roomLight = new THREE.PointLight('#ffd8a0', 60, 10, 1.3); roomLight.position.set(-6, 2.4, 0); doorSet.add(roomLight);
  const beacon = new THREE.Group(); beacon.position.set(-3.85, 2.55, 0); doorSet.add(beacon);
  beacon.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), new THREE.MeshBasicMaterial({ color: '#ffa020', toneMapped: false })));
  const sp = new THREE.SpotLight('#ffa020', 60, 14, 0.6, 0.5, 1.2); beacon.add(sp); beacon.add(sp.target);
  doorParts.beacon = { beacon, sp };
  doorSet.add(new THREE.HemisphereLight('#c8d0e0', '#30302a', 0.8));
  const ceilLamp = new THREE.PointLight('#e8f0ff', 25, 10, 1.4); ceilLamp.position.set(0, 3, 0); doorSet.add(ceilLamp);
}

// ---------- EMP globe ----------
const globeSet = makeSet('globe', 0, 30000, 0);
const globeParts = {};
{
  const R = 100;
  const earth = canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d3a7a'); gr.addColorStop(0.5, '#1a5aa8'); gr.addColorStop(1, '#0d3a7a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(12);
    const blob = (cx, cy, n, sz) => { for (let i = 0; i < n; i++) { g.beginPath(); g.ellipse(cx + (r() - 0.5) * sz * 2, cy + (r() - 0.5) * sz, sz * (0.3 + r() * 0.5), sz * (0.2 + r() * 0.4), r() * 3, 0, 7); g.fill(); } };
    g.fillStyle = '#3f7a3a'; blob(480, 330, 60, 130); blob(560, 640, 40, 110); blob(1120, 300, 70, 160); blob(1150, 560, 40, 110); blob(1600, 700, 25, 90);
    g.fillStyle = '#8a7a4a'; blob(1180, 380, 15, 70); blob(470, 400, 10, 50);
    g.fillStyle = '#eef'; g.fillRect(0, 0, w, 40); g.fillRect(0, h - 40, w, 40);
  });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), std('#ffffff', { map: earth, roughness: 0.7 }));
  globeSet.add(globe); globeParts.globe = globe;
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 64, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.75 - dot(vN, vec3(0,0,1.0)), 3.0); gl_FragColor = vec4(0.35,0.6,1.0,1.0) * i; }',
  }));
  globeSet.add(atmo);
  const st = []; const r = rng(31);
  for (let i = 0; i < 3000; i++) { const th = r() * 6.283, ph = Math.acos(2 * r() - 1); st.push(Math.sin(ph) * Math.cos(th) * 2500, Math.cos(ph) * 2500, Math.sin(ph) * Math.sin(th) * 2500); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(st, 3));
  globeSet.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false })));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(300, 150, 400); globeSet.add(sun);
  globeSet.add(new THREE.AmbientLight('#4060a0', 0.6));
  // blast point above the Atlantic, ship marker on the surface
  const dir = v(-0.35, 0.55, 0.76).normalize();
  globeParts.dir = dir;
  const shipMark = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 8), new THREE.MeshBasicMaterial({ color: '#30d0ff', toneMapped: false }));
  shipMark.position.copy(dir.clone().applyAxisAngle(v(0, 1, 0), 0.12).multiplyScalar(R + 0.5)); globeSet.add(shipMark);
  globeParts.shipMark = shipMark;
  const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  blast.position.copy(dir.clone().multiplyScalar(R + 12)); globeSet.add(blast); globeParts.blast = blast;
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 0 } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float k; varying vec3 vN; void main(){ float rim = pow(1.0 - abs(vN.z), 2.0); gl_FragColor = vec4(1.0,0.6,0.2,1.0) * (0.15 + rim) * k; }',
  }));
  pulse.position.copy(blast.position); globeSet.add(pulse); globeParts.pulse = pulse;
}

// ---------- ash ----------
const ash = (() => {
  const r = rng(55), n = 2500, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push([r() * 10 - 4, r() * 9, r() * 9 + 7, 0.25 + r() * 0.5, r() * 6.28]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = softTexture('rgba(210,210,215,1)', 'rgba(210,210,215,0)');
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, color: '#c8c8cc', size: 0.05, transparent: true, depthWrite: false, opacity: 0 }));
  ship.add(p);
  return { p, seed, pos };
})();
function updateAsh(t, start) {
  const k = clamp((t - start) / 2.5);
  ash.p.visible = k > 0; ash.p.material.opacity = 0.9 * k;
  ash.seed.forEach(([x, y, z, sp, ph], i) => {
    const yy = DECK_TOP + 9 - (((t - start + 30) * sp + y) % 9);
    ash.pos[i * 3] = x + Math.sin(t * 0.8 + ph) * 0.3; ash.pos[i * 3 + 1] = yy; ash.pos[i * 3 + 2] = z + Math.cos(t * 0.6 + ph) * 0.3;
  });
  ash.p.geometry.attributes.position.needsUpdate = true;
}
const landedFlake = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), std('#d8d8dc', { roughness: 0.9 }));

// =====================================================================
// SHOTS
// =====================================================================
function shipToWorld(p) { return ship.localToWorld(p.clone()); }
function setTo(p, g) { return g.localToWorld(p.clone()); }
function faceCam(c, dist, side, up = 0.02) {
  const h = new THREE.Vector3(), q = new THREE.Quaternion();
  c.head.getWorldPosition(h); c.head.getWorldQuaternion(q);
  const fwd = v(0, 0, 1).applyQuaternion(q), right = v(1, 0, 0).applyQuaternion(q);
  return [h.clone().addScaledVector(fwd, dist).addScaledVector(right, side * dist).add(v(0, up, 0)), h.clone().add(v(0, -0.01, 0))];
}
function headPos(c) { const h = new THREE.Vector3(); c.head.getWorldPosition(h); return h; }

function useOutside(t, o = {}) {
  outside.visible = true;
  scene.fog.density = 0.00011;
  setSky(o.sky || SKY_NIGHT, o.skyK ?? 1);
  stars.material.opacity = o.stars ?? 1;
  setShipLights(o.lights ?? 1, o.party ?? o.lights ?? 1);
  shipLit.wake.opacity = 0.8 * (o.wake ?? 1);
  hemi.intensity = o.hemi ?? 1.1;
  updateFlashes(t, o.flashDim ?? 1);
  ash.p.visible = false;
}
function useInterior(name, fogDensity = 0) {
  outside.visible = false;
  sets[name].visible = true;
  scene.fog.density = fogDensity;
  whiteout.material.opacity = 0;
}
function deckPair() {
  place(daniel, ship, -0.1, DECK_TOP, 11.55);
  place(lily, ship, 0.72, DECK_TOP, 11.6);
  pose(daniel, { armR: [0, 0.32] }); pose(lily, { armL: [0, -0.45] });
}

const SHOTS = [
  // 0 hook: the ship at night, the sky turns white behind it
  { from: 0, setup: (t, k) => {
      useOutside(t);
      return { cam: [v(lerp(190, 150, k), lerp(26, 22, k), lerp(300, 260, k)), v(-20, 26, 0)], fov: 40 };
    } },
  // 1 every light goes out
  { from: 6.55, setup: (t, k) => {
      const lv = 1 - ramp(t, 7.45, 9.7);
      useOutside(t, { lights: lv, party: 1 - ramp(t, 7.3, 7.5) });
      return { cam: [v(lerp(100, 85, k), lerp(30, 28, k), lerp(170, 150, k)), v(-10, 28, 0)], fov: 40 };
    } },
  // 2 9:42 PM — earlier that night (aerial)
  { from: 9.9, setup: (t, k) => {
      useOutside(t);
      return { cam: [v(lerp(300, 270, k), lerp(140, 120, k), lerp(180, 200, k)), v(-10, 20, 0)], fov: 40 };
    } },
  // 3 Daniel and Lily, ship wide
  { from: 13.1, setup: (t, k) => {
      useOutside(t); deckPair();
      return { cam: [v(lerp(330, 250, k), lerp(46, 40, k), lerp(330, 300, k)), v(-10, 26, 0)], fov: 40 };
    } },
  // 4 behind them at the railing: first flash
  { from: 16.3, setup: (t, k) => {
      useOutside(t); deckPair();
      return { cam: [shipToWorld(v(0.25, DECK_TOP + 2.0, lerp(7.6, 8.3, k))), shipToWorld(v(0.3, DECK_TOP + 0.2, 40))], fov: 38 };
    } },
  // 5 Daniel close-up: second flash
  { from: 18.7, setup: (t, k) => {
      useOutside(t); deckPair();
      setFace(daniel, t, { wide: ramp(t, 18.98, 19.2), open: 0.6 * ramp(t, 19.05, 19.4), browUp: ramp(t, 18.98, 19.2), worry: 0.3 });
      const h = shipToWorld(v(-0.1, DECK_TOP + 1.71, 11.55));
      return { cam: [h.clone().add(v(0.12, 0.02, lerp(1.3, 1.1, k))), h.clone().add(v(0, -0.04, 0))], fov: 26, fill: 0.8, faces: 'set' };
    } },
  // 6 wide behind: third flash
  { from: 20.0, setup: (t, k) => {
      useOutside(t); deckPair();
      return { cam: [shipToWorld(v(0.3, DECK_TOP + lerp(4.2, 3.8, k), lerp(3.5, 5, k))), shipToWorld(v(0.3, DECK_TOP - 12, 400))], fov: 42 };
    } },
  // 7 Lily close-up: no sound, just light
  { from: 22.2, setup: (t, k) => {
      useOutside(t); deckPair();
      setFace(lily, t, { wide: 0.85, open: 0.35 + 0.05 * Math.sin(t * 9), browUp: 0.9, worry: 1, look: [0.15, 0.05] });
      return { cam: faceCam(lily, lerp(0.85, 0.7, k), 0.15), fov: 30, fill: 0.8, faces: 'set', headTurn: true };
    } },
  // 8 music stops, engines stop: stern aerial, the wake fades
  { from: 24.95, setup: (t, k) => {
      useOutside(t, { party: 1 - ramp(t, 25.55, 25.7), wake: 1 - ramp(t, 27.2, 28.4) });
      return { cam: [v(lerp(-330, -300, k), lerp(80, 70, k), lerp(110, 90, k)), v(-90, 20, 0)], fov: 40 };
    } },
  // 9 Daniel's phone dies
  { from: 28.45, setup: (t, k) => {
      useOutside(t, { wake: 0 }); deckPair();
      pose(daniel, { armR: [-1.25, 0.35] });
      const p = shipToWorld(v(0.05, DECK_TOP + 1.42, 11.95));
      if (phone.parent !== ship) ship.add(phone);
      phone.visible = true; phone.position.copy(ship.worldToLocal(p.clone())); phone.rotation.set(-0.45, Math.PI, 0);
      const glow = drawPhone(t); phone.userData.light.intensity = 0.8 * glow;
      setFace(daniel, t, { wide: t > 29.9 ? 0.7 : 0.3, open: t > 30.7 ? 0.25 : 0, browUp: t > 29.9 ? 0.6 : 0, worry: t > 29.9 ? 0.6 : 0, look: [0, -0.5] });
      const h = headPos(daniel);
      return { cam: [p.clone().add(v(lerp(0.26, 0.22, k), 0.3, lerp(-0.5, -0.42, k))), p.clone().lerp(h, 0.15)], fov: 34, fill: 0.5, faces: 'set' };
    } },
  // 10 EMP explained on a globe
  { from: 33.0, setup: (t, k) => {
      useInterior('globe');
      const gp = globeParts;
      gp.globe.rotation.y = 0.2 + t * 0.01;
      const b = t >= 34.98 ? Math.exp(-(t - 34.98) * 1.5) : 0;
      gp.blast.visible = t >= 34.98; gp.blast.scale.setScalar(2 + 6 * b);
      const pk = clamp((t - 37.6) / 2.6);
      gp.pulse.visible = t >= 37.6; gp.pulse.scale.setScalar(4 + 90 * ease(pk)); gp.pulse.material.uniforms.k.value = 1 - 0.6 * pk;
      gp.shipMark.material.color.set(t >= 38.3 ? (Math.floor(t * 4) % 2 ? '#ff3030' : '#601010') : '#30d0ff');
      const look = gp.dir.clone().multiplyScalar(100);
      const cam = gp.dir.clone().multiplyScalar(lerp(330, 290, k)).add(v(lerp(-60, -40, k), -40, 0));
      return { cam: [setTo(cam, globeSet), setTo(look.multiplyScalar(0.6), globeSet)], fov: 40 };
    } },
  // 11 the ship floating, dead
  { from: 41.8, setup: (t, k) => {
      useOutside(t, { lights: 0, wake: 0, flashDim: 0.6, hemi: 0.9 });
      return { cam: [v(lerp(60, 30, k), lerp(22, 18, k), lerp(-250, -220, k)), v(0, 24, 0)], fov: 42 };
    } },
  // 12 inside: 4,000 people in the dark
  { from: 46.05, setup: (t, k) => {
      useInterior('atrium'); setAtriumLights(0);
      runCrowd(t, null);
      return { cam: [setTo(v(lerp(13.5, 12, k), 3.2, lerp(1, 0, k)), atrium), setTo(v(0, 1.6, 0), atrium)], fov: 50, shake: 0.03 };
    } },
  // 13 a hum: the chandelier
  { from: 50.45, setup: (t, k) => {
      useInterior('atrium'); setAtriumLights(0); runCrowd(t, 50.45);
      const flick = t > 51.5 ? (0.5 + 0.5 * Math.sin(t * 40)) * ramp(t, 51.5, 52.4) : 0;
      atriumLit.chandM.color.set('#ffdca0').multiplyScalar(lerp(0.05, 0.8, flick));
      return { cam: [setTo(v(2.2, lerp(9.6, 9.9, k), 3.6), atrium), setTo(v(0, 11.4, 0), atrium)], fov: 36 };
    } },
  // 14 the lights come back, everyone looks up
  { from: 52.5, setup: (t, k) => {
      useInterior('atrium');
      const fl = t < 52.84 ? 0 : t > 55.9 ? 1 : (rng(Math.floor(t * 12))() < 0.25 + 0.7 * (t - 52.84) / 3 ? 1 : 0.1);
      setAtriumLights(fl > 0.5 ? 1 : 0.15, fl);
      runCrowd(t, 52.9);
      return { cam: [setTo(v(lerp(9, 7.5, k), 1.8, lerp(8.5, 7.5, k)), atrium), setTo(v(0, lerp(3.5, 5.5, k), 0), atrium)], fov: 50 };
    } },
  // 15 for a moment it felt over: the ship with emergency lights
  { from: 58.45, setup: (t, k) => {
      useOutside(t, { lights: 0.5, party: 0, wake: 0, flashDim: 0.5 });
      return { cam: [v(lerp(210, 190, k), lerp(40, 36, k), lerp(-210, -190, k)), v(0, 24, 0)], fov: 40 };
    } },
  // 16 the message: bridge terminal, the captain reading
  { from: 61.95, setup: (t, k) => {
      useInterior('bridge'); bridgeCast(t);
      drawTerminal(t); drawRadar(t); drawChart(61); drawEngine(t, true);
      setFace(captain, t, { wide: t > 64.3 ? 0.8 : 0.4, browUp: t > 64.3 ? 0.7 : 0.2, worry: t > 66 ? 0.8 : 0.2, look: [0.1, -0.35] });
      const s = screens.terminal.m.getWorldPosition(v(0, 0, 0));
      const cam = s.clone().add(v(lerp(0.55, 0.42, k), 0.25, lerp(1.25, 1.05, k)));
      return { cam: [cam, s.clone().lerp(headPos(captain), 0.35)], fov: 40, faces: 'set' };
    } },
  // 17 the home port is gone
  { from: 68.25, setup: (t, k) => {
      useInterior('bridge'); bridgeCast(t);
      drawTerminal(67.5); drawRadar(t); drawChart(t); drawEngine(t, true);
      const s = screens.chart.m.getWorldPosition(v(0, 0, 0));
      return { cam: [s.clone().add(v(lerp(-0.25, -0.15, k), 0.12, lerp(0.95, 0.75, k))), s], fov: 42 };
    } },
  // 18 a crew member runs past Daniel
  { from: 71.45, setup: (t, k) => {
      useInterior('corridor'); corridorLights(t);
      place(daniel, corridor, 1.0, 0, 4, -Math.PI / 2); place(lily, corridor, 0.95, 0, 4.7, -Math.PI / 2);
      pose(daniel, { headY: -0.4 + 0.8 * ramp(t, 72.3, 73.4) }); pose(lily, { armL: [-0.5, -0.3] });
      setFace(daniel, t, { wide: 0.7, browUp: 0.6, worry: 0.6, look: [0.3 - 0.6 * ramp(t, 72.3, 73.4), 0] });
      setFace(lily, t, { wide: 0.8, browUp: 0.8, worry: 0.9 });
      const z = lerp(-14, 9, ramp(t, 71.6, 73.9));
      place(crew, corridor, lerp(-0.3, -0.45, ramp(t, 72.5, 73.5)), 0, z);
      pose(crew, { phase: t * 11, amp: 1, lean: 0.25 });
      setFace(crew, t, { wide: 1, open: 0.5, browUp: 1, worry: 1 });
      return { cam: [setTo(v(0.35, 1.55, 6.6), corridor), setTo(v(0.2, 1.4, -2), corridor)], fov: 50, faces: 'set', shake: t > 72.6 && t < 73.6 ? 0.02 : 0 };
    } },
  // 19 wind from the east / 20 radioactive dust (deck view toward the mushroom clouds)
  { from: 74.8, setup: (t, k) => {
      useOutside(t, { lights: 0.5, party: 0, wake: 0, flashDim: 0.7, sky: SKY_ASH, skyK: 0.25 * ramp(t, 74.8, 80.5) });
      return { cam: [shipToWorld(v(lerp(-2, 2, k), DECK_TOP + 1.8, 7)), shipToWorld(v(0, DECK_TOP + 40, 400))], fov: 44 };
    } },
  // 21 the captain's announcement
  { from: 80.5, setup: (t, k) => {
      useInterior('bridge'); bridgeCast(t);
      drawTerminal(67.5); drawRadar(t); drawChart(t); drawEngine(t, true);
      const b = screens.beacon; b.beacon.rotation.y = t * 5; b.spot.intensity = 30; b.spot.target.position.set(Math.cos(t * 5) * 3, -2, Math.sin(t * 5) * 3);
      screens.hemi.intensity = 0.55;
      const talking = (t > 82.96 && t < 85.0) ? Math.abs(Math.sin(t * 13)) : 0;
      setFace(captain, t, { wide: 0.85, open: 0.15 + 0.7 * talking, browUp: 0.7, worry: 0.7 });
      return { cam: faceCam(captain, lerp(1.0, 0.75, k), 0.25, 0.0), fov: 34, fill: 0.12, faces: 'set', shake: t > 84.7 && t < 85.3 ? 0.012 : 0 };
    } },
  // 22-23 the ship from the side (cross-section and capacity panels sit on top)
  { from: 85.95, setup: (t, k) => {
      useOutside(t, { lights: 0.45, party: 0, wake: 0, flashDim: 0.6, sky: SKY_ASH, skyK: 0.3 });
      return { cam: [v(lerp(-20, 20, k), 30, 420), v(0, 22, 0)], fov: 38 };
    } },
  // 24 the stairs
  { from: 97.6, setup: (t, k) => {
      useInterior('stairs'); stairsCrowd(t);
      for (const l of stairsLit.red) l.intensity = 5 + 3 * Math.sin(t * 6);
      const dx = lerp(1.6, -0.2, ramp(t, 97.6, 103.6));
      place(daniel, stairs, dx, stairY(dx), 0.35, -Math.PI / 2); place(lily, stairs, dx - 0.15, stairY(dx - 0.15), -0.35, -Math.PI / 2);
      pose(daniel, { phase: t * 7, amp: 0.55, armL: [0.1, -0.5] }); pose(lily, { phase: t * 8, amp: 0.6, armR: [0.1, 0.6] });
      setFace(daniel, t, { wide: 0.8, browUp: 0.7, worry: 0.8 }); setFace(lily, t, { wide: 0.9, browUp: 0.9, worry: 1 });
      return { cam: [setTo(v(lerp(4.2, 3.6, k), STAIR_TOP + 2.1, 0.2), stairs), setTo(v(-6, 1.2, 0), stairs)], fov: 52, faces: 'set', shake: 0.015 };
    } },
  // 25 the steel door closes
  { from: 103.6, setup: (t, k) => {
      useInterior('door'); doorCrowd(t);
      const close = 0.72 * ramp(t, 104.95, 107.6);
      doorParts.panel.position.set(-4.05, 0, lerp(-1.75, 0, close));
      const bc = doorParts.beacon; bc.beacon.rotation.y = t * 6; bc.sp.target.position.set(Math.cos(t * 6) * 3, -1.5, Math.sin(t * 6) * 3);
      place(daniel, doorSet, 0.6, 0, 0.45, -Math.PI / 2); place(lily, doorSet, 0.3, 0, -0.1, -Math.PI / 2);
      pose(daniel, { armL: [-0.3, -0.4] }); pose(lily, { armR: [-0.2, 0.5] });
      return { cam: [setTo(v(lerp(3.2, 2.6, k), 1.75, lerp(0.7, 0.5, k)), doorSet), setTo(v(-4, 1.0, 0), doorSet)], fov: 48, shake: t > 105 ? 0.01 : 0 };
    } },
  // 26 Lily stops, ash begins to fall
  { from: 107.45, setup: (t, k) => {
      useOutside(t, { lights: 0.35, party: 0, wake: 0, flashDim: 0.5, sky: SKY_ASH, skyK: 1, stars: 0.1, hemi: 0.9 });
      updateAsh(t, 108.4);
      place(daniel, ship, -0.4, DECK_TOP, 11.2, 0.5); place(lily, ship, 0.6, DECK_TOP, 11.55, 0);
      const reach = ramp(t, 109.7, 110.3);
      pose(daniel, {}); pose(lily, { armR: [lerp(0, -1.35, reach), lerp(0.08, 0.25, reach)], headX: lerp(0, -0.35, ramp(t, 108.4, 109.2)) });
      lily.arms[1].hand.rotation.x = 1.35 * reach;
      setFace(lily, t, { wide: 0.8, browUp: 0.6, worry: 0.4, look: [0, 0.6] }); setFace(daniel, t, { wide: 0.6, worry: 0.6, browUp: 0.4 });
      return { cam: [shipToWorld(v(lerp(1.7, 1.5, k), DECK_TOP + 1.25, lerp(14.4, 14.0, k))), shipToWorld(v(0.4, DECK_TOP + 0.95, 11.5))], fov: 40, faces: 'set' };
    } },
  // 27 her hand, the first flake lands
  { from: 110.45, setup: (t, k) => {
      useOutside(t, { lights: 0.35, party: 0, wake: 0, flashDim: 0.5, sky: SKY_ASH, skyK: 1, stars: 0.1, hemi: 0.9 });
      updateAsh(t, 108.4);
      place(daniel, ship, -0.4, DECK_TOP, 11.2, 0.5); place(lily, ship, 0.6, DECK_TOP, 11.55, 0);
      pose(lily, { armR: [-1.35, 0.25], headX: -0.35 });
      lily.arms[1].hand.rotation.x = 1.35;
      setFace(lily, t, { wide: 0.75, open: t > 110.5 && t < 111.3 ? 0.4 * Math.abs(Math.sin(t * 12)) : t > 112.3 ? 0.35 * Math.abs(Math.sin(t * 12)) : 0, browUp: 0.7, worry: 0.6, look: [0, 0.4] });
      const hand = lily.arms[1].hand, hp = new THREE.Vector3(); hand.getWorldPosition(hp);
      if (landedFlake.parent !== hand) hand.add(landedFlake);
      const land = ramp(t, 112.0, 112.4);
      landedFlake.visible = t > 111.6; landedFlake.position.set(0, lerp(0.25, 0.012, land), 0.02);
      const hd = headPos(lily);
      return { cam: [hp.clone().add(v(0.28, -0.05, 0.42)).lerp(hd, lerp(0.0, 0.15, k)), hp.clone().lerp(hd, 0.45)], fov: 36, fill: 0.5, faces: 'set' };
    } },
  { from: 113.95, setup: () => ({ black: true }) },
];

function bridgeCast(t) {
  place(captain, bridgeSet, -0.9, 0, -2.5, Math.PI * 0.95);
  place(crew, bridgeSet, 2.4, 0, -2.6, Math.PI * 1.1);
  pose(captain, { armL: [-0.3, -0.2], armR: [-0.5, 0.25], headX: 0.2 }); pose(crew, { armR: [-0.6, 0.2], headX: 0.25 });
  setFace(crew, t, { wide: 0.6, browUp: 0.4, worry: 0.6, look: [0, -0.4] });
  screens.beacon.spot.intensity = 0; screens.hemi.intensity = 0.9;
}

function corridorLights(t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  for (const l of corridorLit.red) l.intensity = 4 * pulse;
  corridorLit.redM.color.set('#ff2020').multiplyScalar(0.4 + 0.6 * pulse);
  corridorLit.panelM.color.set('#fff4e0').multiplyScalar(0.6);
}

function runCrowd(t, stopAt) {
  const r = rng(101);
  const tt = stopAt == null ? t : Math.min(t, stopAt);
  crowd.forEach((c, i) => {
    const sx = r() * 24 - 12, sz = r() * 18 - 9, ang = r() * 6.283, sp = 2.2 + r() * 2.2;
    let x = sx + Math.sin(ang) * sp * (tt - 46), z = sz + Math.cos(ang) * sp * (tt - 46);
    x = ((x + 12) % 24 + 24) % 24 - 12; z = ((z + 9) % 18 + 18) % 18 - 9;
    place(c, atrium, x, 0, z, ang);
    const moving = stopAt == null || t < stopAt;
    if (moving) { pose(c, { phase: t * sp * 3 + i, amp: 0.9, lean: 0.15 }); setFace(c, t, { wide: 1, open: 0.6, browUp: 1, worry: 1 }); }
    else {
      const up = ramp(t, stopAt + 0.1, stopAt + 0.8);
      pose(c, { headX: -0.55 * up, armL: i % 3 === 0 ? [-0.4 * up, -0.3] : undefined });
      setFace(c, t, { wide: 0.9, open: 0.3 * up, browUp: 0.9, worry: 0.5, look: [0, 0.6 * up] });
    }
  });
}

function stairsCrowd(t) {
  const r = rng(202);
  crowd.forEach((c, i) => {
    if (i >= 18) { c.g.visible = false; return; }
    const lane = (i % 3 - 1) * 0.7 + (r() - 0.5) * 0.2, start = 0.6 - (i / 18) * 13 + r() * 0.4, sp = 0.45 + r() * 0.15;
    const x = start - sp * (t - 97.6);
    place(c, stairs, x, stairY(x), lane, -Math.PI / 2);
    pose(c, { phase: t * 7 + i, amp: 0.55 });
    setFace(c, t, { wide: 0.9, open: 0.2, browUp: 0.8, worry: 0.9 });
  });
}

function doorCrowd(t) {
  const r = rng(303);
  crowd.forEach((c, i) => {
    if (i >= 14) { c.g.visible = false; return; }
    const lane = (r() - 0.5) * 2.0, x0 = -3.6 + (i / 14) * 3.4 + r() * 0.3;
    const x = x0 - 0.25 * Math.sin(t * 2 + i) - 0.15 * (t - 103.6);
    const through = x < -3.9;
    place(c, doorSet, Math.max(x, -6), 0, through ? lane * 0.3 : lane, -Math.PI / 2 + (r() - 0.5) * 0.4);
    pose(c, { phase: t * 6 + i, amp: 0.4, armL: [-0.8 - r() * 0.6, -0.2], armR: [-0.8 - r() * 0.6, 0.2] });
    setFace(c, t, { wide: 1, open: 0.5, browUp: 1, worry: 1 });
  });
}

function hideAll() {
  for (const k in sets) sets[k].visible = false;
  for (const c of ALL_CHARS) c.g.visible = false;
  phone.visible = false;
  landedFlake.visible = false;
  lily.arms[1].hand.rotation.x = 0;
}

function shotAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].from) return [SHOTS[i], SHOTS[i + 1] ? SHOTS[i + 1].from : 120];
  return [SHOTS[0], SHOTS[1].from];
}

window.renderAt = (t) => {
  const [s, end] = shotAt(t);
  const k = clamp((t - s.from) / (end - s.from));
  hideAll();
  ship.position.y = Math.sin(t * 0.5) * 0.25;
  ship.rotation.z = Math.sin(t * 0.37) * 0.004 + (t > 41.8 ? Math.sin(t * 0.6) * 0.006 : 0);
  ship.rotation.x = Math.sin(t * 0.29) * 0.003;
  ship.updateMatrixWorld(true);
  // default faces/poses for anyone visible this shot
  for (const c of ALL_CHARS) { setFace(c, t, {}); pose(c, {}); }
  const turn = ramp(t, 17.0, 17.6) * 0.25;
  const res = s.setup(t, k) || {};
  if (t >= 16.3 && t < 28.45) {
    daniel.head.rotation.y = -turn; lily.head.rotation.y = -turn * 1.2; lily.head.rotation.x = -0.12;
  }
  if (res.black) {
    renderer.setClearColor('#000000'); renderer.clear();
    return renderer.domElement.toDataURL('image/jpeg', 0.93);
  }
  scene.updateMatrixWorld(true);
  const [pos, look] = res.cam;
  if (res.shake) pos.add(v(Math.sin(t * 37) * res.shake, Math.cos(t * 29) * res.shake, Math.sin(t * 23) * res.shake));
  camera.fov = res.fov || 40; camera.updateProjectionMatrix();
  camera.position.copy(pos); camera.lookAt(look);
  fill.intensity = res.fill || 0;
  water.material.uniforms.time.value = t * 0.5;
  composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};

window.SHOT_STARTS = SHOTS.map((s) => s.from);
waterNormals.image ? (window.ready = true) : THREE.DefaultLoadingManager.onLoad = () => { window.ready = true; };
setTimeout(() => { window.ready = true; }, 3000);
