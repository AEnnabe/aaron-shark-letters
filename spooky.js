/* v11: Level 3 – Aaron: Spooky Word Hunt.
   Five sight words hide in a busy (cute) Halloween scene and pop up / duck down. The narrator calls a word;
   find it 3 times in a row (shuffle after each find) to print it on a dollar for the piggy bank, then shop:
   a $1–2 prize, a $5 booby trap, or save. Bank + prizes persist in localStorage ('spooky.v1').
   Debug: ?level=3 (tap anywhere), ?bank=N (set bank), ?sw=word (first target), ?trap=ghost|witch|mummy (play one). */
(() => {
'use strict';
const SD = window.SPOOKY_DATA, RD = window.RUNNER_DATA || { lines: {} };
const { Sfx, Music, Voice, VOICE_DATA, Speech } = window.SharkCore;
const P = new URLSearchParams(location.search);
const WORDS = SD.words;
const KEY = 'spooky.v1';
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const wk = w => (w === 'I' ? 'i_cap' : w);
for (const [k, v] of Object.entries(SD.lines)) if (v.speech) Voice.raw[k] = Promise.resolve(null);   // no clip yet: the device's own voice reads the text
function say(k, cb) { if (SD.lines[k] && !VOICE_DATA.lines[k]) VOICE_DATA.lines[k] = SD.lines[k]; if (RD.lines[k] && !VOICE_DATA.lines[k]) VOICE_DATA.lines[k] = RD.lines[k]; Voice.play(k, cb); }
function sayChain(keys, cb) { const k = keys.shift(); if (!k) return cb && cb(); say(k, () => setTimeout(() => sayChain(keys, cb), 120)); }
const dur = k => ((SD.lines[k] || RD.lines[k] || {}).dur || 1.5);

/* ===== persistence ===== */
const store = {
  load() { try { return Object.assign({ bank: 0, prizes: [], won: [], total: 0 }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { return { bank: 0, prizes: [], won: [], total: 0 }; } },
  save(s) { try { localStorage.setItem(KEY, JSON.stringify({ bank: s.bank, prizes: s.prizes.slice(-40), won: s.won, total: s.total, trapIdx: s.trapIdx | 0 })); } catch (_) {} },
};

/* ===== prizes + traps ===== */
const PRIZES = [
  { e: '⭐', name: 'Sticker', price: 1 }, { e: '🍭', name: 'Lollipop', price: 1 }, { e: '🍬', name: 'Candy corn', price: 1 },
  { e: '🕷️', name: 'Spider ring', price: 2 }, { e: '🪄', name: 'Glow stick', price: 2 }, { e: '🎃', name: 'Pumpkin hat', price: 2 },
  { e: '🦇', name: 'Bat buddy', price: 1 }, { e: '🍫', name: 'Chocolate', price: 2 },
];
const TRAPS = ['ghost', 'witch', 'mummy'];
const TRAP_PRICE = 5, TRAP_SEC = 8.5, PARTY_EVERY = 8;

/* ===== scenes ===== */
const SCENES = {
  house: { name: 'Haunted House', sky: ['#3b2a6b', '#6b4aa8', '#f7a35c'], ground: '#4a3a2a', covers: ['window', 'window', 'grave', 'pumpkin', 'bush', 'grave'], deco: ['🦇', '🕸️', '👻', '🌙', '🦇', '🍬'] },
  leaves: { name: 'Fall Leaves', sky: ['#ffb36b', '#ffd59a', '#fff1cf'], ground: '#b8642a', covers: ['leaves', 'leaves', 'hay', 'pumpkin', 'leaves', 'hay'], deco: ['🍂', '🍁', '🐿️', '🌳', '🍁', '🦉'] },
  patch: { name: 'Pumpkin Patch', sky: ['#ff9a5a', '#ffcf7a', '#ffe6b0'], ground: '#6a8a3a', covers: ['pumpkin', 'hay', 'pumpkin', 'pumpkin', 'hay', 'pumpkin'], deco: ['🌽', '🐦‍⬛', '🍂', '🌻', '🎃', '🐈‍⬛'] },
  candy: { name: 'Candy Shop', sky: ['#ffc4e6', '#ffd9f2', '#fff0fb'], ground: '#c9a07a', covers: ['jar', 'jar', 'jar', 'box', 'jar', 'box'], deco: ['🍭', '🍬', '🧁', '🍫', '🍩', '🍪'] },
  lab: { name: "Witch's Potion Lab", sky: ['#1f3a3a', '#2e5a4a', '#4a8a5a'], ground: '#3a2f3f', covers: ['cauldron', 'bottle', 'book', 'cauldron', 'bottle', 'book'], deco: ['🧪', '🕯️', '🐸', '🔮', '🧹', '🕷️'] },
};
const SCENE_IDS = Object.keys(SCENES);

/* ===== DOM ===== */
const css = document.createElement('style');
css.textContent = `
#slayer{position:fixed;inset:0;z-index:25;display:none;touch-action:none;user-select:none;-webkit-user-select:none;font-family:ui-rounded,"Arial Rounded MT Bold","Comic Sans MS",system-ui,sans-serif}
#slayer canvas{position:absolute;inset:0;width:100%;height:100%}
#shud{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:8px;padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) 4px max(10px,env(safe-area-inset-left));pointer-events:none}
#shud .sb{background:rgba(255,255,255,.9);border-radius:18px;padding:5px 12px;font-weight:900;font-size:20px;color:#4a2a7a;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,.25)}
#sstars{font-size:28px;letter-spacing:2px}#sbank{color:#1f7a3a !important}
#shud button{pointer-events:auto;width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.9);font-size:28px;box-shadow:0 3px 8px rgba(0,0,0,.25);flex:0 0 auto}
#ssay{background:#ffd84d !important}
#shud .sp{flex:1}
#sshelf{position:absolute;left:max(8px,env(safe-area-inset-left));bottom:max(6px,env(safe-area-inset-bottom));max-width:60vw;background:rgba(255,255,255,.75);border-radius:14px;padding:2px 8px;font-size:22px;white-space:nowrap;overflow:hidden;pointer-events:none;display:none}
#sprompt{position:absolute;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.95);border-radius:22px;padding:2px 20px;font-weight:900;font-size:min(7vmin,44px);color:#5a2a8a;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,.25);pointer-events:none}
#sprompt small{font-size:.5em;color:#8a6aaa;margin-right:8px}
#sshop{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:2.2vmin;background:rgba(30,10,50,.62);padding:max(64px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))}
#sshop h2{margin:0;color:#fff;font-size:min(7vmin,48px);text-shadow:0 3px 0 #6a2a9a;text-align:center}
#sshop .row{display:flex;gap:2.4vmin;flex-wrap:wrap;justify-content:center}
#sshop button{appearance:none;border:5px solid #fff;border-radius:26px;background:#ffefc2;min-width:min(22vmin,150px);padding:1vmin 2vmin;cursor:pointer;touch-action:manipulation;box-shadow:0 7px 0 rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;font-weight:900;color:#4a2a7a;font-size:min(3.6vmin,22px)}
#sshop button .e{font-size:min(13vmin,84px);line-height:1.1}
#sshop button .pr{font-size:min(5vmin,30px);letter-spacing:-2px}
#sshop button.trap{background:#d8ffb8;border-color:#ffd84d}
#sshop button.save{background:#ffd0e4}
#sshop button.no{filter:grayscale(.8) brightness(.85)}
#sshop button:active{transform:translateY(5px)}
@media (max-height:500px){#shud .sb{font-size:15px;padding:3px 8px}#sstars{font-size:20px}#shud button{width:44px;height:44px;font-size:22px}
 #sshop{flex-direction:row;flex-wrap:wrap;gap:8px}#sshop h2{width:100%;font-size:26px}#sshop button .e{font-size:44px}#sshop button{min-width:96px;font-size:14px}#sshop button .pr{font-size:20px}}
@media (max-width:640px){#shud{flex-wrap:wrap}#shud .sb{font-size:15px;padding:3px 8px}#sstars{font-size:20px}#shud button{width:44px;height:44px;font-size:22px}#sname{display:none}}
#sreset{margin-top:8px;background:rgba(255,255,255,.25);color:#fff;border:2px solid rgba(255,255,255,.6);border-radius:16px;padding:6px 14px;font-weight:800;font-size:14px;cursor:pointer}
`;
document.head.appendChild(css);
const layer = document.createElement('div'); layer.id = 'slayer';
layer.innerHTML = `<canvas id="scv"></canvas>
<div id="shud"><div class="sb" id="sname">Level 3 – Aaron</div><div class="sb" id="sstars">☆☆☆</div><div class="sb" id="sbank">🐷 $0</div><span class="sp"></span><button id="ssay" aria-label="Hear it again">🔊</button><button id="smute" aria-label="Music on/off">🎵</button><button id="smenu" aria-label="Menu">🏠</button></div>
<div id="sprompt"></div><div id="sshelf"></div>
<div id="sshop"><h2>Buy a prize, or save up for a booby trap!</h2><div class="row" id="sprizes"></div><div class="row"><button class="trap" id="strap"><span class="e">💣</span>Booby trap!<span class="pr">💵💵💵💵💵</span></button><button class="save" id="ssave"><span class="e">🐷</span>Save my money!<span class="pr">&nbsp;</span></button></div></div>`;
document.body.appendChild(layer);
const cv = layer.querySelector('#scv'), g = cv.getContext('2d');
const $s = id => layer.querySelector('#' + id);
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; if (S.active) layout(); }

/* ===== state ===== */
const S = window.Spooky = {
  active: false, state: 'off', t: 0, scene: 'house', target: null, words: [], spots: [], streak: 0, recent: [],
  bank: 0, prizes: [], won: [], total: 0, sessionWon: 0, fx: [], log: [], trap: null, popLog: [], visMin: 99, lastPrompt: 0, shopShown: 0,
};
Object.assign(S, store.load());
if (P.has('bank')) { S.bank = Math.max(0, parseInt(P.get('bank'), 10) || 0); store.save(S); }
addEventListener('resize', resize);

/* ===== drawing helpers ===== */
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ell(x, y, rx, ry, c, rot = 0) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, 6.283); g.fill(); }
function emoji(e, x, y, s) { g.font = `${Math.round(s)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); }
const FONT = s => `900 ${Math.round(s)}px ui-rounded, "Arial Rounded MT Bold", "Comic Sans MS", system-ui, sans-serif`;
const TAGC = ['#ff7a2f', '#a66bff', '#2fbf5a', '#ff5d8f', '#2a9fd6', '#ffb800'];

/* ===== layout: 5 non-overlapping cells below the HUD ===== */
function hudBottom() { const h = $s('shud').getBoundingClientRect(); return h.bottom; }
function layout() {
  const top = hudBottom() + 8;
  const pr = $s('sprompt'); pr.style.top = top + 'px'; pr.innerHTML = `<small>Find:</small>${S.target || 'little'}`; pr.style.visibility = 'visible';
  const pb = pr.getBoundingClientRect().bottom + 8;
  const sa = getComputedStyle(document.documentElement);
  const l = 10, r = W - 10, b = H - 40;
  const portrait = H > W * 1.05;
  const rows = portrait ? [2, 1, 2] : [3, 2];
  const rh = (b - pb) / rows.length;
  S.cellH = rh; S.cells = []; S.areaTop = pb;
  rows.forEach((n, ri) => {
    const cw = (r - l) / (rows[0] === 3 && n === 2 ? 3 : Math.max(n, 2));
    const totalW = cw * n, x0 = (l + r) / 2 - totalW / 2;
    for (let i = 0; i < n; i++) S.cells.push({ x: x0 + cw * (i + 0.5), y: pb + rh * ri, w: cw, h: rh });
  });
  // tag font: fit the longest list word ("little") in the cell, toddler-sized
  const cw = Math.min(...S.cells.map(c => c.w));
  let fs = clamp(Math.min(rh * 0.3, cw * 0.24), 26, 72);
  g.font = FONT(fs); const tw = g.measureText('little').width;
  if (tw + fs * 1.0 > cw - 16) fs = Math.max(22, fs * (cw - 16) / (tw + fs));
  S.fs = fs;
  S.spots.forEach((sp, i) => { sp.cell = S.cells[i]; });
}

/* ===== start ===== */
function start() {
  Voice.stop(); Sfx.unlock();
  document.getElementById('start').classList.add('hidden');
  if (window.Runner) window.Runner.active = false;
  layer.style.display = 'block'; resize();
  Object.assign(S, store.load()); if (P.has('bank')) S.bank = Math.max(0, parseInt(P.get('bank'), 10) || 0);
  Object.assign(S, { active: true, state: 'intro', t: 0, streak: 0, fx: [], sessionWon: 0, trap: null, recent: [], popLog: [], visMin: 99, log: [] });
  hud(); shelf(); startMusic();
  newRound(P.get('sw') && WORDS.includes(P.get('sw')) ? P.get('sw') : null, true);
  if (P.get('trap') && TRAPS.includes(P.get('trap'))) { S.state = 'play'; playTrap(P.get('trap'), true); return; }
  say('sp_intro', () => { if (S.state === 'intro') { S.state = 'play'; prompt(); } });
  setTimeout(() => { if (S.state === 'intro') { S.state = 'play'; prompt(); } }, (dur('sp_intro') + 2.5) * 1000);
}
function newRound(forced, first) {
  const ids = SCENE_IDS.filter(x => x !== S.scene); S.scene = first ? pick(SCENE_IDS) : pick(ids);
  const avoid = new Set(S.recent.slice(-6));
  let cand = WORDS.filter(w => !avoid.has(w) && !S.won.includes(w)); if (!cand.length) cand = WORDS.filter(w => !avoid.has(w));
  const tgt = forced || pick(cand);
  S.target = tgt; S.recent.push(tgt); S.streak = 0;
  const others = shuffle(WORDS.filter(w => w !== tgt)).slice(0, 4);
  S.words = shuffle([tgt, ...others]);
  S.deco = Array.from({ length: 16 }, (_, i) => ({ e: pick(SCENES[S.scene].deco), fx: Math.random(), fy: Math.random(), s: rnd(0.5, 1.1), ph: rnd(0, 6) }));
  layout();
  const cov = shuffle(SCENES[S.scene].covers).slice(0, 5);
  S.spots = S.words.map((w, i) => ({ w, cell: S.cells[i], cover: cov[i], col: TAGC[i % TAGC.length], st: 'down', t0: S.t, until: S.t + rnd(0.1, 1.4), up: 0, wob: -9 }));
  hud();
}
function prompt(again) {
  if (!S.active) return;
  S.lastPrompt = S.t;
  const k = 'rw_' + wk(S.target) + '_q';
  if (again) sayChain(['sp_again', k]); else say(k);
}

/* ===== pop-up timing (>=2 always up, staggered random) ===== */
const RISE = 0.35;
function tickSpots(dt) {
  if (S.state === 'shuffle') return;
  const visible = () => S.spots.filter(s => s.st === 'up' || s.st === 'rising').length;
  for (const sp of S.spots) {
    if (S.t < sp.until) continue;
    if (sp.st === 'down') { if (sp.sinceDown !== undefined && S.t < sp.until) continue; sp.st = 'rising'; sp.t0 = S.t; sp.until = S.t + RISE; }
    else if (sp.st === 'rising') { sp.st = 'up'; sp.t0 = S.t; sp.until = S.t + rnd(1.5, 2.5); }
    else if (sp.st === 'up') {
      if (visible() <= 2) {   // never fewer than 2 up: bring another word up first, then duck this one
        const down = S.spots.filter(s => s.st === 'down');
        if (down.length) { const o = down.find(s => s.w === S.target) || pick(down); o.st = 'rising'; o.t0 = S.t; o.until = S.t + RISE; o.upAt = S.t + RISE; }
        sp.until = S.t + RISE + 0.05; continue;
      }
      sp.st = 'falling'; sp.t0 = S.t; sp.until = S.t + RISE;
    } else if (sp.st === 'falling') { sp.st = 'down'; sp.t0 = S.t; sp.until = S.t + rnd(0.3, 1.5); S.popLog.push({ w: sp.w, upFor: +(S.t - (sp.upAt || S.t)).toFixed(2) }); if (S.popLog.length > 200) S.popLog.shift(); }
    if (sp.st === 'up' && !sp.upAt0) {}
    if (sp.st === 'rising') sp.upAt = S.t + RISE;
  }
  // keep >=2 visible: force-pop a hidden one (target first if it's been down a while)
  let v = visible();
  while (v < 2) {
    const down = S.spots.filter(s => s.st === 'down'); if (!down.length) break;
    const tgt = down.find(s => s.w === S.target && S.t - s.t0 > 1.2) || pick(down);
    tgt.st = 'rising'; tgt.t0 = S.t; tgt.until = S.t + RISE; tgt.upAt = S.t + RISE; v++;
  }
  const tsp = S.spots.find(s => s.w === S.target);
  if (tsp && tsp.st === 'down' && S.t - tsp.t0 > 2.5) { tsp.st = 'rising'; tsp.t0 = S.t; tsp.until = S.t + RISE; tsp.upAt = S.t + RISE; }
  for (const sp of S.spots) sp.up = sp.st === 'up' ? 1 : sp.st === 'down' ? 0 : sp.st === 'rising' ? ease((S.t - sp.t0) / RISE) : 1 - ease((S.t - sp.t0) / RISE);
  if (S.state === 'play' && S.t > 3) S.visMin = Math.min(S.visMin, S.spots.filter(s => s.up > 0.5).length + S.spots.filter(s => s.st === 'rising' || s.st === 'falling').length * 0);
}

/* ===== tag geometry (also the hit box) ===== */
function tagRect(sp) {
  const c = sp.cell, fs = S.fs; g.font = FONT(fs);
  const tw = g.measureText(sp.w).width, w = Math.max(tw + fs * 1.0, fs * 2.6, 70), h = Math.max(fs * 1.45, 64);
  const coverTop = c.y + c.h * 0.58;
  const y = coverTop - h * 0.55 - sp.up * (c.h * 0.58 - h * 0.45 - 4) + (1 - sp.up) * h * 0.6;
  return { x: c.x - w / 2, y, w, h };
}

/* ===== input ===== */
cv.addEventListener('pointerdown', e => {
  if (!S.active) return; e.preventDefault(); Sfx.unlock();
  const x = e.clientX, y = e.clientY;
  if (S.state === 'trap' || S.state === 'party') return;
  if (S.state !== 'play') return;
  let hit = null;
  for (const sp of S.spots) { if (sp.up < 0.55) continue; const r = tagRect(sp); if (x >= r.x - 8 && x <= r.x + r.w + 8 && y >= r.y - 8 && y <= r.y + r.h + 8) { hit = sp; break; } }
  if (hit) tap(hit);
});
function tap(sp) {
  const ok = sp.w === S.target; S.log.push({ t: +S.t.toFixed(2), w: sp.w, target: S.target, ok, streakBefore: S.streak });
  const r = tagRect(sp), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (ok) {
    S.streak++; hud();
    Sfx.sparkle(); Sfx.chime && Sfx.chime();
    for (let i = 0; i < 26; i++) S.fx.push({ type: 'p', x: cx, y: cy, vx: rnd(-260, 260), vy: rnd(-320, 120), t: 0, life: 0.9, col: pick(['#ffd84d', '#fff', '#ff9a3d', '#a66bff']), r: rnd(3, 7) });
    S.fx.push({ type: 'txt', text: '⭐', x: cx, y: cy - 30, t: 0, life: 0.9, size: 60 });
    if (S.streak >= 3) { S.state = 'dollar'; say('rw_' + wk(S.target) + '_y', () => {}); setTimeout(winWord, 700); return; }
    S.state = 'shuffle'; say('rw_' + wk(S.target) + '_y');
    doShuffle(() => { S.state = 'play'; prompt(true); });
  } else {
    const was = S.streak; S.streak = 0; hud();
    Sfx.tone(320, 110, 0.22, 'sine', 0.28); Sfx.tone(520, 200, 0.18, 'triangle', 0.12, 0.06);   // gentle boing
    sp.wob = S.t;
    S.fx.push({ type: 'txt', text: 'boing!', x: cx, y: cy - 40, t: 0, life: 0.9, size: 34, col: '#fff' });
    sayChain(['sp_' + wk(sp.w) + '_is', 'sp_' + wk(S.target) + '_f']);
    S.lastPrompt = S.t;
  }
}
function doShuffle(done) {
  // words swirl to the middle and re-hide in different spots
  const t0 = S.t; Sfx.swish && Sfx.swish();
  const from = S.spots.map(sp => { const r = tagRect(sp); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; });
  let order; do { order = shuffle(S.words); } while (order.every((w, i) => w === S.words[i]) || order.indexOf(S.target) === S.words.indexOf(S.target));
  S.sh = { t0, from, order, words: S.words.slice() };
  S.words = order;
  S.spots.forEach((sp, i) => { sp.w = order[i]; sp.st = 'down'; sp.up = 0; sp.t0 = S.t; sp.until = S.t + 1.0 + i * 0.15 + rnd(0, 0.3); });
  setTimeout(() => { S.sh = null; done(); }, 1000);
}

/* ===== dollar into the piggy bank ===== */
function winWord() {
  S.state = 'dollar'; S.dl = { t0: S.t, w: S.target };
  setTimeout(() => { Sfx.tone(1318, 1760, 0.08, 'square', 0.06); Sfx.tone(1760, 2093, 0.1, 'square', 0.05, 0.06); }, 1700);
  setTimeout(() => { Sfx.tone(1318, 1760, 0.08, 'square', 0.06, 0.15); Sfx.tone(1760, 2637, 0.14, 'square', 0.05, 0.22); S.bank += 1; S.total++; S.sessionWon++; if (!S.won.includes(S.target)) S.won.push(S.target); store.save(S); hud(); bump(); }, 2300);
  say('sp_' + wk(S.target) + '_win');
  setTimeout(() => {
    S.dl = null; S.streak = 0;
    let all = false; if (S.won.length >= WORDS.length) { S.won = []; store.save(S); all = true; }
    if (S.sessionWon % PARTY_EVERY === 0 || all) party(all, openShop); else openShop();
  }, 3400);
}
function bump() { const b = $s('sbank'); b.animate && b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 450 }); }
function bankPos() { const r = $s('sbank').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function drawDollar() {
  const d = S.dl; if (!d) return; const t = S.t - d.t0;
  const bw = Math.min(W * 0.7, 520), bh = bw * 0.45; const bp = bankPos();
  const fly = clamp((t - 1.6) / 0.8, 0, 1), k = ease(fly), appear = ease(t / 0.4);
  const cx = W / 2 + (bp.x - W / 2) * k, cy = H * 0.5 + (bp.y - H * 0.5) * k - Math.sin(k * Math.PI) * H * 0.15, sc = (0.4 + 0.6 * appear) * (1 - 0.85 * k);
  g.fillStyle = `rgba(20,0,40,${0.45 * (1 - k)})`; g.fillRect(0, 0, W, H);
  g.save(); g.translate(cx, cy); g.rotate(k * 0.8 + Math.sin(t * 3) * 0.04 * (1 - k)); g.scale(sc, sc);
  g.fillStyle = '#8fd08a'; rr(-bw / 2, -bh / 2, bw, bh, 16); g.fill(); g.lineWidth = 8; g.strokeStyle = '#2e7a3a'; g.stroke();
  g.strokeStyle = '#5aa85a'; g.lineWidth = 3; rr(-bw / 2 + 14, -bh / 2 + 14, bw - 28, bh - 28, 10); g.stroke();
  ell(0, 0, bh * 0.36, bh * 0.36, '#d8f5d0'); g.lineWidth = 4; g.strokeStyle = '#2e7a3a'; g.beginPath(); g.arc(0, 0, bh * 0.36, 0, 6.28); g.stroke();
  g.fillStyle = '#2e7a3a'; g.font = FONT(bh * 0.24); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillText('$1', sx * (bw / 2 - bh * 0.22), sy * (bh / 2 - bh * 0.2));
  // the word gets printed letter by letter
  const p = clamp((t - 0.35) / 0.9, 0, 1), n = Math.ceil(d.w.length * p);
  g.font = FONT(bh * 0.34); g.fillStyle = '#123d1a'; g.fillText(d.w.slice(0, n), 0, bh * 0.02);
  if (p < 1 && Math.floor(t * 20) % 2) { Sfx; }
  g.restore();
  // piggy bank glow
  if (k > 0) emoji('🐷', bp.x, bp.y + 46, 44 + 20 * Math.sin(k * Math.PI));
  if (t < 1.6) { g.font = FONT(Math.min(W * 0.06, 44)); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('You won a ' + d.w.toUpperCase() + ' dollar!', W / 2, H * 0.5 + bh * 0.5 + 40); }
}

/* ===== party (every 8 words) ===== */
function party(all, then) {
  S.state = 'party'; S.pt = S.t; Music.start('party'); Sfx.victory && Sfx.victory();
  say(all ? 'sp_all' : 'sp_party');
  setTimeout(() => { Music.start('spooky'); if (S.state === 'party') then(); }, 5500);
}
function drawParty() {
  const t = S.t - S.pt; if (Math.random() < 0.8) confetti(4);
  const dancers = ['🦈', '🎃', '👻', '🦇', '🍬', '🐈‍⬛', '🧙', '💀'];
  dancers.forEach((e, i) => { const x = W * (0.1 + i * 0.115), y = H * 0.72 - Math.abs(Math.sin(t * 5 + i)) * H * 0.08; g.save(); g.translate(x, y); g.rotate(Math.sin(t * 6 + i) * 0.25); emoji(e, 0, 0, Math.min(W, H) * 0.11); g.restore(); });
  g.font = FONT(Math.min(W * 0.08, 64)); g.fillStyle = '#fff'; g.strokeStyle = '#6a2a9a'; g.lineWidth = 8; g.textAlign = 'center';
  const txt = 'PARTY TIME! 🎉'; g.strokeText(txt, W / 2, H * 0.4); g.fillText(txt, W / 2, H * 0.4);
}

/* ===== shop ===== */
function openShop() {
  S.state = 'shop'; S.shopShown++;
  const box = $s('sprizes'); box.innerHTML = '';
  const one = pick(PRIZES.filter(p => p.price === 1)); const opts = shuffle([one, ...shuffle(PRIZES.filter(p => p !== one)).slice(0, 2)]);   // always one $1 prize
  opts.forEach(pz => {
    const b = document.createElement('button'); b.className = 'prize' + (S.bank < pz.price ? ' no' : ''); b.dataset.price = pz.price;
    b.innerHTML = `<span class="e">${pz.e}</span>${pz.name}<span class="pr">${'💵'.repeat(pz.price)}</span>`;
    b.addEventListener('click', e => { e.stopPropagation(); buy(pz); });
    box.appendChild(b);
  });
  $s('strap').classList.toggle('no', S.bank < TRAP_PRICE);
  $s('strap').querySelector('.pr').textContent = '💵'.repeat(TRAP_PRICE);
  $s('sshop').style.display = 'flex';
  say('sp_shop');
}
function closeShop() { $s('sshop').style.display = 'none'; }
function buy(pz) {
  if (S.state !== 'shop') return;
  if (S.bank < pz.price) { Sfx.tone(300, 200, 0.15, 'sine', 0.2); say('sp_need'); return; }
  S.bank -= pz.price; S.prizes.push(pz.e); store.save(S); hud(); shelf(); closeShop();
  Sfx.fanfare ? Sfx.fanfare() : Sfx.sparkle();
  S.state = 'gift'; S.gift = { t0: S.t, e: pz.e };
  say('sp_buy', () => {});
  setTimeout(() => { S.gift = null; nextWord(); }, 2200);
}
$s('ssave').addEventListener('click', e => { e.stopPropagation(); if (S.state !== 'shop') return; closeShop(); Sfx.sparkle(); S.state = 'saving'; say('sp_save'); setTimeout(nextWord, 1600); });
$s('strap').addEventListener('click', e => {
  e.stopPropagation(); if (S.state !== 'shop') return;
  if (S.bank < TRAP_PRICE) { Sfx.tone(300, 200, 0.15, 'sine', 0.2); say('sp_need'); return; }
  S.bank -= TRAP_PRICE; store.save(S); hud(); closeShop(); S.trapIdx = ((S.trapIdx | 0) + 1) % TRAPS.length; store.save(S); playTrap(TRAPS[S.trapIdx]);
});
function nextWord() {
  if (!S.active) return;
  newRound(null, false); S.state = 'play'; prompt();
}

/* ===== booby traps (~8 s) ===== */
function playTrap(kind, debug) {
  S.state = 'trap'; S.trap = { kind, t0: S.t, debug, ev: {} }; S.trapsPlayed = (S.trapsPlayed || 0) + 1;
  Music.start('party');
  sayChain(['sp_trap', 'sp_trap_' + kind]);
  setTimeout(() => { if (!S.active) return; S.trap = null; Music.start('spooky'); nextWord(); }, TRAP_SEC * 1000);
}
function once(id, fn) { if (!S.trap.ev[id]) { S.trap.ev[id] = 1; fn(); } }
function drawTrap() {
  const T = S.trap, t = S.t - T.t0, sz = Math.min(W, H) * 0.26, gy = H * 0.78;
  g.fillStyle = 'rgba(20,0,40,.35)'; g.fillRect(0, 0, W, H);
  g.font = FONT(Math.min(W * 0.07, 54)); g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#6a2a9a'; g.lineWidth = 7;
  g.strokeText('BOOBY TRAP!', W / 2, H * 0.24); g.fillText('BOOBY TRAP!', W / 2, H * 0.24);
  const walk = clamp(t / 2.6, 0, 1), x = -sz + (W / 2 + sz) * ease(walk), bob = Math.sin(t * 9) * (walk < 1 ? 10 : 0);
  if (T.kind === 'ghost') {
    // bucket hangs over the middle, tips at 2.8 s, slime falls on the ghost
    const tip = clamp((t - 2.7) / 0.4, 0, 1);
    g.strokeStyle = '#5a3a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(W / 2 - sz * 0.2, 0); g.lineTo(W / 2 - sz * 0.2, gy - sz * 1.9); g.stroke();
    g.save(); g.translate(W / 2 - sz * 0.2, gy - sz * 1.75); g.rotate(tip * 2.2); emoji('🪣', 0, 0, sz * 0.6); g.restore();
    const slimed = t > 3.2;
    g.save(); g.translate(x, gy - sz * 0.6 + bob); if (t > 3.2) g.rotate(Math.sin(t * 14) * 0.15);
    emoji('👻', 0, 0, sz * 1.1);
    if (slimed) { g.globalAlpha = 0.85; ell(0, -sz * 0.25, sz * 0.48, sz * 0.32, '#5ee07a'); for (let i = -3; i <= 3; i++) ell(i * sz * 0.12, -sz * 0.05 + Math.abs(Math.sin(i + t)) * sz * 0.35 * clamp(t - 3.2, 0, 1), sz * 0.06, sz * 0.12, '#3fc95a'); g.globalAlpha = 1; }
    g.restore();
    if (t > 2.9 && t < 3.25) { const f = (t - 2.9) / 0.35; ell(W / 2, gy - sz * 1.6 + f * sz, sz * 0.3, sz * 0.25, '#5ee07a'); }
    if (t > 3.2) once('splat', () => { Sfx.noise(0.5, 'lowpass', 600, 0.8, 0.6); Sfx.tone(200, 60, 0.4, 'sine', 0.3); for (let i = 0; i < 40; i++) S.fx.push({ type: 'p', x: W / 2, y: gy - sz * 0.8, vx: rnd(-380, 380), vy: rnd(-500, -100), t: 0, life: 1.4, col: pick(['#5ee07a', '#3fc95a', '#b8ff9a']), r: rnd(5, 12) }); S.fx.push({ type: 'txt', text: 'SPLAT!', x: W / 2, y: gy - sz * 1.4, t: 0, life: 1.6, size: 70, col: '#b8ff9a' }); });
    if (t > 4.5) { g.font = FONT(sz * 0.2); g.fillStyle = '#fff'; g.fillText('Ewww, slimy!', W / 2 + sz * 0.9, gy - sz * 1.2); }
  } else if (T.kind === 'witch') {
    const cush = { x: W / 2 + sz * 0.15, y: gy };
    if (t < 3.1) { ell(cush.x, cush.y, sz * 0.32, sz * 0.12, '#ff6fb1'); ell(cush.x - sz * 0.33, cush.y, sz * 0.08, sz * 0.05, '#e04d90'); }
    else { ell(cush.x, cush.y + 4, sz * 0.34, sz * 0.05, '#ff6fb1'); }
    const jump = t > 3.1 && t < 3.9 ? Math.sin((t - 3.1) / 0.8 * Math.PI) * sz * 0.5 : 0;
    g.save(); g.translate(x, gy - sz * 0.55 + bob - jump); emoji('🧙', 0, 0, sz * 1.1);
    if (t > 4.5) { ell(0, -sz * 0.2, sz * 0.32, sz * 0.26, '#fff8e8'); ell(-sz * 0.1, -sz * 0.25, sz * 0.06, sz * 0.05, '#ffd0d8'); ell(sz * 0.12, -sz * 0.15, sz * 0.07, sz * 0.05, '#ffe9a8'); }
    g.restore();
    if (t > 3.1) once('pfft', () => { Sfx.fart && Sfx.fart(); S.fx.push({ type: 'txt', text: 'PFFFFT!', x: cush.x, y: gy - sz * 0.9, t: 0, life: 1.5, size: 64, col: '#ff9ad0' }); });
    if (t > 3.8 && t < 4.5) { const f = (t - 3.8) / 0.7; g.save(); g.translate(W + sz * 0.3 - (W + sz * 0.3 - W / 2) * f, gy - sz * 0.75 - Math.sin(f * Math.PI) * sz * 0.5); g.rotate(f * 8); emoji('🥧', 0, 0, sz * 0.5); g.restore(); }
    if (t > 4.5) once('pie', () => { Sfx.slap ? Sfx.slap() : Sfx.boop(); for (let i = 0; i < 30; i++) S.fx.push({ type: 'p', x: W / 2, y: gy - sz * 0.7, vx: rnd(-300, 300), vy: rnd(-400, -50), t: 0, life: 1.2, col: pick(['#fff8e8', '#ffd0d8', '#ffe9a8']), r: rnd(5, 11) }); S.fx.push({ type: 'txt', text: 'SPLAT!', x: W / 2, y: gy - sz * 1.3, t: 0, life: 1.5, size: 70, col: '#fff' }); });
    if (t > 5) { g.font = FONT(sz * 0.2); g.fillStyle = '#fff'; g.fillText('Hee hee! Pie face!', W / 2, gy - sz * 1.5); }
  } else {   // mummy: feathers tickle, the bandages fly off
    const unr = clamp((t - 3.5) / 3, 0, 1), lx = x, ly = gy - sz * 0.6 + bob + (t > 3 ? Math.sin(t * 20) * 6 : 0);
    g.save(); g.translate(lx, ly); g.rotate(t > 3 ? Math.sin(t * 16) * 0.12 : 0);
    ell(0, 0, sz * 0.32, sz * 0.5, '#efe6cf'); ell(0, -sz * 0.6, sz * 0.25, sz * 0.24, '#efe6cf');
    g.strokeStyle = '#c8b994'; g.lineWidth = 5;
    for (let i = 0; i < 9; i++) { if (i / 9 < unr) continue; const yy = -sz * 0.75 + i * sz * 0.14; g.beginPath(); g.moveTo(-sz * 0.3, yy); g.lineTo(sz * 0.3, yy + sz * 0.05); g.stroke(); }
    ell(-sz * 0.09, -sz * 0.62, sz * 0.05, sz * 0.06, '#222'); ell(sz * 0.09, -sz * 0.62, sz * 0.05, sz * 0.06, '#222');
    g.fillStyle = '#7a2a2a'; g.beginPath(); g.arc(0, -sz * 0.5, sz * (t > 3 ? 0.08 : 0.03), 0, Math.PI); g.fill();
    if (unr > 0.5) emoji('🩲', 0, sz * 0.15, sz * 0.32);
    g.restore();
    if (t > 2.6) for (let i = 0; i < 3; i++) emoji('🪶', lx + Math.cos(t * 9 + i * 2) * sz * 0.45, ly + Math.sin(t * 11 + i * 2) * sz * 0.4, sz * 0.25);
    for (let i = 0; i < 9; i++) if (i / 9 < unr) { const f = clamp((unr - i / 9) * 3, 0, 1); g.strokeStyle = '#efe6cf'; g.lineWidth = 8; g.beginPath(); g.moveTo(lx, ly - sz * 0.6 + i * sz * 0.14); g.quadraticCurveTo(lx + (i % 2 ? 1 : -1) * sz * f * 1.2, ly - sz * f, lx + (i % 2 ? 1 : -1) * sz * f * 2.2, ly - sz * 0.4 * f + i * 6); g.stroke(); }
    if (t > 3) { once('lol', () => { for (let i = 0; i < 8; i++) Sfx.tone(700 + i * 40, 900 + i * 60, 0.09, 'triangle', 0.12, i * 0.13); }); g.font = FONT(sz * 0.22); g.fillStyle = '#fff'; g.fillText('HA HA HEE HEE!', lx, ly - sz * 1.05); }
  }
  if (t > 3.2 && Math.random() < 0.7) confetti(4);
  if (t > 6.5) once('tada', () => Sfx.victory && Sfx.victory());
}

/* ===== scene drawing ===== */
function drawScene() {
  const sc = SCENES[S.scene];
  const sky = g.createLinearGradient(0, 0, 0, H); sc.sky.forEach((c, i) => sky.addColorStop(i / (sc.sky.length - 1), c)); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const m = Math.min(W, H);
  if (S.scene === 'house') {
    ell(W * 0.85, H * 0.18, m * 0.08, m * 0.08, '#fff3b0');
    g.fillStyle = '#2a1f4a'; g.beginPath(); g.moveTo(W * 0.1, H * 0.95); g.lineTo(W * 0.1, H * 0.35); g.lineTo(W * 0.5, H * 0.12); g.lineTo(W * 0.9, H * 0.35); g.lineTo(W * 0.9, H * 0.95); g.fill();
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,220,120,.35)'; rr(W * (0.15 + (i % 4) * 0.19), H * (0.42 + Math.floor(i / 4) * 0.22), W * 0.08, H * 0.1, 8); g.fill(); }
  } else if (S.scene === 'leaves') {
    for (let i = 0; i < 5; i++) { g.fillStyle = '#6a3a1a'; g.fillRect(W * (0.08 + i * 0.22), H * 0.3, m * 0.04, H * 0.6); ell(W * (0.08 + i * 0.22) + m * 0.02, H * 0.28, m * 0.16, m * 0.13, ['#ff7a2f', '#ffb800', '#d9482a', '#ff9a3d', '#c8641a'][i]); }
    for (let i = 0; i < 12; i++) emoji(i % 2 ? '🍁' : '🍂', ((i * 97 + S.t * 30) % (W + 40)) - 20, ((i * 61 + S.t * (40 + i * 3)) % (H + 40)) - 20, m * 0.05);
  } else if (S.scene === 'patch') {
    for (let i = 0; i < 4; i++) { g.strokeStyle = '#3a6a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, H * (0.55 + i * 0.12)); for (let x = 0; x <= W; x += 40) g.lineTo(x, H * (0.55 + i * 0.12) + Math.sin(x * 0.03 + i) * 10); g.stroke(); }
    g.fillStyle = '#7a4a2a'; g.fillRect(W * 0.05, H * 0.25, W * 0.9, 10);
    emoji('🧍', W * 0.5, H * 0.3, m * 0.1);
  } else if (S.scene === 'candy') {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#ff8fc8' : '#fff'; g.fillRect(i * W / 12, 0, W / 12 + 1, H * 0.1); }
    for (let r = 0; r < 3; r++) { g.fillStyle = '#a0704a'; g.fillRect(0, H * (0.32 + r * 0.22), W, 10); }
  } else {
    for (let r = 0; r < 3; r++) { g.fillStyle = '#5a3a2a'; g.fillRect(0, H * (0.3 + r * 0.24), W, 10); }
    for (let i = 0; i < 10; i++) ell((i * 131) % W, H * 0.9 - ((S.t * 30 + i * 47) % (H * 0.7)), 8 + (i % 3) * 4, 8 + (i % 3) * 4, 'rgba(160,255,140,.35)');
  }
  g.fillStyle = sc.ground; g.fillRect(0, H * 0.9, W, H * 0.1);
  for (const d of S.deco) { emoji(d.e, d.fx * W, S.areaTop * 0.3 + d.fy * (H - S.areaTop * 0.3), m * 0.06 * d.s + Math.sin(S.t * 2 + d.ph) * 2); }
  // flying bats
  for (let i = 0; i < 3; i++) emoji('🦇', ((S.t * (50 + i * 20) + i * 300) % (W + 100)) - 50, H * (0.15 + i * 0.1) + Math.sin(S.t * 3 + i) * 15, m * 0.05);
}
function drawCover(sp) {
  const c = sp.cell, cy = c.y + c.h * 0.58, w = Math.min(c.w * 0.82, Math.max(S.fs * 4, 120)), h = c.h * 0.42;
  const x = c.x;
  switch (sp.cover) {
    case 'pumpkin': ell(x, cy + h * 0.5, w * 0.5, h * 0.5, '#ff7a1a'); ell(x - w * 0.2, cy + h * 0.5, w * 0.18, h * 0.47, '#ff9a3d'); ell(x + w * 0.2, cy + h * 0.5, w * 0.18, h * 0.47, '#ff9a3d'); g.fillStyle = '#3a7a2a'; g.fillRect(x - 5, cy - 4, 10, 14);
      g.fillStyle = '#5a2a00'; g.beginPath(); g.moveTo(x - w * 0.22, cy + h * 0.35); g.lineTo(x - w * 0.12, cy + h * 0.22); g.lineTo(x - w * 0.04, cy + h * 0.35); g.fill(); g.beginPath(); g.moveTo(x + w * 0.04, cy + h * 0.35); g.lineTo(x + w * 0.12, cy + h * 0.22); g.lineTo(x + w * 0.22, cy + h * 0.35); g.fill();
      g.beginPath(); g.arc(x, cy + h * 0.55, w * 0.2, 0, Math.PI); g.fill(); break;
    case 'window': g.fillStyle = '#5a3a2a'; rr(x - w / 2, cy, w, h, 10); g.fill(); g.fillStyle = '#ffe08a'; rr(x - w / 2 + 8, cy + 8, w - 16, h - 16, 6); g.fill(); g.fillStyle = '#5a3a2a'; g.fillRect(x - 4, cy, 8, h); g.fillRect(x - w / 2, cy + h / 2 - 4, w, 8); emoji('🕸️', x + w * 0.38, cy + 10, 28); break;
    case 'grave': g.fillStyle = '#8a8aa0'; g.beginPath(); g.moveTo(x - w * 0.4, cy + h); g.lineTo(x - w * 0.4, cy + h * 0.3); g.arc(x, cy + h * 0.3, w * 0.4, Math.PI, 0); g.lineTo(x + w * 0.4, cy + h); g.fill(); g.fillStyle = '#5a5a70'; g.font = FONT(h * 0.25); g.textAlign = 'center'; g.fillText('BOO', x, cy + h * 0.5); break;
    case 'bush': for (let i = -2; i <= 2; i++) ell(x + i * w * 0.18, cy + h * 0.55, w * 0.18, h * 0.45, '#3a6a3a'); break;
    case 'leaves': for (let i = 0; i < 9; i++) ell(x + (i - 4) * w * 0.1, cy + h * (0.4 + (i % 3) * 0.2), w * 0.16, h * 0.28, ['#ff7a2f', '#ffb800', '#d9482a'][i % 3], i); break;
    case 'hay': g.fillStyle = '#e8c55a'; rr(x - w / 2, cy + h * 0.1, w, h * 0.9, 12); g.fill(); g.strokeStyle = '#b8902a'; g.lineWidth = 3; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x - w / 2 + 6, cy + h * 0.1 + i * h * 0.15); g.lineTo(x + w / 2 - 6, cy + h * 0.1 + i * h * 0.15); g.stroke(); } break;
    case 'jar': g.fillStyle = 'rgba(200,240,255,.92)'; rr(x - w * 0.42, cy + h * 0.05, w * 0.84, h * 0.95, 18); g.fill(); g.fillStyle = '#d94d8a'; rr(x - w * 0.46, cy, w * 0.92, h * 0.16, 8); g.fill(); for (let i = 0; i < 7; i++) emoji(['🍬', '🍭', '🍫'][i % 3], x - w * 0.3 + (i % 4) * w * 0.2, cy + h * (0.45 + Math.floor(i / 4) * 0.3), Math.min(30, h * 0.25)); break;
    case 'box': g.fillStyle = '#ff8fc8'; rr(x - w / 2, cy + h * 0.1, w, h * 0.9, 8); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 6, cy + h * 0.1, 12, h * 0.9); g.fillRect(x - w / 2, cy + h * 0.5, w, 10); break;
    case 'cauldron': ell(x, cy + h * 0.55, w * 0.48, h * 0.45, '#2a2a3a'); ell(x, cy + h * 0.15, w * 0.48, h * 0.12, '#7ef07a'); for (let i = 0; i < 3; i++) ell(x + (i - 1) * w * 0.2, cy + h * 0.1 - Math.abs(Math.sin(S.t * 3 + i)) * 10, 8, 8, '#b8ff9a'); break;
    case 'bottle': for (let i = -1; i <= 1; i++) { const bx = x + i * w * 0.3; ell(bx, cy + h * 0.65, w * 0.16, h * 0.35, ['#a66bff', '#ff5d8f', '#4dc4ff'][i + 1]); g.fillStyle = '#ccc'; g.fillRect(bx - 6, cy + h * 0.1, 12, h * 0.25); } break;
    case 'book': for (let i = 0; i < 4; i++) { g.fillStyle = ['#8a2a2a', '#2a5a8a', '#5a2a7a', '#2a7a4a'][i]; rr(x - w * 0.45 + i * 4, cy + h * (0.15 + i * 0.21), w * 0.9 - i * 8, h * 0.2, 4); g.fill(); } break;
  }
}
function drawTags() {
  if (S.sh) {   // shuffle swirl
    const k = clamp((S.t - S.sh.t0) / 0.8, 0, 1);
    S.sh.words.forEach((w, i) => { const f = S.sh.from[i], a = k * 6.28 + i * 1.256, rad = Math.min(W, H) * 0.18 * Math.sin(k * Math.PI);
      const x = f.x + (W / 2 - f.x) * Math.sin(k * Math.PI) + Math.cos(a) * rad, y = f.y + (H * 0.55 - f.y) * Math.sin(k * Math.PI) + Math.sin(a) * rad;
      g.globalAlpha = 1 - k * 0.9; tag(w, x, y, TAGC[i % TAGC.length], 0.8); g.globalAlpha = 1; });
    return;
  }
  for (const sp of S.spots) {
    if (sp.up > 0.02) {
      const r = tagRect(sp), c = sp.cell; sp.rect = r;
      g.save(); g.beginPath(); g.rect(c.x - c.w / 2, c.y - 4, c.w, c.h * 0.58 + c.h * 0.3); g.clip();
      const wob = S.t - sp.wob < 0.7 ? Math.sin((S.t - sp.wob) * 30) * 0.12 * (1 - (S.t - sp.wob) / 0.7) : 0;
      g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(wob); tag(sp.w, 0, 0, sp.col, 1); g.restore();
      // peeking eyes
      if (sp.up > 0.6) { ell(c.x - 12, r.y + r.h + 10, 7, 8, '#fff'); ell(c.x + 12, r.y + r.h + 10, 7, 8, '#fff'); ell(c.x - 12, r.y + r.h + 12, 3.5, 4, '#222'); ell(c.x + 12, r.y + r.h + 12, 3.5, 4, '#222'); }
    } else sp.rect = null;
    drawCover(sp);
  }
}
function tag(w, cx, cy, col, sc) {
  const fs = S.fs * sc; g.font = FONT(fs); const tw = g.measureText(w).width, bw = Math.max(tw + fs * 1.0, fs * 2.6, 70 * sc), bh = Math.max(fs * 1.45, 64 * sc);
  g.fillStyle = 'rgba(0,0,0,.25)'; rr(cx - bw / 2 + 3, cy - bh / 2 + 5, bw, bh, bh * 0.35); g.fill();
  g.fillStyle = '#fff'; rr(cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.35); g.fill(); g.lineWidth = Math.max(5, fs * 0.12); g.strokeStyle = col; g.stroke();
  g.fillStyle = '#2a1840'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(w, cx, cy + fs * 0.04);
}
const CONF = ['#ff7a2f', '#a66bff', '#5ee07a', '#ffd84d', '#ff5d8f', '#4dc4ff'];
function confetti(n) { for (let i = 0; i < n; i++) S.fx.push({ type: 'c', x: rnd(0, W), y: rnd(-60, -10), vx: rnd(-40, 40), vy: rnd(120, 260), t: 0, life: 6, col: pick(CONF), r: rnd(5, 10), rot: rnd(0, 6) }); }
function drawFx(dt) {
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i]; f.t += dt; if (f.t > f.life || f.y > H + 50) { S.fx.splice(i, 1); continue; }
    const a = 1 - f.t / f.life;
    if (f.type === 'p') { f.vy += 600 * dt; f.x += f.vx * dt; f.y += f.vy * dt; g.globalAlpha = a; ell(f.x, f.y, f.r, f.r, f.col); }
    else if (f.type === 'c') { f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 5; g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.fillStyle = f.col; g.fillRect(-f.r, -f.r / 2, f.r * 2, f.r); g.restore(); }
    else { g.globalAlpha = a; f.y -= 40 * dt; if (/^\p{Extended_Pictographic}/u.test(f.text)) emoji(f.text, f.x, f.y, f.size || 48); else { g.font = FONT(f.size || 40); g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#4a2a7a'; g.strokeText(f.text, f.x, f.y); g.fillStyle = f.col || '#ffd84d'; g.fillText(f.text, f.x, f.y); } }
    g.globalAlpha = 1;
  }
}

/* ===== HUD ===== */
function hud() {
  $s('sstars').textContent = '⭐'.repeat(S.streak) + '☆'.repeat(Math.max(0, 3 - S.streak));
  $s('sbank').textContent = '🐷 $' + S.bank;
  $s('smute').textContent = Music.muted ? '🔇' : '🎵';
  $s('sprompt').innerHTML = S.target && S.state !== 'shop' ? `<small>Find:</small>${S.target}` : '';
  $s('sprompt').style.visibility = S.target && /^(play|shuffle|intro)$/.test(S.state) ? 'visible' : 'hidden';
}
function shelf() { const s = $s('sshelf'); s.textContent = S.prizes.slice(-14).join(''); s.style.display = S.prizes.length ? 'block' : 'none'; }
$s('ssay').addEventListener('click', e => { e.stopPropagation(); Sfx.unlock(); if (S.state === 'play') prompt(); });
$s('smute').addEventListener('click', e => { e.stopPropagation(); Sfx.unlock(); Music.setMuted(!Music.muted); hud(); });
$s('smenu').addEventListener('click', e => { e.stopPropagation(); Voice.stop(); location.href = location.pathname; });

/* ===== spooky-cute music (rendered once, played through the game's Music bus so mute + voice ducking apply) ===== */
function renderSpooky() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return Promise.resolve(null);
  const SR = 32000, BPM = 116, beat = 60 / BPM, bar = beat * 4, BARS = 8, loopN = Math.round(BARS * bar * SR);
  let oc; try { oc = new OAC(1, loopN + SR, SR); } catch (_) { return Promise.resolve(null); }
  const out = oc.createGain(); out.gain.value = 0.45; out.connect(oc.destination);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const v = (type, m, t, d, vol, vib) => { const o = oc.createOscillator(), gg = oc.createGain(); o.type = type; o.frequency.value = hz(m);
    if (vib) { const l = oc.createOscillator(), lg = oc.createGain(); l.frequency.value = 5.5; lg.gain.value = hz(m) * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + 0.05); }
    gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(vol, t + 0.01); gg.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(gg); gg.connect(out); o.start(t); o.stop(t + d + 0.05); };
  // A minor "monster mash" walking bass + pizzicato + spooky theremin-ish melody
  const BASS = [45, 52, 57, 52, 45, 52, 57, 55, 41, 48, 53, 48, 40, 47, 52, 56];
  const CH = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [52, 56, 59]];
  const MEL = [76, -1, 72, 74, 76, -1, 79, -1, 77, -1, 74, -1, 72, 71, 69, -1, 69, 72, 76, -1, 74, 72, 71, -1, 68, -1, 71, -1, 76, -1, -1, -1];
  for (let b = 0; b < BARS; b++) {
    const t0 = b * bar, ci = Math.floor(b / 2) % 4;
    for (let i = 0; i < 4; i++) v('triangle', BASS[(ci * 4 + i) % 16] - 12 + 12, t0 + i * beat, beat * 0.9, 0.38);
    for (let i = 0; i < 8; i++) if (i % 2) CH[ci].forEach(m => v('square', m, t0 + i * beat / 2, 0.12, 0.035));
    for (let i = 0; i < 4; i++) { const m = MEL[(b % 4) * 8 + i * 2]; if (m > 0) v('sine', m, t0 + i * beat, beat * 1.6, 0.16, true); }
    if (b % 2 === 1) v('square', 88, t0 + beat * 3.5, 0.08, 0.04);   // little "boo" blip
  }
  return oc.startRendering().then(buf => { buf._loopEnd = loopN / SR; return buf; });
}
function startMusic() {
  if (!Music.rendering.spooky) Music.rendering.spooky = renderSpooky().then(b => { Music.bufs.spooky = b; return b; }).catch(() => null);
  Music.start('spooky');
}

/* ===== loop ===== */
let last = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now(), dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
  if (!S.active) return;
  S.t += dt; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (S.state === 'play' && S.t - S.lastPrompt > 7 && !Voice.src && !(Speech.ok && window.speechSynthesis && speechSynthesis.speaking)) prompt();
  tickSpots(dt);
  drawScene();
  if (S.state === 'trap' && S.trap) drawTrap();
  else if (!/^(shop|saving|gift)$/.test(S.state)) drawTags();
  if (S.state === 'party') drawParty();
  if (S.gift) { const k = ease((S.t - S.gift.t0) / 0.6); emoji(S.gift.e, W / 2, H * 0.5 - k * 30, Math.min(W, H) * 0.12 + 140 * k); if (Math.random() < 0.5) confetti(2); }
  drawDollar();
  drawFx(dt);
  hud();
}
requestAnimationFrame(frame);

/* ===== parent menu: reset Aaron's bank ===== */
(function resetBtn() {
  const st = document.getElementById('start'); if (!st) return;
  const b = document.createElement('button'); b.id = 'sreset'; b.textContent = "↺ Reset Aaron's piggy bank (Level 3)";
  b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); if (confirm("Reset Aaron's Level 3 piggy bank and prizes?")) { try { localStorage.removeItem(KEY); } catch (_) {} Object.assign(S, { bank: 0, prizes: [], won: [], total: 0 }); b.textContent = 'Piggy bank reset ✓'; } });
  st.appendChild(b);
})();

S.start = start; S.tagRect = tagRect; S.layoutNow = layout;
S.cheatWin = () => { S.streak = 2; const sp = S.spots.find(s => s.w === S.target); sp.st = 'up'; sp.up = 1; tap(sp); };
})();
