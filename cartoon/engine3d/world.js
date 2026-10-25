// 3D world for "Dead in the Water": ocean, sky, cruise ship, characters, nuclear flashes.
// The page exposes window.renderAt(t) -> JPEG data URL for the frame at narration time t.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
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

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const HORIZON = new THREE.Color('#2c4f86');
scene.fog = new THREE.FogExp2(HORIZON, 0.00011);
const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.02, 20000);
scene.add(camera);

const target = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(WIDTH / 2, HEIGHT / 2), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- lights ----------
const MOON_DIR = new THREE.Vector3(-0.45, 0.32, -1).normalize();
const hemi = new THREE.HemisphereLight('#7f9fe0', '#18243a', 1.1);
scene.add(hemi);
const moonLight = new THREE.DirectionalLight('#b8ccff', 1.6);
moonLight.position.copy(MOON_DIR).multiplyScalar(500);
scene.add(moonLight);
const fill = new THREE.PointLight('#ffe2c4', 0, 4, 1.5);   // soft face light that travels with the camera
camera.add(fill);
fill.position.set(0.3, 0.2, 0);

// ---------- sky ----------
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(9000, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#060d24') }, mid: { value: new THREE.Color('#14295a') },
                horizon: { value: HORIZON }, glow: { value: new THREE.Color('#000000') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 glow; varying vec3 vP;
      void main(){ float h = max(vP.y, 0.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.7, h));
        c += glow * (1.0 - smoothstep(0.0, 0.35, h)) * max(vP.z, 0.0);
        gl_FragColor = vec4(c, 1.0); }`,
  }));
scene.add(sky);

{
  const r = rng(4), pos = [];
  for (let i = 0; i < 2500; i++) {
    const th = r() * Math.PI * 2, y = 0.08 + r() * 0.92, rad = Math.sqrt(1 - y * y);
    pos.push(Math.cos(th) * rad * 8500, y * 8500, Math.sin(th) * rad * 8500);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe8ff', size: 2.2, sizeAttenuation: false, fog: false })));
}

const moon = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), new THREE.MeshBasicMaterial({ color: '#fff6e0', fog: false }));
moon.position.copy(MOON_DIR).multiplyScalar(7500);
scene.add(moon);

function softTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(200,215,255,0.55)', 'rgba(200,215,255,0)'), fog: false, depthWrite: false }));
moonHalo.position.copy(moon.position); moonHalo.scale.set(1800, 1800, 1);
scene.add(moonHalo);

{  // soft clouds
  const r = rng(9), tex = softTexture('rgba(150,170,215,0.35)', 'rgba(150,170,215,0)');
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, opacity: 0.5 + r() * 0.5 }));
    const th = r() * Math.PI * 2;
    s.position.set(Math.cos(th) * 6500, 600 + r() * 1500, Math.sin(th) * 6500);
    s.scale.set(1600 + r() * 1800, 300 + r() * 300, 1);
    scene.add(s);
  }
}

// ---------- ocean ----------
const waterNormals = new THREE.TextureLoader().load('./assets/waternormals.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
const water = new Water(new THREE.PlaneGeometry(20000, 20000), {
  textureWidth: 512, textureHeight: 512, waterNormals,
  sunDirection: MOON_DIR.clone(), sunColor: '#d0dcff', waterColor: '#0b2f55', distortionScale: 3.2, fog: true,
});
water.rotation.x = -Math.PI / 2;
scene.add(water);

// ---------- cruise ship ----------
const ship = new THREE.Group();
scene.add(ship);
const DECK_TOP = 44;

function windowTextures(seed, cols, lit) {
  const r = rng(seed), w = 2048, h = 64;
  const base = document.createElement('canvas'), emis = document.createElement('canvas');
  base.width = emis.width = w; base.height = emis.height = h;
  const b = base.getContext('2d'), e = emis.getContext('2d');
  b.fillStyle = '#eef1f5'; b.fillRect(0, 0, w, h);
  e.fillStyle = '#000'; e.fillRect(0, 0, w, h);
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    const x = i * cw;
    b.fillStyle = '#9aa6b6'; b.fillRect(x, 0, 2, h);             // balcony dividers
    b.fillStyle = '#c9d2de'; b.fillRect(x, h * 0.62, cw, 3);       // balcony rail
    const on = r() < lit;
    const col = on ? ['#ffd48a', '#ffdca0', '#ffd090'][Math.floor(r() * 3)] : '#28344a';
    b.fillStyle = col; b.fillRect(x + cw * 0.18, h * 0.14, cw * 0.64, h * 0.62);
    if (on) { e.fillStyle = col; e.fillRect(x + cw * 0.18, h * 0.14, cw * 0.64, h * 0.62); }
  }
  const tb = new THREE.CanvasTexture(base), te = new THREE.CanvasTexture(emis);
  tb.colorSpace = te.colorSpace = THREE.SRGBColorSpace;
  tb.anisotropy = te.anisotropy = 8;
  return [tb, te];
}

const white = new THREE.MeshStandardMaterial({ color: '#f1f3f6', roughness: 0.55 });
const navy = new THREE.MeshStandardMaterial({ color: '#13254a', roughness: 0.6 });
const windowMats = [];
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
  // portholes
  const port = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 12), new THREE.MeshBasicMaterial({ color: '#ffd896' }), 300);
  let n = 0;
  const m4 = new THREE.Matrix4(), r = rng(5);
  for (const side of [-1, 1]) for (const y of [6.5, 9.5]) for (let x = -132; x < 80; x += 2.8) {
    if (r() < 0.25 || n >= 300) continue;
    m4.makeRotationY(side > 0 ? 0 : Math.PI); m4.setPosition(x, y, side * 17.05);
    port.setMatrixAt(n++, m4);
  }
  port.count = n; ship.add(port);
  // stacked decks with balconies and windows
  for (let k = 0; k < 10; k++) {
    const len = 214 - k * 5, wid = 32 - k * 0.6, cx = -14 - k * 2.5;
    const [tb, te] = windowTextures(20 + k, Math.floor(len / 3.4), 0.9);
    const wm = new THREE.MeshStandardMaterial({ map: tb, emissiveMap: te, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.5 });
    windowMats.push(wm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(len, 3, wid), [white, white, white, white, wm, wm]);
    box.position.set(cx, 14 + k * 3 + 1.5, 0);
    ship.add(box);
  }
  // bridge windows
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 26), new THREE.MeshStandardMaterial({ color: '#0d1a2c', emissive: '#203a5a', emissiveIntensity: 0.6, roughness: 0.2 }));
  bridge.position.set((214 - 8 * 5) / 2 - 14 - 8 * 2.5 + 0.2, 14 + 8 * 3 + 1.5, 0);
  ship.add(bridge);
  // funnel
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, 16, 32), new THREE.MeshStandardMaterial({ color: '#c62f36', roughness: 0.5 }));
  funnel.scale.z = 0.6; funnel.position.set(-70, DECK_TOP + 8, 0); ship.add(funnel);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 2.5, 32), navy);
  cap.scale.z = 0.6; cap.position.set(-70, DECK_TOP + 16, 0); ship.add(cap);
  // lifeboats
  const boats = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1.4, 7, 6, 12), new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.45 }), 40);
  n = 0;
  for (const side of [-1, 1]) for (let x = -95; x < 70; x += 12) {
    m4.makeRotationZ(Math.PI / 2); m4.setPosition(x, 19.5, side * 16.6); boats.setMatrixAt(n++, m4);
  }
  boats.count = n; ship.add(boats);
  // string lights along the top deck
  const bulbGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const cols = ['#ff5a5a', '#ffd45a', '#5aff9a', '#6aa8ff'].map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  for (const z of [-11.5, 11.5]) {
    for (let i = 0; i < 240; i++) {
      const x = -95 + i * 0.75, seg = (x + 95) % 9 / 9;
      const b = new THREE.Mesh(bulbGeo, cols[i % 4]);
      b.position.set(x, DECK_TOP + 4.6 - Math.sin(seg * Math.PI) * 0.7, z);
      ship.add(b);
    }
    for (let x = -95; x <= 85; x += 9) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6), navy);
      pole.position.set(x, DECK_TOP + 2.3, z); ship.add(pole);
    }
  }
  // deck floor (wood) and glass railing near our characters
  const wood = document.createElement('canvas'); wood.width = 512; wood.height = 512;
  const wg = wood.getContext('2d');
  for (let i = 0; i < 32; i++) { wg.fillStyle = i % 2 ? '#8a6a4a' : '#7c5e40'; wg.fillRect(0, i * 16, 512, 15); wg.fillStyle = '#4a3624'; wg.fillRect(0, i * 16 + 15, 512, 1); }
  const wt = new THREE.CanvasTexture(wood); wt.colorSpace = THREE.SRGBColorSpace; wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(20, 2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 24.6), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(-20, DECK_TOP + 0.01, 0); ship.add(floor);
  for (const z of [-12.2, 12.2]) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(180, 1.05), new THREE.MeshStandardMaterial({ color: '#9fc4e0', transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide }));
    glass.position.set(-10, DECK_TOP + 0.55, z); ship.add(glass);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 180, 8), new THREE.MeshStandardMaterial({ color: '#d7dde5', metalness: 0.8, roughness: 0.25 }));
    rail.rotation.z = Math.PI / 2; rail.position.set(-10, DECK_TOP + 1.1, z); ship.add(rail);
  }
  const deckLamp = new THREE.PointLight('#ffcf9a', 30, 14, 1.6);
  deckLamp.position.set(-1, DECK_TOP + 3.4, 10); ship.add(deckLamp);
  const deckLamp2 = new THREE.PointLight('#ffb3c8', 18, 12, 1.6);
  deckLamp2.position.set(3, DECK_TOP + 3.4, 9); ship.add(deckLamp2);
  const shipGlow = new THREE.PointLight('#ffc888', 40, 300, 1);
  shipGlow.position.set(0, 30, 60); ship.add(shipGlow);
}

// ---------- characters ----------
function capsule(r, len, mat) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat); }
function sphere(r, mat, ws = 32) { return new THREE.Mesh(new THREE.SphereGeometry(r, ws, ws), mat); }

function makeCharacter(o) {
  const skin = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.55 });
  const hairM = new THREE.MeshStandardMaterial({ color: o.hair, roughness: 0.75 });
  const top = new THREE.MeshStandardMaterial({ color: o.top, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: o.pants, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1b20', roughness: 0.4 });
  const eyeW = new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.2 });
  const iris = new THREE.MeshStandardMaterial({ color: o.eyes, roughness: 0.2 });
  const pupil = new THREE.MeshBasicMaterial({ color: '#050505' });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const lip = new THREE.MeshStandardMaterial({ color: o.lip, roughness: 0.5 });
  const mouthIn = new THREE.MeshStandardMaterial({ color: '#4a1218', roughness: 0.8 });

  const s = o.scale;
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const hs = o.headScale;
  // legs and shoes
  for (const x of [-0.1, 0.1]) {
    const leg = capsule(0.075 * s, 0.72 * s, pants); leg.position.set(x * s, 0.45 * s, 0); body.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.08 * s, 0.26 * s), dark); shoe.position.set(x * s, 0.04 * s, 0.04 * s); body.add(shoe);
  }
  // torso
  const torso = capsule(0.19 * s, 0.42 * s, top); torso.scale.z = 0.62; torso.position.y = 1.12 * s; body.add(torso);
  if (o.collar) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.02 * s, 8, 24), new THREE.MeshStandardMaterial({ color: o.collar, roughness: 0.7 }));
    collar.rotation.x = Math.PI / 2; collar.position.y = 1.44 * s; body.add(collar);
  }
  // arms on shoulder pivots
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.235 * s, 1.38 * s, 0); body.add(pivot);
    const arm = capsule(0.058 * s, 0.5 * s, top); arm.position.y = -0.3 * s; pivot.add(arm);
    const hand = sphere(0.055 * s, skin, 16); hand.position.y = -0.62 * s; pivot.add(hand);
    pivot.rotation.z = side * 0.08;
    arms.push(pivot);
  }
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.055 * s, 0.12 * s, 16), skin); neck.position.y = 1.48 * s; body.add(neck);
  const head = new THREE.Group(); head.position.y = (1.48 * s) + 0.17 * hs; body.add(head);
  const cranium = sphere(0.12 * hs, skin, 48); cranium.scale.set(1, 1.12, 1.04); head.add(cranium);
  const jaw = sphere(0.095 * hs, skin, 40); jaw.scale.set(0.92, 0.8, 0.95); jaw.position.set(0, -0.05 * hs, 0.012 * hs); head.add(jaw);
  for (const x of [-1, 1]) { const ear = sphere(0.026 * hs, skin, 16); ear.scale.set(0.5, 1, 0.8); ear.position.set(x * 0.118 * hs, -0.005 * hs, 0); head.add(ear); }
  const nose = sphere(0.015 * hs, skin, 20); nose.scale.set(0.85, 1.1, 1); nose.position.set(0, -0.02 * hs, 0.123 * hs); head.add(nose);
  const eyes = [];
  for (const x of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(x * 0.042 * hs, 0.012 * hs, 0.098 * hs); head.add(e);
    const ball = sphere(0.023 * hs, eyeW, 24); e.add(ball);
    const ir = sphere(0.0135 * hs, iris, 20); ir.scale.z = 0.5; ir.position.z = 0.0175 * hs; e.add(ir);
    const pu = sphere(0.0068 * hs, pupil, 16); pu.scale.z = 0.4; pu.position.z = 0.0228 * hs; e.add(pu);
    const sh = sphere(0.0028 * hs, shine, 8); sh.position.set(0.004 * hs, 0.005 * hs, 0.0245 * hs); e.add(sh);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0245 * hs, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin);
    e.add(lid);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(0.0243 * hs, 24, 12, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), skin);
    e.add(lower);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.026 * hs, 0.0042 * hs, 6, 16, Math.PI * 0.55), hairM);
    brow.position.set(x * 0.043 * hs, 0.03 * hs, 0.108 * hs); head.add(brow);
    eyes.push({ e, lid, brow, x });
  }
  const mouth = new THREE.Group(); mouth.position.set(0, -0.05 * hs, 0.113 * hs); head.add(mouth);
  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.022 * hs, 0.0055 * hs, 8, 24), lip); lips.scale.set(1, 0.25, 0.6); mouth.add(lips);
  const inner = sphere(0.02 * hs, mouthIn, 16); inner.scale.set(1, 0.05, 0.4); mouth.add(inner);
  // hair
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.128 * hs, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM);
  cap.scale.set(1.03, 1.12, 1.08); cap.rotation.x = -0.62; cap.position.set(0, 0.02 * hs, -0.018 * hs); head.add(cap);
  if (o.longHair) {
    const back = capsule(0.1 * hs, 0.16 * hs, hairM); back.scale.z = 0.6; back.position.set(0, -0.08 * hs, -0.07 * hs); head.add(back);
    for (const x of [-1, 1]) { const tail = capsule(0.035 * hs, 0.14 * hs, hairM); tail.position.set(x * 0.13 * hs, -0.1 * hs, -0.03 * hs); tail.rotation.z = x * 0.25; head.add(tail); }
  } else {
    const fringe = sphere(0.06 * hs, hairM, 20); fringe.scale.set(1.3, 0.35, 0.7); fringe.position.set(0.02 * hs, 0.118 * hs, 0.05 * hs); fringe.rotation.z = -0.15; head.add(fringe);
  }
  return { g, head, eyes, mouth, lips, inner, arms, hs, blinkSeed: o.blinkSeed };
}

function setFace(c, t, f) {
  // f: {wide 0..1, open 0..1, browUp 0..1, worry 0..1, look:[x,y]}
  const blinkPhase = (t + c.blinkSeed) % 3.7;
  const blink = blinkPhase < 0.12 ? Math.sin(blinkPhase / 0.12 * Math.PI) : 0;
  for (const { e, lid, brow, x } of c.eyes) {
    const open = (1 - blink) * (0.55 + 0.45 * f.wide);
    lid.rotation.x = lerp(1.25, -0.95, open);       // closed -> fully open
    e.rotation.y = (f.look ? f.look[0] : 0) * 0.35;
    e.rotation.x = -(f.look ? f.look[1] : 0) * 0.35;
    brow.position.y = (0.03 + 0.012 * f.browUp) * c.hs;
    brow.rotation.z = Math.PI * 0.225 + x * (-0.18 * f.worry + 0.06);
  }
  c.inner.scale.set(1, lerp(0.05, 0.9, f.open), 0.4);
  c.lips.scale.set(lerp(1, 0.75, f.open), lerp(0.25, 1.1, f.open), 0.6);
}

const daniel = makeCharacter({ scale: 1, headScale: 1.05, skin: '#d9a07c', hair: '#3a2618', top: '#2f5d50', pants: '#2b3446',
                               eyes: '#4a3020', lip: '#b06a5a', collar: '#e8e8e8', blinkSeed: 0.3 });
const lily = makeCharacter({ scale: 0.66, headScale: 0.98, skin: '#e8b694', hair: '#8a4a22', top: '#f2c230', pants: '#3a5aa8',
                             eyes: '#3a6a8a', lip: '#d07a74', longHair: true, blinkSeed: 1.9 });
daniel.g.position.set(-0.1, DECK_TOP, 11.55);
lily.g.position.set(0.72, DECK_TOP, 11.6);
ship.add(daniel.g, lily.g);
// holding hands
daniel.arms[1].rotation.z = 0.32;
lily.arms[0].rotation.z = -0.45;

// ---------- nuclear flashes ----------
export const FLASHES = [
  { t: 16.96, pos: new THREE.Vector3(-1100, 0, 3600) },
  { t: 18.96, pos: new THREE.Vector3(1500, 0, 3100) },
  { t: 21.06, pos: new THREE.Vector3(250, 0, 4300) },
];
const hot = new THREE.Color(1, 0.95, 0.85), fire = new THREE.Color(1, 0.42, 0.12);
for (const f of FLASHES) {
  f.group = new THREE.Group(); f.group.position.copy(f.pos); scene.add(f.group);
  f.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false }));
  f.stem = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ff8040', toneMapped: false, fog: false, transparent: true }));
  f.cap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: '#ff8040', toneMapped: false, fog: false, transparent: true }));
  f.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,200,140,1)', 'rgba(255,120,40,0)'), toneMapped: false, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  f.group.add(f.ball, f.stem, f.cap, f.halo);
  f.light = new THREE.DirectionalLight('#ffd6a8', 0);
  f.light.position.copy(f.pos).normalize().multiplyScalar(500);
  scene.add(f.light);
}

const whiteout = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
whiteout.position.z = -0.1; whiteout.renderOrder = 999; whiteout.scale.set(0.2, 0.3, 1);
camera.add(whiteout);

function updateFlashes(t) {
  let white = 0, glow = 0;
  for (const f of FLASHES) {
    const k = t - f.t;
    const on = k >= 0;
    f.group.visible = on;
    f.light.intensity = 0;
    if (!on) continue;
    const r = 120 + 260 * ease(k / 1.2);
    const cool = ease(k / 2.5);
    f.ball.scale.setScalar(r * (1 - 0.35 * cool));
    f.ball.position.y = 200 * cool + 600 * ease((k - 1.5) / 6);
    f.ball.material.color.copy(hot).lerp(fire, cool).multiplyScalar(lerp(14, 3, cool));
    const sh = ease((k - 0.8) / 5);
    f.stem.visible = sh > 0;
    f.stem.scale.set(90 + 40 * sh, 900 * sh + 1, 90 + 40 * sh);
    f.stem.position.y = 450 * sh;
    f.stem.material.color.copy(fire).multiplyScalar(2.2 * (1 - 0.4 * sh));
    f.stem.material.opacity = 0.85;
    f.cap.visible = sh > 0;
    f.cap.scale.set(260 + 260 * sh, 150 + 120 * sh, 260 + 260 * sh);
    f.cap.position.y = 900 * sh + 60;
    f.cap.material.color.copy(fire).multiplyScalar(2.6 * (1 - 0.3 * sh));
    f.cap.material.opacity = 0.9;
    f.halo.scale.setScalar(2500 + 1500 * ease(k / 2));
    f.halo.position.y = f.cap.position.y * 0.6;
    f.halo.material.opacity = 0.35 + 0.65 * Math.exp(-k * 1.4);
    const burst = Math.exp(-k * 2.6) * clamp(k / 0.05);
    f.light.intensity = 3.5 * burst + 0.35;
    f.light.color.copy(hot).lerp(fire, ease(k / 0.8));
    white = Math.max(white, 0.9 * Math.exp(-k * 5) * clamp(k / 0.05));
    glow += 0.5 + 1.5 * burst;
  }
  whiteout.material.opacity = white;
  sky.material.uniforms.glow.value.setRGB(0.55, 0.22, 0.08).multiplyScalar(Math.min(glow, 2.5));
}

// ---------- shots ----------
const v = (x, y, z) => new THREE.Vector3(x, y, z);
function shipToWorld(p) { return ship.localToWorld(p.clone()); }
const DAN_HEAD = () => shipToWorld(v(-0.1, DECK_TOP + 1.71, 11.55));

// camera in front of a character's face, slightly to one side
function faceCam(c, dist, side) {
  const h = new THREE.Vector3(), q = new THREE.Quaternion();
  c.head.getWorldPosition(h); c.head.getWorldQuaternion(q);
  const fwd = v(0, 0, 1).applyQuaternion(q), right = v(1, 0, 0).applyQuaternion(q);
  return [h.clone().addScaledVector(fwd, dist).addScaledVector(right, side * dist).add(v(0, 0.02, 0)), h.clone().add(v(0, -0.01, 0))];
}

export const SHOTS = [
  { from: 13.1, to: 16.3, fov: 40, fill: 0,
    cam: (k) => [v(lerp(330, 250, k), lerp(46, 40, k), lerp(330, 300, k)), v(-10, 26, 0)],
    face: () => ({}) },
  { from: 16.3, to: 18.7, fov: 38, fill: 0,
    cam: (k) => [shipToWorld(v(0.25, DECK_TOP + 2.0, lerp(7.6, 8.3, k))), shipToWorld(v(0.3, DECK_TOP + 0.2, 40))],
    face: () => ({}) },
  { from: 18.7, to: 20.0, fov: 26, fill: 0.8,
    cam: (k) => { const h = DAN_HEAD(); return [h.clone().add(v(0.12, 0.02, lerp(1.3, 1.1, k))), h.clone().add(v(0, -0.04, 0))]; },
    face: (t) => ({ dan: { wide: ramp(t, 18.98, 19.2), open: 0.6 * ramp(t, 19.05, 19.4), browUp: ramp(t, 18.98, 19.2), worry: 0.3 } }) },
  { from: 20.0, to: 22.2, fov: 42, fill: 0,
    cam: (k) => [shipToWorld(v(0.3, DECK_TOP + lerp(4.2, 3.8, k), lerp(3.5, 5, k))), shipToWorld(v(0.3, DECK_TOP - 12, 400))],
    face: () => ({}) },
  { from: 22.2, to: 25.0, fov: 30, fill: 0.8,
    cam: (k) => faceCam(lily, lerp(0.85, 0.7, k), 0.15),
    face: (t) => ({ lily: { wide: 0.85, open: 0.35 + 0.05 * Math.sin(t * 9), browUp: 0.9, worry: 1, look: [0.15, 0.05] } }) },
];

function shotAt(t) {
  for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].from) return SHOTS[i];
  return SHOTS[0];
}

window.renderAt = (t) => {
  const s = shotAt(t);
  const k = clamp((t - s.from) / (s.to - s.from));
  ship.position.y = Math.sin(t * 0.5) * 0.25;
  ship.rotation.z = Math.sin(t * 0.37) * 0.004;
  ship.rotation.x = Math.sin(t * 0.29) * 0.003;
  ship.updateMatrixWorld(true);
  const turn = ramp(t, 17.0, 17.6) * 0.25;
  daniel.head.rotation.y = -turn; lily.head.rotation.y = -turn * 1.2; lily.head.rotation.x = -0.12;
  ship.updateMatrixWorld(true);
  const [pos, look] = s.cam(k);
  camera.fov = s.fov; camera.updateProjectionMatrix();
  camera.position.copy(pos); camera.lookAt(look);
  fill.intensity = s.fill;
  const faces = s.face(t);
  setFace(daniel, t, faces.dan || { wide: 0.2, open: 0, browUp: 0, worry: 0 });
  setFace(lily, t, faces.lily || { wide: 0.3, open: 0, browUp: 0.1, worry: 0 });
  water.material.uniforms.time.value = t * 0.5;
  updateFlashes(t);
  composer.render();
  return renderer.domElement.toDataURL('image/jpeg', 0.93);
};

waterNormals.image ? (window.ready = true) : THREE.DefaultLoadingManager.onLoad = () => { window.ready = true; };
setTimeout(() => { window.ready = true; }, 3000);
