/* v14: Level 28 – Cat Chase (whole family). An agar.io-style arena of cute cartoon cats.
   Your cat follows your finger (drag or tap-to-move). Food balls: +1 ("8 + 1 = 9").
   Touch a smaller cat, then TAP fast: each tap is one bite and moves 1 point ("5 − 2 = 3", "8 + 2 = 10", spoken).
   Bigger cats bite you too (you never drop below 1; at 1 you poof to safety). A cat at 0 poofs.
   Ramp: 0–30 s sums ≤ 10, 30–60 s single digits into the teens, then numbers grow toward 100. 100 = you win.
   Numbers are spoken by joining Kokoro clips (cn_0..cn_100, plus/minus/equals) back-to-back; one sentence at a
   time, only the newest waiting sentence is kept and it is dropped if it gets stale.
   Debug: ?level=28 (tap anywhere), &t=35 (start the clock at 35 s), &n=8 (your size), &cats=3, &voice=m|f. */
(() => {
'use strict';
const CD = window.CAT_DATA || { lines: {} };
const { Sfx, Music, Voice, VOICE_DATA, Speech } = window.SharkCore;
const P = new URLSearchParams(location.search);
const rnd = (a, b) => a + Math.random() * (b - a), irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FONT = s => `700 ${Math.round(s)}px 'Fredoka', ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
const MINUS = '−';

/* ===== spoken math: clips joined back-to-back ===== */
const CV = {
  busy: false, q: null, token: 0, srcs: [], log: [], trims: {}, gender: 'f', dropped: 0,
  key(it) { return typeof it === 'number' ? 'cn_' + it : /^cc_/.test(it) ? it : 'cn_' + it; },
  text(items) { return items.map(i => i === '.' ? '.' : typeof i === 'number' ? (CD.lines['cn_' + i] || {}).text : (CD.lines[this.key(i)] || {}).text).join(' ').replace(/ \./g, '.'); },
  trim(k) {
    if (this.trims[k]) return this.trims[k];
    return (this.trims[k] = Voice.decode(k).then(b => {
      if (!b) return null; const d = b.getChannelData(0), sr = b.sampleRate; let i0 = 0, i1 = d.length - 1;
      while (i0 < d.length && Math.abs(d[i0]) < 0.015) i0++; while (i1 > i0 && Math.abs(d[i1]) < 0.015) i1--;
      return { b, s: Math.max(0, i0 / sr - 0.008), d: Math.max(0.05, (i1 - i0) / sr + 0.025) };
    }));
  },
  warm() { const g = ['', '__m']; for (let n = 0; n <= 100; n++) g.forEach(s => this.trim('cn_' + n + s)); ['plus', 'minus', 'equals'].forEach(w => g.forEach(s => this.trim('cn_' + w + s))); },
  say(items, opt = {}) {
    const job = { items, t: performance.now(), text: this.text(items), tag: opt.tag || '' };
    if (this.busy) { if (opt.ifIdle) { this.dropped++; return false; } if (this.q) this.dropped++; this.q = job; return true; }
    this.run(job); return true;
  },
  stop() { this.token++; this.srcs.forEach(s => { try { s.onended = null; s.stop(0); } catch (_) {} }); this.srcs = []; this.busy = false; this.q = null; Music.duck(false); },
  run(job) {
    Voice.stop(); this.busy = true; const tok = ++this.token;
    const f = Voice.forceGender; this.gender = f === 'm' || f === 'f' ? f : (Math.random() < 0.5 ? 'm' : 'f');
    const suf = this.gender === 'm' ? '__m' : '';
    const keys = job.items.map(i => i === '.' ? null : this.key(i) + suf);
    const done = () => { if (tok !== this.token) return; this.busy = false; this.srcs = []; Music.duck(false); const nx = this.q; this.q = null;
      if (nx) { if (performance.now() - nx.t < 3500) this.run(nx); else this.dropped++; } };
    let settled = false;
    const fallback = () => { if (settled) return; settled = true; if (tok !== this.token) return; this.log.push({ text: job.text, mode: 'speech', tag: job.tag, at: S.t }); Speech.say(job.text, done); };
    const timer = setTimeout(fallback, 1800);
    Promise.all(keys.map(k => k ? this.trim(k) : Promise.resolve('gap'))).then(bs => {
      if (settled || tok !== this.token) return; if (!Sfx.ctx || bs.some(b => !b)) return fallback();
      settled = true; clearTimeout(timer);
      const c = Sfx.ctx; if (c.state !== 'running') c.resume();
      let t = c.currentTime + 0.04, lastSrc = null;
      bs.forEach(b => { if (b === 'gap') { t += 0.28; return; } const s = c.createBufferSource(); s.buffer = b.b; s.connect(Sfx.voiceOut); s.start(t, b.s, b.d); t += b.d + 0.02; this.srcs.push(s); lastSrc = s; });
      Music.duck(true); this.log.push({ text: job.text, mode: 'clip', tag: job.tag, at: S.t, len: +(t - c.currentTime).toFixed(2), gender: this.gender });
      if (lastSrc) lastSrc.onended = done; else done();
    });
  },
};

/* ===== DOM ===== */
const css = document.createElement('style');
css.textContent = `
#clayer{position:fixed;inset:0;z-index:26;display:none;touch-action:none;user-select:none;-webkit-user-select:none;font-family:var(--font,system-ui);animation:v13in .38s cubic-bezier(.2,.8,.2,1)}
#clayer canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
#chud{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:8px;padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) 4px max(10px,env(safe-area-inset-left));pointer-events:none}
#chud .sb{background:var(--glass,rgba(255,255,255,.85));border:1px solid rgba(255,255,255,.9);box-shadow:var(--shadow,0 3px 8px rgba(0,0,0,.25));border-radius:18px;padding:5px 12px;font-weight:700;font-size:20px;color:#3b2266;white-space:nowrap}
#cgoal{display:flex;align-items:center;gap:8px}#cgoal i{display:block;width:min(22vw,160px);height:12px;border-radius:8px;background:rgba(60,30,120,.15);overflow:hidden}
#cgoal i b{display:block;height:100%;width:0;border-radius:8px;background:linear-gradient(90deg,#ff6fa5,#ffcf4d 35%,#5fe08a 70%,#4dc4ff);transition:width .3s}
#chud .sp{flex:1}
#chud button{pointer-events:auto;width:54px;height:54px;border-radius:50%;border:1px solid #fff;background:linear-gradient(180deg,#fff,#eef0ff);font-size:28px;box-shadow:var(--shadow,0 3px 8px rgba(0,0,0,.25)),inset 0 -2px 0 rgba(60,40,140,.12);flex:0 0 auto;cursor:pointer;touch-action:manipulation;transition:transform .12s}
#chud button:active{transform:scale(.9)}
#cwin{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(circle,rgba(255,240,180,.25),rgba(40,10,70,.55));padding:max(64px,env(safe-area-inset-top)) 10px 10px}
#cwin h2{margin:0;font-size:min(11vmin,80px);font-weight:700;color:#fff;text-shadow:0 3px 0 rgba(120,40,160,.6),0 10px 30px rgba(0,0,0,.35);text-align:center}
#cwin div{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
@media (max-height:500px){#chud .sb{font-size:16px;padding:3px 9px}#chud button{width:44px;height:44px;font-size:22px}#cgoal i{width:min(18vw,120px)}}
`;
document.head.appendChild(css);
const layer = document.createElement('div'); layer.id = 'clayer';
layer.innerHTML = `<canvas id="ccv"></canvas><div id="chud"><span class="sb" id="csize">🐱 1</span><span class="sb" id="cgoal">🏆<i><b></b></i>100</span><span class="sp"></span><button id="cmute" aria-label="Music">🎵</button><button id="cmenu" aria-label="Menu">🏠</button></div>
<div id="cwin"><h2>100! 🎉<br>Biggest cat!</h2><div><button class="rbtn g" id="cagain">Play again</button><button class="rbtn b" id="chome">Menu</button></div></div>`;
document.body.appendChild(layer);
const $c = id => document.getElementById(id);
const cv = $c('ccv'), g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); arena(); }
addEventListener('resize', () => { if (S.active) resize(); });

/* ===== state ===== */
const S = window.CatChase = {
  active: false, state: 'off', t: 0, cats: [], food: [], fx: [], floats: [], log: [], bite: null, slow: 0, phase: -1, A: null, CV,
  nextId: 1, poofs: 0, won: false,
};
const PALS = [
  { body: '#ffb35c', dark: '#e07a1f', belly: '#ffe3bd', stripe: 1 },          // orange tabby
  { body: '#9aa4b8', dark: '#6b7489', belly: '#e6e9f2', stripe: 1 },          // gray tabby
  { body: '#4a4458', dark: '#2c2838', belly: '#8a8398' },                      // black cat
  { body: '#fff7ee', dark: '#e3d3c2', belly: '#ffffff', spots: '#f0a050' },    // calico-ish
  { body: '#c9a0ff', dark: '#9a6be0', belly: '#efe2ff' },                      // lilac
  { body: '#7fd6c2', dark: '#3fa891', belly: '#dff7f1' },                      // mint
];
const ME = { body: '#ff8fbf', dark: '#e0558f', belly: '#ffe1ee', me: 1 };
function arena() {
  const hb = $c('chud').getBoundingClientRect();
  const m = Math.max(8, Math.min(W, H) * 0.012);
  S.A = { l: m, r: W - m, t: Math.max(hb.bottom + 4, 60), b: H - m };
  S.unit = Math.min(W, H);
}
const radius = n => S.unit * (0.042 + 0.1 * Math.sqrt(clamp(n, 0, 100) / 100));
const phaseAt = t => t < 30 ? 0 : t < 60 ? 1 : 2;
const capAt = t => t < 30 ? 10 : t < 60 ? 19 : Math.min(100, Math.round(19 + (t - 60) * 1.25));
const aiCap = () => Math.min(99, S.phase === 2 ? capAt(S.t) : S.phase === 1 ? 19 : 10);

function mkCat(n, me) {
  const r = radius(n), A = S.A;
  return { id: S.nextId++, n, me: !!me, pal: me ? ME : pick(PALS), x: rnd(A.l + r, A.r - r), y: rnd(A.t + r, A.b - r), vx: 0, vy: 0, dir: 1,
    wob: rnd(0, 6), shield: me ? 2 : 1.2, flee: 0, shake: 0, chomp: 0, grow: 0, born: S.t, alive: true, tx: null, ty: null, want: rnd(0, 6) };
}
function spawnSpot(c) {   // far from the player and other cats
  const A = S.A; let best = null, bd = -1;
  for (let i = 0; i < 14; i++) { const r = radius(c.n), x = rnd(A.l + r, A.r - r), y = rnd(A.t + r, A.b - r);
    const d = Math.min(...S.cats.filter(o => o !== c && o.alive).map(o => Math.hypot(o.x - x, o.y - y) - radius(o.n)), 9e9); if (d > bd) { bd = d; best = { x, y }; } }
  c.x = best.x; c.y = best.y;
}
function aiSize() {
  const p = S.me.n, cap = aiCap();
  if (S.phase < 2) { const smaller = p > 1 && (Math.random() < 0.6 || p >= 9); return smaller ? irnd(1, Math.min(9, p - 1)) : irnd(Math.min(9, p + 1), 9); }
  const smaller = Math.random() < 0.6;
  return clamp(smaller ? Math.round(p * rnd(0.3, 0.8)) : Math.round(p * rnd(1.1, 1.45)), 1, cap);
}
function addAI() { const c = mkCat(aiSize()); spawnSpot(c); S.cats.push(c); fx('poof', c.x, c.y, radius(c.n)); return c; }
function addFood() { const A = S.A, r = S.unit * 0.022;
  for (let i = 0; i < 10; i++) { const x = rnd(A.l + r * 2, A.r - r * 2), y = rnd(A.t + r * 2, A.b - r * 2);
    if (S.cats.every(c => Math.hypot(c.x - x, c.y - y) > radius(c.n) + r * 3)) { S.food.push({ x, y, r, col: pick(['#ff6fa5', '#ffcf4d', '#5fe08a', '#4dc4ff', '#b18cff', '#ff9a4d']), t: 0 }); return; } } }
const nCats = () => clamp(parseInt(P.get('cats'), 10) || (S.unit < 500 ? 3 : 4), 1, 6);
const nFood = () => S.unit < 500 ? 7 : 9;

/* ===== start / end ===== */
function start() {
  Voice.stop(); CV.stop(); Sfx.unlock();
  for (const [k, v] of Object.entries(CD.lines)) if (/^cc_/.test(k) && !VOICE_DATA.lines[k]) VOICE_DATA.lines[k] = v;
  document.getElementById('start').classList.add('hidden');
  if (window.Runner) window.Runner.active = false;
  layer.style.display = 'block'; $c('cwin').style.display = 'none'; resize();
  const t0 = parseFloat(P.get('t')) || 0;
  Object.assign(S, { active: true, state: 'play', t: t0, cats: [], food: [], fx: [], floats: [], log: [], bite: null, slow: 0, phase: phaseAt(t0), poofs: 0, won: false, passive: 0, target: null, down: false });
  const n0 = clamp(parseInt(P.get('n'), 10) || (S.phase === 0 ? 3 : S.phase === 1 ? 8 : capAt(t0) - 12), 1, 99);
  S.me = mkCat(n0, true); S.me.x = (S.A.l + S.A.r) / 2; S.me.y = (S.A.t + S.A.b) / 2; S.cats.push(S.me);
  for (let i = 0; i < nCats(); i++) addAI();
  for (let i = 0; i < nFood(); i++) addFood();
  CV.warm(); Music.start('main');
  CV.say(['cc_intro'], { tag: 'intro' });
  hud();
}
function win() {
  S.state = 'win'; S.won = true; CV.stop(); CV.say(['cc_win'], { tag: 'win' }); Sfx.victory && Sfx.victory(); Music.start('party');
  for (let i = 0; i < 160; i++) setTimeout(() => confetti(3), i * 18);
  setTimeout(() => { if (S.state === 'win') $c('cwin').style.display = 'flex'; }, 1600);
}
$c('cagain').addEventListener('click', e => { e.stopPropagation(); P.delete('t'); P.delete('n'); start(); });
$c('chome').addEventListener('click', e => { e.stopPropagation(); CV.stop(); Voice.stop(); location.href = location.pathname; });
$c('cmenu').addEventListener('click', e => { e.stopPropagation(); CV.stop(); Voice.stop(); location.href = location.pathname; });
$c('cmute').addEventListener('click', e => { e.stopPropagation(); Sfx.unlock(); Music.setMuted(!Music.muted); hud(); });
function hud() {
  $c('csize').textContent = '🐱 ' + (S.me ? S.me.n : 1);
  $c('cgoal').querySelector('b').style.width = (S.me ? S.me.n : 0) + '%';
  $c('cmute').textContent = Music.muted ? '🔇' : '🎵';
}

/* ===== input ===== */
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); Sfx.unlock(); if (!S.active) return;
  if (S.state === 'bite') return biteTap(e.clientX, e.clientY);
  if (S.state !== 'play') return;
  S.down = true; S.target = { x: e.clientX, y: e.clientY }; fx('ring', e.clientX, e.clientY, 18);
});
cv.addEventListener('pointermove', e => { if (S.down && S.state === 'play') S.target = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { S.down = false; });
addEventListener('pointercancel', () => { S.down = false; });

/* ===== math events ===== */
function floatText(text, x, y, kind, big) {
  const size = clamp(S.unit * (big ? 0.075 : 0.05), big ? 26 : 18, big ? 58 : 36);
  g.font = FONT(size); const w = g.measureText(text).width + size * 0.9, h = size * 1.35;
  const A = S.A; let fx0 = clamp(x - w / 2, A.l, A.r - w), fy = clamp(y - h / 2, A.t + 2, A.b - h);
  const live = S.floats.filter(f => f.t < f.life);
  for (let k = 0; k < 10 && live.some(f => ovr(f.rect(), { x: fx0, y: fy, w, h }, 6)); k++) { fy += (k % 2 ? -1 : 1) * h * (k + 1) * 0.6; fy = clamp(fy, A.t + 2, A.b - h); if (k > 5) fx0 = clamp(fx0 + (k % 2 ? w : -w) * 0.6, A.l, A.r - w); }
  const f = { text, x: fx0, y: fy, w, h, size, kind, big, t: 0, life: big ? 2.8 : 1.6, rise: 0, rect() { return { x: this.x, y: this.y - this.rise, w: this.w, h: this.h }; } };
  S.floats.push(f); return f;
}
const ovr = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
function mathEvent(big, small, k, spoken) {   // big ate k from small
  const sb = small.n, bb = big.n; small.n = sb - k; big.n = bb + k; big.grow = 1;
  const fs = `${sb} ${MINUS} ${k} = ${small.n}`, fb = `${bb} + ${k} = ${big.n}`;
  const player = big.me || small.me;
  floatText(fs, small.x, small.y - radius(sb) - S.unit * 0.05, 'minus', player);
  floatText(fb, big.x, big.y - radius(big.n) - S.unit * 0.05, 'plus', player);
  S.log.push({ t: +S.t.toFixed(1), phase: S.phase, small: fs, big: fb, me: big.me ? 'big' : small.me ? 'small' : '' });
  if (player) { S.slow = 1.3; if (spoken !== false) CV.say([sb, 'minus', k, 'equals', small.n, '.', bb, 'plus', k, 'equals', big.n], { tag: 'bite' }); }
  if (small.n <= 0) poof(small);
  hud(); if (S.me.n >= 100) win();
}
function poof(c) { c.alive = false; S.poofs++; fx('poof', c.x, c.y, radius(Math.max(c.n, 3)) * 1.4); Sfx.poof && Sfx.poof(); if (!c.me) setTimeout(() => { if (S.active && S.state !== 'win') addAI(); }, 2200); }
function eat(c, f) {
  if (c.n >= (c.me ? capAt(S.t) : S.phase < 2 ? 9 : aiCap())) return false;   // AI cats stay single digits for the first minute
  const a = c.n; c.n++; c.grow = 1; fx('crumbs', f.x, f.y, f.r, f.col);
  if (c.me) { Sfx.pop && Sfx.pop(); floatText(`${a} + 1 = ${c.n}`, c.x, c.y - radius(c.n) - S.unit * 0.04, 'plus', false); S.log.push({ t: +S.t.toFixed(1), phase: S.phase, food: `${a} + 1 = ${c.n}` });
    CV.say([a, 'plus', 1, 'equals', c.n], { tag: 'food', ifIdle: true }); hud(); if (c.n >= 100) win(); }
  return true;
}
/* you bite: engagement until the victim flees */
function startBite(v) {
  const me = S.me, cap = capAt(S.t);
  const room = cap - me.n; if (room <= 0) { me.shield = 0.6; push(me, v, 1); popMsg('Full! Bigger numbers soon', me.x, me.y - radius(me.n) - 20); return; }
  const hold = S.phase === 0 ? irnd(2, 4) : S.phase === 1 ? irnd(2, 5) : irnd(3, 8);
  S.bite = { v, k: 0, max: Math.min(v.n, room, hold), last: S.t, t0: S.t, base: { me: me.n, v: v.n } };
  S.state = 'bite'; S.target = null; Sfx.boop && Sfx.boop();
}
function biteTap() {
  const b = S.bite; if (!b) return; b.k++; b.last = S.t; S.me.chomp = 1; b.v.shake = 0.3; Sfx.chomp && Sfx.chomp();
  fx('bite', (S.me.x + b.v.x) / 2, (S.me.y + b.v.y) / 2, 16); popMsg('CHOMP!', b.v.x + rnd(-20, 20), b.v.y - radius(b.v.n) * 0.6, 0.6);
  if (b.k >= b.max) endBite();
}
function endBite() {
  const b = S.bite; if (!b) return; S.bite = null; S.state = 'play';
  const me = S.me, v = b.v;
  if (b.k > 0) { me.n = b.base.me; v.n = b.base.v; mathEvent(me, v, b.k); }
  if (v.alive) { v.flee = 2.2; v.shield = 2.2; push(v, me, 1.6); }
  me.shield = Math.max(me.shield, 0.8);
}
function aiBitesMe(ai) {
  const me = S.me;
  if (me.n <= 1) { respawnMe(); return; }
  const cap = aiCap(); const k = Math.min(irnd(1, S.phase === 2 ? 4 : 3), me.n - 1, Math.max(0, cap - ai.n));
  if (k <= 0) { push(me, ai, 1.4); me.shield = 1.2; return; }
  ai.chomp = 1; Sfx.chomp && Sfx.chomp(); me.shake = 0.4; mathEvent(ai, me, k); me.shield = 2.6; ai.flee = 1.2; ai.shield = 1.5; push(me, ai, 1.8); S.target = null;
  CV.q === null && null;
}
function respawnMe() {
  const me = S.me; fx('poof', me.x, me.y, radius(me.n) * 1.3); spawnSpot(me); me.shield = 3; S.target = null;
  popMsg('Safe! 💖', me.x, me.y - radius(me.n) - 24); CV.say(['cc_bitten'], { tag: 'respawn', ifIdle: true }); S.log.push({ t: +S.t.toFixed(1), respawn: 1 });
}
function aiBitesAI(a, b) {   // a bigger
  const k = Math.min(irnd(1, 3), b.n, Math.max(0, aiCap() - a.n)); if (k <= 0) { push(b, a, 1); return; }
  a.chomp = 1; mathEvent(a, b, k, false); if (b.alive) { b.flee = 1.8; b.shield = 1.8; push(b, a, 1.5); }
}
function push(c, from, s) { const dx = c.x - from.x, dy = c.y - from.y, d = Math.hypot(dx, dy) || 1; const sp = S.unit * 0.9 * s; c.vx = dx / d * sp; c.vy = dy / d * sp; }
function popMsg(text, x, y, life = 1.2) { S.fx.push({ type: 'msg', text, x, y, t: 0, life }); }

/* ===== simulation ===== */
function speedOf(c) { const base = S.unit * (c.me ? 0.42 : 0.2) * (1.15 - 0.45 * Math.sqrt(c.n / 100)); return base * (c.flee > 0 ? 1.5 : 1); }
function tick(dt) {
  if (S.state === 'win') { S.cats.forEach(c => { c.wob += dt * 6; }); return; }
  const prevPhase = S.phase; S.t += dt; S.phase = phaseAt(S.t);
  if (S.phase !== prevPhase) { CV.say([S.phase === 1 ? 'cc_teens' : 'cc_grow'], { tag: 'phase' }); popMsg(S.phase === 1 ? 'Bigger numbers! 🔟' : 'Cats are growing! 📈', W / 2, S.A.t + 60, 2.2);
    if (S.phase === 1) S.cats.forEach(c => { if (!c.me && c.n > 9) c.n = irnd(5, 9); }); }
  const sf = S.state === 'bite' ? 0 : S.slow > 0 ? 0.3 : 1; S.slow = Math.max(0, S.slow - dt);
  const A = S.A, me = S.me;
  if (S.state === 'bite') { const b = S.bite; if (!b.v.alive || S.t - b.last > (b.k ? 1.4 : 2.6)) endBite(); }
  // passive growth after 60 s
  if (S.phase === 2) { S.passive += dt; if (S.passive > 2.6) { S.passive = 0; const cap = capAt(S.t);
    S.cats.forEach(c => { if (!c.alive || c.n >= (c.me ? cap : aiCap())) return; c.n++; c.grow = 1; if (c.me) { floatText(`${c.n - 1} + 1 = ${c.n}`, c.x, c.y - radius(c.n) - S.unit * 0.04, 'plus', false); hud(); if (c.n >= 100) win(); } }); } }
  for (const c of S.cats) {
    if (!c.alive) continue;
    c.wob += dt * (2 + Math.hypot(c.vx, c.vy) / 60); c.shield = Math.max(0, c.shield - dt); c.flee = Math.max(0, c.flee - dt);
    c.shake = Math.max(0, c.shake - dt); c.chomp = Math.max(0, c.chomp - dt * 3); c.grow = Math.max(0, c.grow - dt * 2.5);
    let ax = 0, ay = 0; const sp = speedOf(c) * sf;
    if (c.me) { if (S.target) { const dx = S.target.x - c.x, dy = S.target.y - c.y, d = Math.hypot(dx, dy); if (d > 6) { ax = dx / d * Math.min(1, d / 40); ay = dy / d * Math.min(1, d / 40); } else if (!S.down) S.target = null; } }
    else {
      const R = S.unit * 0.42; let thr = null, prey = null, td = 9e9, pd = 9e9;
      for (const o of S.cats) { if (o === c || !o.alive) continue; const d = Math.hypot(o.x - c.x, o.y - c.y);
        if (o.n > c.n && d < R && d < td) { td = d; thr = o; }
        if (o.n < c.n && o.shield <= 0 && d < R * 1.2 && d < pd && c.flee <= 0) { pd = d; prey = o; } }
      let tx, ty;
      if (thr && (c.flee > 0 || td < R * 0.7)) { tx = c.x - (thr.x - c.x); ty = c.y - (thr.y - c.y); }
      else if (prey) { tx = prey.x; ty = prey.y; }
      else { let fd = 9e9, ff = null; for (const f of S.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < fd) { fd = d; ff = f; } }
        if (ff && fd < S.unit * 0.5) { tx = ff.x; ty = ff.y; } else { c.want += dt * rnd(-1, 1); tx = c.x + Math.cos(c.want) * 100; ty = c.y + Math.sin(c.want) * 100; } }
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d;
      // stay inside: steer away from walls
      const r = radius(c.n), m = r + 30; if (c.x < A.l + m) ax += 1; if (c.x > A.r - m) ax -= 1; if (c.y < A.t + m) ay += 1; if (c.y > A.b - m) ay -= 1;
      const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l; if (prey === me) { ax *= 0.85; ay *= 0.85; }
    }
    const k = Math.min(1, dt * 6); c.vx += (ax * sp - c.vx) * k; c.vy += (ay * sp - c.vy) * k;
    c.x += c.vx * dt * (sf || 0); c.y += c.vy * dt * (sf || 0);
    const r = radius(c.n); c.x = clamp(c.x, A.l + r, A.r - r); c.y = clamp(c.y, A.t + r * 1.1, A.b - r * 0.9);
    if (Math.abs(c.vx) > 8) c.dir = c.vx > 0 ? 1 : -1;
  }
  if (sf === 0) return;
  // food
  for (const c of S.cats) { if (!c.alive) continue; const r = radius(c.n);
    for (let i = S.food.length - 1; i >= 0; i--) { const f = S.food[i]; if (Math.hypot(f.x - c.x, f.y - c.y) < r * 0.9 + f.r) { if (eat(c, f)) { S.food.splice(i, 1); setTimeout(() => S.active && addFood(), rnd(600, 1600)); } } } }
  S.food.forEach(f => f.t += dt);
  // contacts
  const live = S.cats.filter(c => c.alive);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j], ra = radius(a.n), rb = radius(b.n), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    if (d > (ra + rb) * 0.86) continue;
    if (S.state !== 'play') break;
    const big = a.n > b.n ? a : b.n > a.n ? b : null, small = big === a ? b : a;
    if (big && small.shield <= 0 && big.flee <= 0) {
      if (big.me) { startBite(small); return; }
      if (small.me) { aiBitesMe(big); return; }
      aiBitesAI(big, small); continue;
    }
    const ov = (ra + rb) * 0.86 - d; a.x -= dx / d * ov / 2; a.y -= dy / d * ov / 2; b.x += dx / d * ov / 2; b.y += dy / d * ov / 2;   // soft bump
  }
  S.cats = S.cats.filter(c => c.alive || c.me);
}

/* ===== drawing ===== */
function bg() {
  const A = S.A, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#bfe8ff'); gr.addColorStop(1, '#e9f7ff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // soft rug arena
  const rr = Math.min(28, S.unit * 0.05); g.save(); g.shadowColor = 'rgba(40,60,120,.25)'; g.shadowBlur = 20; g.shadowOffsetY = 6;
  const fl = g.createLinearGradient(0, A.t, 0, A.b); fl.addColorStop(0, '#c6f0b8'); fl.addColorStop(1, '#9fdc93');
  g.fillStyle = fl; g.beginPath(); g.roundRect(A.l, A.t, A.r - A.l, A.b - A.t, rr); g.fill(); g.restore();
  g.save(); g.beginPath(); g.roundRect(A.l, A.t, A.r - A.l, A.b - A.t, rr); g.clip();
  g.fillStyle = 'rgba(255,255,255,.18)'; const s = S.unit * 0.09;
  for (let y = A.t; y < A.b; y += s) for (let x = A.l + ((y / s) % 2 ? s / 2 : 0); x < A.r; x += s) { g.beginPath(); g.arc(x, y, s * 0.12, 0, 6.283); g.fill(); }
  const lt = g.createRadialGradient(W * 0.3, A.t, 0, W * 0.3, A.t, Math.max(W, H) * 0.8); lt.addColorStop(0, 'rgba(255,255,230,.35)'); lt.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lt; g.fillRect(0, 0, W, H); g.restore();
}
function drawFood(f) {
  const bob = Math.sin(f.t * 3 + f.x) * 2, r = f.r * Math.min(1, f.t * 4 + 0.2);
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(f.x, f.y + f.r * 0.9, r * 0.9, r * 0.35, 0, 0, 6.283); g.fill();
  const gr = g.createRadialGradient(f.x - r * 0.35, f.y + bob - r * 0.4, r * 0.1, f.x, f.y + bob, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, f.col); gr.addColorStop(1, shade(f.col, -0.25));
  g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y + bob, r, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(f.x, f.y + bob, r * 0.6, 0.5, 2.2); g.stroke();   // yarn line
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255; const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255); return `rgb(${f(r)},${f(gg)},${f(b)})`; }
function drawCat(c) {
  const r0 = radius(c.n), r = r0 * (1 + c.grow * 0.12), p = c.pal;
  const sx = c.shake > 0 ? Math.sin(S.t * 60) * 3 : 0, x = c.x + sx, y = c.y + Math.sin(c.wob) * r * 0.03;
  if (c.shield > 0 && c.me && Math.floor(S.t * 8) % 2) g.globalAlpha = 0.55;
  g.save(); g.translate(x, y);
  // shadow
  g.fillStyle = 'rgba(20,40,20,.18)'; g.beginPath(); g.ellipse(0, r * 0.95, r * 0.95, r * 0.25, 0, 0, 6.283); g.fill();
  if (c.me) { g.strokeStyle = 'rgba(255,215,64,.9)'; g.lineWidth = Math.max(3, r * 0.08); g.beginPath(); g.ellipse(0, r * 0.95, r * 1.1, r * 0.32, 0, 0, 6.283); g.stroke(); }
  const ol = Math.max(2, r * 0.06), ink = shade(p.dark, -0.35);
  // tail
  g.save(); g.scale(c.dir, 1); g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = r * 0.26 + ol * 2;
  const tw = Math.sin(c.wob * 1.5) * r * 0.25; g.beginPath(); g.moveTo(-r * 0.7, r * 0.4); g.quadraticCurveTo(-r * 1.45, r * 0.2 + tw, -r * 1.2, -r * 0.45 + tw); g.stroke();
  g.strokeStyle = p.body; g.lineWidth = r * 0.26; g.stroke(); g.restore();
  // ears
  const ear = s => { g.save(); g.scale(s, 1); g.beginPath(); g.moveTo(r * 0.28, -r * 0.78); g.lineTo(r * 0.72, -r * 1.22); g.lineTo(r * 0.88, -r * 0.42); g.closePath();
    g.fillStyle = p.body; g.fill(); g.lineWidth = ol; g.strokeStyle = ink; g.lineJoin = 'round'; g.stroke();
    g.beginPath(); g.moveTo(r * 0.42, -r * 0.76); g.lineTo(r * 0.7, -r * 1.06); g.lineTo(r * 0.78, -r * 0.55); g.closePath(); g.fillStyle = '#ffb3c8'; g.fill(); g.restore(); };
  ear(1); ear(-1);
  // body
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.05); gr.addColorStop(0, shade(p.body, 0.35)); gr.addColorStop(0.6, p.body); gr.addColorStop(1, p.dark);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r, r * 0.94, 0, 0, 6.283); g.fill();
  g.save(); g.clip();
  if (p.stripe) { g.strokeStyle = shade(p.dark, -0.05); g.globalAlpha *= 0.5; g.lineWidth = r * 0.09; g.lineCap = 'round'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * r * 0.95, -r * 0.25 + i * r * 0.28); g.lineTo(s * r * 0.7, -r * 0.2 + i * r * 0.28); g.stroke(); }
    g.beginPath(); g.moveTo(-r * 0.15, -r * 0.92); g.lineTo(-r * 0.1, -r * 0.7); g.moveTo(r * 0.15, -r * 0.92); g.lineTo(r * 0.1, -r * 0.7); g.stroke(); g.globalAlpha = c.shield > 0 && c.me && Math.floor(S.t * 8) % 2 ? 0.55 : 1; }
  if (p.spots) { g.fillStyle = p.spots; g.beginPath(); g.ellipse(r * 0.55, -r * 0.55, r * 0.35, r * 0.28, 0.4, 0, 6.283); g.fill(); g.fillStyle = '#4a4458'; g.beginPath(); g.ellipse(-r * 0.6, r * 0.5, r * 0.3, r * 0.25, 0, 0, 6.283); g.fill(); }
  g.fillStyle = p.belly; g.globalAlpha *= 0.9; g.beginPath(); g.ellipse(0, r * 0.42, r * 0.7, r * 0.55, 0, 0, 6.283); g.fill(); g.restore();
  g.lineWidth = ol; g.strokeStyle = ink; g.beginPath(); g.ellipse(0, 0, r, r * 0.94, 0, 0, 6.283); g.stroke();
  // face (looks where it is going)
  const lx = c.dir * r * 0.08, ey = -r * 0.42, es = r * 0.15;
  for (const s of [-1, 1]) { const ex = lx + s * r * 0.34;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, es, es * 1.15, 0, 0, 6.283); g.fill(); g.lineWidth = ol * 0.6; g.stroke();
    g.fillStyle = '#2a1840'; g.beginPath(); g.ellipse(ex + c.dir * es * 0.25, ey + es * 0.1, es * 0.62, es * 0.8, 0, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + c.dir * es * 0.05 - es * 0.15, ey - es * 0.3, es * 0.28, 0, 6.283); g.fill(); }
  g.fillStyle = '#ff7aa2'; g.beginPath(); g.moveTo(lx - r * 0.07, -r * 0.24); g.lineTo(lx + r * 0.07, -r * 0.24); g.lineTo(lx, -r * 0.16); g.closePath(); g.fill();
  g.strokeStyle = ink; g.lineWidth = ol * 0.6; g.beginPath();
  if (c.chomp > 0) { g.fillStyle = '#7a2040'; g.ellipse(lx, -r * 0.08, r * 0.12, r * 0.1 * (0.4 + c.chomp), 0, 0, 6.283); g.fill(); }
  else { g.arc(lx - r * 0.06, -r * 0.15, r * 0.06, 0.2, Math.PI - 0.2); g.moveTo(lx + r * 0.12, -r * 0.15); g.arc(lx + r * 0.06, -r * 0.15, r * 0.06, 0.2, Math.PI - 0.2); g.stroke(); }
  g.strokeStyle = 'rgba(60,40,80,.45)'; g.lineWidth = Math.max(1, r * 0.025); g.beginPath();
  for (const s of [-1, 1]) for (const k of [-1, 1]) { g.moveTo(lx + s * r * 0.22, -r * 0.2 + k * r * 0.03); g.lineTo(lx + s * r * 0.62, -r * 0.24 + k * r * 0.1); } g.stroke();
  if (c.me) { g.font = FONT(r * 0.5); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👑', 0, -r * 1.12); }
  // size number, big on the belly
  const fs = r * (c.n >= 10 ? 0.62 : 0.7); g.font = FONT(fs); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = Math.max(3, fs * 0.16); g.strokeStyle = c.me ? '#b0306a' : '#3b2266'; g.lineJoin = 'round'; g.strokeText(c.n, 0, r * 0.4); g.fillStyle = '#fff'; g.fillText(c.n, 0, r * 0.4);
  g.restore(); g.globalAlpha = 1;
}
function drawFloats(dt) {
  for (let i = S.floats.length - 1; i >= 0; i--) { const f = S.floats[i]; f.t += dt; if (f.t > f.life) { S.floats.splice(i, 1); continue; }
    const a = f.t < 0.15 ? f.t / 0.15 : f.t > f.life - 0.4 ? (f.life - f.t) / 0.4 : 1, sc = f.t < 0.2 ? 0.7 + 0.3 * (f.t / 0.2) * 1.1 : 1;
    f.rise = Math.min(f.rise + dt * 10, Math.max(0, f.y - S.A.t - 2)); const R = f.rect();
    g.save(); g.globalAlpha = a; g.translate(R.x + R.w / 2, R.y + R.h / 2); g.scale(sc, sc);
    g.shadowColor = 'rgba(40,10,90,.3)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
    g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); g.roundRect(-R.w / 2, -R.h / 2, R.w, R.h, R.h * 0.45); g.fill(); g.shadowColor = 'transparent';
    g.lineWidth = 3; g.strokeStyle = f.kind === 'minus' ? '#ff6f8f' : '#3fbf6a'; g.stroke();
    g.font = FONT(f.size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = f.kind === 'minus' ? '#d23a63' : '#1f8a45'; g.fillText(f.text, 0, f.size * 0.05);
    g.restore(); }
}
function fx(type, x, y, r, col) {
  if (type === 'poof') for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; S.fx.push({ type: 'puff', x, y, vx: Math.cos(a) * r * 2, vy: Math.sin(a) * r * 2, r: r * rnd(0.25, 0.45), t: 0, life: 0.7 }); }
  if (type === 'crumbs') for (let i = 0; i < 8; i++) S.fx.push({ type: 'dot', x, y, vx: rnd(-120, 120), vy: rnd(-160, -40), r: r * 0.35, col, t: 0, life: 0.5 });
  if (type === 'bite') for (let i = 0; i < 5; i++) S.fx.push({ type: 'star', x, y, vx: rnd(-160, 160), vy: rnd(-160, 40), r: 10, col: '#ffd84d', t: 0, life: 0.5 });
  if (type === 'ring') S.fx.push({ type: 'ring', x, y, r, t: 0, life: 0.4 });
}
function confetti(n) { for (let i = 0; i < n; i++) S.fx.push({ type: 'conf', x: rnd(0, W), y: -10, vx: rnd(-60, 60), vy: rnd(120, 260), r: rnd(5, 9), rot: rnd(0, 6), col: pick(['#ff6fa5', '#ffcf4d', '#5fe08a', '#4dc4ff', '#b18cff']), t: 0, life: 5 }); }
function drawFx(dt) {
  for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.t += dt; if (f.t > f.life) { S.fx.splice(i, 1); continue; } const a = 1 - f.t / f.life;
    g.save(); g.globalAlpha = a;
    if (f.type === 'puff') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; g.fillStyle = '#fff'; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + f.t), 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,200,230,.6)'; g.beginPath(); g.arc(f.x + 3, f.y - 3, f.r * 0.4, 0, 6.283); g.fill(); }
    else if (f.type === 'dot' || f.type === 'star') { f.vy += 500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; g.fillStyle = f.col; g.beginPath(); if (f.type === 'star') { for (let k = 0; k < 10; k++) { const an = k * Math.PI / 5, q = k % 2 ? f.r * 0.45 : f.r; g.lineTo(f.x + Math.cos(an) * q, f.y + Math.sin(an) * q); } g.closePath(); } else g.arc(f.x, f.y, f.r, 0, 6.283); g.fill(); }
    else if (f.type === 'ring') { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + f.t * 4), 0, 6.283); g.stroke(); }
    else if (f.type === 'conf') { f.x += (f.vx + Math.sin(f.t * 3 + f.rot) * 40) * dt; f.y += f.vy * dt; f.rot += dt * 4; g.globalAlpha = 1; g.translate(f.x, f.y); g.rotate(f.rot); g.scale(1, Math.cos(f.t * 9 + f.r)); g.fillStyle = f.col; g.fillRect(-f.r, -f.r * 0.4, f.r * 2, f.r * 0.8); }
    else if (f.type === 'msg') { f.y -= 30 * dt; const s = clamp(S.unit * 0.045, 18, 34); g.font = FONT(s); g.textAlign = 'center'; g.textBaseline = 'middle'; const y = Math.max(f.y, S.A.t + s);
      g.lineWidth = 6; g.strokeStyle = '#3b2266'; g.lineJoin = 'round'; g.strokeText(f.text, f.x, y); g.fillStyle = '#ffd84d'; g.fillText(f.text, f.x, y); }
    g.restore(); }
}
function drawBitePrompt() {
  const b = S.bite; if (!b) return; const v = b.v, s = clamp(S.unit * 0.085, 28, 64), pul = 1 + Math.sin(S.t * 14) * 0.06;
  const y = clamp(S.me.y + radius(S.me.n) + s * 1.1, S.A.t + s, S.A.b - s * 0.6);
  g.save(); g.translate(clamp(S.me.x, S.A.l + s * 3, S.A.r - s * 3), y); g.scale(pul, pul); g.font = FONT(s); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#3b2266'; g.lineJoin = 'round'; const tx = `TAP TAP! 👆 ${b.k}`; g.strokeText(tx, 0, 0); g.fillStyle = '#ffd84d'; g.fillText(tx, 0, 0); g.restore();
  g.strokeStyle = 'rgba(255,80,120,.8)'; g.lineWidth = 4; g.setLineDash([8, 8]); g.beginPath(); g.arc(v.x, v.y, radius(v.n) * 1.25, 0, 6.283); g.stroke(); g.setLineDash([]);
}
let last = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (!S.active) return;
  tick(dt);
  g.setTransform(DPR, 0, 0, DPR, 0, 0); bg();
  S.food.forEach(drawFood);
  S.cats.slice().sort((a, b) => a.n - b.n).forEach(c => c.alive && drawCat(c));
  if (S.target && S.state === 'play') { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(S.target.x, S.target.y, 7, 0, 6.283); g.fill(); }
  drawBitePrompt(); drawFx(dt); drawFloats(dt);
  if (S.state === 'win' && Math.random() < 0.4) confetti(2);
}
requestAnimationFrame(frame);

/* ===== test / debug hooks ===== */
S.start = start;
S.place = (n, side = 1) => {   // put an AI cat of size n right next to you (used by the tests)
  const me = S.me, c = S.cats.find(o => !o.me && o.alive) || addAI(); c.n = n; c.shield = 0; c.flee = 0; me.shield = 0;
  const d = (radius(me.n) + radius(n)) * 0.7; c.x = clamp(me.x + side * d, S.A.l + radius(n), S.A.r - radius(n)); c.y = me.y; if (Math.abs(c.x - me.x) < d * 0.8) c.x = me.x - side * d;
  S.cats.filter(o => o !== c && !o.me).forEach(o => { o.x = S.A.l + radius(o.n); o.y = S.A.b - radius(o.n); o.shield = 9; });
  return c.id;
};
S.floatRects = () => S.floats.map(f => f.rect());
S.hudRects = () => [...document.querySelectorAll('#chud > :not(.sp)')].map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
})();
