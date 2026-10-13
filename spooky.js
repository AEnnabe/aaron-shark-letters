/* v11: Level 3 – Aaron: Spooky Word Hunt.
   Five sight words hide in a busy (cute) Halloween scene and pop up / duck down. The narrator calls a word;
   find it 3 times in a row (shuffle after each find) to print it on a dollar for the piggy bank, then shop:
   a $1–2 prize, a $5 booby trap, or save. Bank + prizes persist in localStorage ('spooky.v1').
   Debug: ?level=3 (tap anywhere), ?bank=N (set bank), ?sw=word (first target), ?trap=stink|door (&victim=mama|papa|renee|nena|foze|omar|evan|andrew|audrey; no victim = show the picker). */
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
const TRAPS = ['stink', 'door'];
const TRAP_PRICE = 3, TRAP_SEC = 11.5, PARTY_EVERY = 8;
/* v12: booby-trap victims (generic cute cartoon family) */
const VICTIMS = [
  { id: 'mama', name: 'Mama', skin: '#f2c6a0', hair: '#5a3220', style: 'long', shirt: '#ff6fb1', pants: '#4a4a8a', lips: 1 },
  { id: 'papa', name: 'Papa', skin: '#e8b48a', hair: '#2a1a10', style: 'short', shirt: '#3a8ee6', pants: '#2a2a3a', beard: 1 },
  { id: 'renee', name: 'Abue Renee', skin: '#f0c8a8', hair: '#d8d8e0', style: 'bun', shirt: '#a66bff', pants: '#5a4a6a', old: 1, glasses: 1, lips: 1 },
  { id: 'nena', name: 'Abue Nena', skin: '#d9a07a', hair: '#c0c0c8', style: 'curly', shirt: '#2fbf9a', pants: '#3a5a5a', old: 1, glasses: 1, lips: 1 },
  { id: 'foze', name: 'Abue Foze', skin: '#e0aa82', hair: '#e8e8ee', style: 'bald', shirt: '#e8553d', pants: '#5a4a3a', old: 1, glasses: 1, stache: 1 },
  { id: 'omar', name: 'Tio Omar', skin: '#d29a70', hair: '#1a1a1a', style: 'spiky', shirt: '#ffb800', pants: '#2a4a7a', stache: 1 },
  { id: 'evan', name: 'Tio Evan', skin: '#f5cfaa', hair: '#c8742a', style: 'cap', shirt: '#2fbf5a', pants: '#3a3a4a', cap: '#e8553d' },
  { id: 'andrew', name: 'Andrew', skin: '#f0c098', hair: '#7a4a2a', style: 'short', shirt: '#ff7a2f', pants: '#2a5a9a', kid: 1 },
  { id: 'audrey', name: 'Audrey', skin: '#f5d0b0', hair: '#e0b040', style: 'pigtails', shirt: '#ff8fc8', pants: '#a66bff', kid: 1, lips: 1, bow: '#ff5d8f' },
];
const VBY = Object.fromEntries(VICTIMS.map(v => [v.id, v]));

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
#svict{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:1.5vmin;background:rgba(30,10,50,.72);padding:max(60px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom))}
#svict h2{margin:0;color:#fff;font-size:min(6.5vmin,44px);text-shadow:0 3px 0 #6a2a9a;text-align:center}
#svict .vrow{display:grid;grid-template-columns:repeat(5,auto);gap:1.6vmin;justify-content:center}
#svict button{appearance:none;border:4px solid #fff;border-radius:22px;background:#fff6d8;padding:4px 6px 6px;display:flex;flex-direction:column;align-items:center;cursor:pointer;touch-action:manipulation;box-shadow:0 6px 0 rgba(0,0,0,.3);font-weight:900;color:#4a2a7a;font-size:min(3vmin,20px)}
#svict button canvas{position:static;inset:auto;width:min(15vmin,110px);height:min(15vmin,110px)}
#svict button:active{transform:translateY(4px)}
@media (max-aspect-ratio:1/1){#svict .vrow{grid-template-columns:repeat(3,auto)}#svict button canvas{width:min(22vw,120px);height:min(22vw,120px)}#svict button{font-size:min(4vw,20px)}}
@media (max-height:500px){#svict{flex-direction:column;padding-top:56px}#svict h2{font-size:22px}#svict .vrow{grid-template-columns:repeat(5,auto);gap:6px}#svict button canvas{width:min(17vh,76px);height:min(17vh,76px)}#svict button{font-size:13px;padding:2px 4px;border-width:3px}}
#sreset{margin-top:8px;background:rgba(255,255,255,.25);color:#fff;border:2px solid rgba(255,255,255,.6);border-radius:16px;padding:6px 14px;font-weight:800;font-size:14px;cursor:pointer}
`;
document.head.appendChild(css);
const layer = document.createElement('div'); layer.id = 'slayer';
layer.innerHTML = `<canvas id="scv"></canvas>
<div id="shud"><div class="sb" id="sname">Level 3 – Aaron</div><div class="sb" id="sstars">☆☆☆</div><div class="sb" id="sbank">🐷 $0</div><span class="sp"></span><button id="ssay" aria-label="Hear it again">🔊</button><button id="smute" aria-label="Music on/off">🎵</button><button id="smenu" aria-label="Menu">🏠</button></div>
<div id="sprompt"></div><div id="sshelf"></div>
<div id="sshop"><h2>Buy a prize, or save up for a booby trap! 💣 = $3</h2><div class="row" id="sprizes"></div><div class="row"><button class="trap" id="strap" data-trap="stink"><span class="e">💣</span>Stink bomb!<span class="pr">💵💵💵</span></button><button class="trap" id="strap2" data-trap="door"><span class="e">🚪</span>Scary door!<span class="pr">💵💵💵</span></button><button class="save" id="ssave"><span class="e">🐷</span>Save my money!<span class="pr">&nbsp;</span></button></div></div>
<div id="svict"><h2>Who gets the booby trap?</h2><div class="vrow" id="svrow"></div></div>`;
document.body.appendChild(layer);
const cv = layer.querySelector('#scv'); let g = cv.getContext('2d');
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
const FONT = s => `700 ${Math.round(s)}px 'Fredoka', ui-rounded, "Arial Rounded MT Bold", "Comic Sans MS", system-ui, sans-serif`;
const TAGC = ['#ff7a2f', '#a66bff', '#2fbf5a', '#ff5d8f', '#2a9fd6', '#ffb800'];

/* ===== layout: 5 non-overlapping cells below the HUD ===== */
function hudBottom() { const h = $s('shud').getBoundingClientRect(); return h.bottom; }
function layout() {
  const top = hudBottom() + 8;
  const pr = $s('sprompt'); pr.style.top = top + 'px'; pr.innerHTML = `<small>Find:</small>${S.target || 'little'}`; pr.style.visibility = 'visible';
  const pb = pr.getBoundingClientRect().bottom + 14; S._prH = pr.offsetHeight;
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
  if (P.get('trap') && TRAPS.includes(P.get('trap'))) { S.state = 'play'; if (VBY[P.get('victim')]) playTrap(P.get('trap'), P.get('victim'), true); else pickVictim(P.get('trap')); return; }
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

/* ===== pop-up timing (v12: slower + bouncier; >=2 always up, staggered random) ===== */
const RISE = 0.6, FALL = 0.55, UP_MIN = 3.0, UP_MAX = 3.5;
const backOut = t => { t = clamp(t, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rise(sp) {
  sp.st = 'rising'; sp.t0 = S.t; sp.until = S.t + RISE; sp.upAt = S.t + RISE;
  if (S.state === 'play' || S.state === 'intro') {
    Sfx.pop(); Sfx.pop(0.07);
    const r = tagRect(Object.assign({}, sp, { up: 1 })), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; S.fx.push({ type: 'p', x: cx, y: cy + r.h * 0.4, vx: Math.cos(a) * rnd(120, 220), vy: Math.sin(a) * rnd(80, 160) - 120, t: 0, life: 0.6, col: pick(['#fff', '#ffd84d', sp.col]), r: rnd(3, 6) }); }
  }
}
function tickSpots(dt) {
  if (S.state === 'shuffle') return;
  const visible = () => S.spots.filter(s => s.st === 'up' || s.st === 'rising').length;
  for (const sp of S.spots) {
    if (S.t < sp.until) continue;
    if (sp.st === 'down') rise(sp);
    else if (sp.st === 'rising') { sp.st = 'up'; sp.t0 = S.t; sp.until = S.t + rnd(UP_MIN, UP_MAX); }
    else if (sp.st === 'up') {
      if (visible() <= 2) {   // never fewer than 2 up: bring another word up first, then duck this one
        const down = S.spots.filter(s => s.st === 'down');
        if (down.length) rise(down.find(s => s.w === S.target) || pick(down));
        sp.until = S.t + RISE + 0.05; continue;
      }
      sp.st = 'falling'; sp.t0 = S.t; sp.until = S.t + FALL;
    } else if (sp.st === 'falling') { sp.st = 'down'; sp.t0 = S.t; sp.until = S.t + rnd(0.4, 1.4); S.popLog.push({ w: sp.w, upFor: +(S.t - FALL - (sp.upAt || S.t)).toFixed(2) }); if (S.popLog.length > 200) S.popLog.shift(); }
  }
  let v = visible();
  while (v < 2) { const down = S.spots.filter(s => s.st === 'down'); if (!down.length) break; rise(down.find(s => s.w === S.target && S.t - s.t0 > 1.2) || pick(down)); v++; }
  const tsp = S.spots.find(s => s.w === S.target);
  if (tsp && tsp.st === 'down' && S.t - tsp.t0 > 2.5) rise(tsp);
  for (const sp of S.spots) {
    const k = sp.st === 'rising' ? (S.t - sp.t0) / RISE : sp.st === 'falling' ? (S.t - sp.t0) / FALL : 0;
    sp.up = sp.st === 'up' ? 1 : sp.st === 'down' ? 0 : sp.st === 'rising' ? Math.min(1, backOut(k)) : 1 - ease(k);
    sp.sc = sp.st === 'rising' ? 0.55 + 0.45 * backOut(k) : sp.st === 'falling' ? 1 - 0.3 * ease(k) : 1;   // bouncy overshoot (~1.15) then settles
  }
  if (S.state === 'play' && S.t > 3) S.visMin = Math.min(S.visMin, S.spots.filter(s => s.up > 0.5).length);
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
  const one = pick(PRIZES.filter(p => p.price === 1)); const opts = shuffle([one, ...shuffle(PRIZES.filter(p => p !== one)).slice(0, 1)]);   // always one $1 prize
  opts.forEach(pz => {
    const b = document.createElement('button'); b.className = 'prize' + (S.bank < pz.price ? ' no' : ''); b.dataset.price = pz.price;
    b.innerHTML = `<span class="e">${pz.e}</span>${pz.name}<span class="pr">${'💵'.repeat(pz.price)}</span>`;
    b.addEventListener('click', e => { e.stopPropagation(); buy(pz); });
    box.appendChild(b);
  });
  ['strap', 'strap2'].forEach(id => $s(id).classList.toggle('no', S.bank < TRAP_PRICE));
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
['strap', 'strap2'].forEach(id => $s(id).addEventListener('click', e => {
  e.stopPropagation(); if (S.state !== 'shop') return;
  if (S.bank < TRAP_PRICE) { Sfx.tone(300, 200, 0.15, 'sine', 0.2); say('sp_need'); return; }
  S.bank -= TRAP_PRICE; store.save(S); hud(); closeShop(); pickVictim($s(id).dataset.trap);
}));
/* victim picker: big picture buttons (canvas portraits) with names */
function pickVictim(kind) {
  S.state = 'victim'; S.pendingTrap = kind;
  const row = $s('svrow'); row.innerHTML = '';
  VICTIMS.forEach(v => {
    const b = document.createElement('button'); b.dataset.victim = v.id;
    const c = document.createElement('canvas'); c.width = 160; c.height = 160; b.appendChild(c);
    const n = document.createElement('span'); n.textContent = v.name; b.appendChild(n);
    const cg = c.getContext('2d'); const og = g; g = cg; g.setTransform(1, 0, 0, 1, 0, 0); drawPerson(v, 80, v.kid ? 262 : 255, v.kid ? 250 : 210, { face: 'happy', t: 0, bust: true }); g = og;
    b.addEventListener('click', e => { e.stopPropagation(); if (S.state !== 'victim') return; $s('svict').style.display = 'none'; playTrap(S.pendingTrap, v.id); });
    row.appendChild(b);
  });
  $s('svict').style.display = 'flex';
  say('sp_who');
}
function nextWord() {
  if (!S.active) return;
  newRound(null, false); S.state = 'play'; prompt();
}

/* ===== v12 booby traps: stink bomb + scary door, starring the victim Aaron picked (~11.5 s) ===== */
function drawPerson(v, x, y, s, o = {}) {
  const k = v.kid ? 0.78 : 1; s *= k;
  const face = o.face || 'happy', t = o.t || 0, hr = s * 0.17, hx = x, hy = y - s * 0.8;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (!o.bust) {   // legs + shoes
    const sw = o.walk ? Math.sin(t * 12) * s * 0.06 : 0;
    g.strokeStyle = v.pants; g.lineWidth = s * 0.1;
    g.beginPath(); g.moveTo(x - s * 0.07, y - s * 0.4); g.lineTo(x - s * 0.08 + sw, y - s * 0.03); g.moveTo(x + s * 0.07, y - s * 0.4); g.lineTo(x + s * 0.08 - sw, y - s * 0.03); g.stroke();
    ell(x - s * 0.1 + sw, y - s * 0.02, s * 0.07, s * 0.035, '#3a2a2a'); ell(x + s * 0.1 - sw, y - s * 0.02, s * 0.07, s * 0.035, '#3a2a2a');
  }
  // arms
  const up = o.arms === 'up' ? 1 : 0;
  g.strokeStyle = v.shirt; g.lineWidth = s * 0.075;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * s * 0.15, y - s * 0.62); g.lineTo(x + sx * s * (0.26 + up * 0.04), y - s * (up ? 0.92 + Math.sin(t * 20) * 0.03 : 0.38)); g.stroke(); ell(x + sx * s * (0.26 + up * 0.04), y - s * (up ? 0.95 : 0.36), s * 0.04, s * 0.04, v.skin); }
  // torso
  g.fillStyle = v.shirt; rr(x - s * 0.17, y - s * 0.68, s * 0.34, s * 0.32, s * 0.08); g.fill();
  if (v.old) { g.fillStyle = 'rgba(255,255,255,.35)'; rr(x - s * 0.03, y - s * 0.68, s * 0.06, s * 0.32, 3); g.fill(); }   // cardigan stripe
  if (v.bow && v.kid) ell(x, y - s * 0.66, s * 0.04, s * 0.03, v.bow);
  g.fillStyle = v.skin; g.fillRect(x - s * 0.04, y - s * 0.72, s * 0.08, s * 0.06);   // neck
  // hair behind
  const hairUp = face === 'scared';
  if (v.style === 'long') { g.fillStyle = v.hair; rr(hx - hr * 1.15, hy - hr * 0.6, hr * 2.3, hr * 2.0, hr * 0.6); g.fill(); }
  if (v.style === 'pigtails') { ell(hx - hr * 1.15, hy + hr * 0.2, hr * 0.35, hr * 0.6, v.hair); ell(hx + hr * 1.15, hy + hr * 0.2, hr * 0.35, hr * 0.6, v.hair); }
  ell(hx, hy, hr, hr * 1.05, face === 'gag' ? '#b8d89a' : v.skin);   // head (green when gagging)
  ell(hx - hr, hy + hr * 0.1, hr * 0.18, hr * 0.25, v.skin); ell(hx + hr, hy + hr * 0.1, hr * 0.18, hr * 0.25, v.skin);
  // hair on top
  g.fillStyle = v.hair;
  if (hairUp) { g.strokeStyle = v.hair; g.lineWidth = hr * 0.18; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(hx + i * hr * 0.22, hy - hr * 0.8); g.lineTo(hx + i * hr * 0.35, hy - hr * 1.7 - Math.abs(Math.sin(t * 30 + i)) * hr * 0.2); g.stroke(); } }
  else if (v.style === 'bald') { ell(hx - hr * 0.95, hy - hr * 0.1, hr * 0.25, hr * 0.4, v.hair); ell(hx + hr * 0.95, hy - hr * 0.1, hr * 0.25, hr * 0.4, v.hair); }
  else if (v.style === 'bun') { g.beginPath(); g.arc(hx, hy - hr * 0.1, hr * 1.05, Math.PI * 1.05, Math.PI * 1.95); g.fill(); ell(hx, hy - hr * 1.15, hr * 0.42, hr * 0.38, v.hair); }
  else if (v.style === 'curly') { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.0 + i / 8); ell(hx + Math.cos(a) * hr * 1.0, hy - hr * 0.05 + Math.sin(a) * hr * 1.0, hr * 0.32, hr * 0.32, v.hair); } }
  else if (v.style === 'spiky') { g.beginPath(); g.moveTo(hx - hr, hy - hr * 0.3); for (let i = 0; i <= 6; i++) g.lineTo(hx - hr + i * hr / 3, hy - hr * (i % 2 ? 1.45 : 0.9)); g.lineTo(hx + hr, hy - hr * 0.3); g.fill(); }
  else if (v.style === 'cap') { g.beginPath(); g.arc(hx, hy - hr * 0.15, hr * 1.02, Math.PI, 0); g.fillStyle = v.cap; g.fill(); g.fillRect(hx, hy - hr * 0.25, hr * 1.5, hr * 0.2); }
  else { g.beginPath(); g.arc(hx, hy - hr * 0.1, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.fill(); if (v.style === 'long' || v.style === 'pigtails') ell(hx + hr * 0.3, hy - hr * 0.75, hr * 0.6, hr * 0.3, v.hair, 0.3); }
  if (v.bow) ell(hx + hr * 0.75, hy - hr * 0.8, hr * 0.28, hr * 0.18, v.bow);
  // face
  const ex = hr * 0.38, ey = hy - hr * 0.1;
  g.strokeStyle = '#2a1a1a'; g.lineWidth = Math.max(2, hr * 0.1); g.fillStyle = '#2a1a1a';
  if (face === 'gag') { for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(hx + sx * ex - hr * 0.15, ey - hr * 0.12); g.lineTo(hx + sx * ex + hr * 0.15 * sx * 0 , ey); g.lineTo(hx + sx * ex - hr * 0.15, ey + hr * 0.12); g.stroke(); }
    g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(hx - hr * 0.35 + i * hr * 0.12, hy + hr * 0.45 + (i % 2 ? -1 : 1) * hr * 0.07); g.stroke(); ell(hx + hr * 0.08, hy + hr * 0.62, hr * 0.12, hr * 0.16, '#ff7a9a'); }
  else if (face === 'faint') { for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(hx + sx * ex - hr * 0.13, ey - hr * 0.13); g.lineTo(hx + sx * ex + hr * 0.13, ey + hr * 0.13); g.moveTo(hx + sx * ex + hr * 0.13, ey - hr * 0.13); g.lineTo(hx + sx * ex - hr * 0.13, ey + hr * 0.13); g.stroke(); } ell(hx, hy + hr * 0.5, hr * 0.14, hr * 0.12, '#5a2a2a'); }
  else if (face === 'scared') { for (const sx of [-1, 1]) { ell(hx + sx * ex, ey, hr * 0.24, hr * 0.28, '#fff'); g.lineWidth = 2; g.beginPath(); g.ellipse(hx + sx * ex, ey, hr * 0.24, hr * 0.28, 0, 0, 6.283); g.stroke(); ell(hx + sx * ex, ey, hr * 0.08, hr * 0.08, '#2a1a1a'); } ell(hx, hy + hr * 0.55, hr * 0.24, hr * 0.3, '#5a1a1a'); }
  else { ell(hx - ex, ey, hr * 0.09, hr * 0.11, '#2a1a1a'); ell(hx + ex, ey, hr * 0.09, hr * 0.11, '#2a1a1a'); g.beginPath(); g.arc(hx, hy + hr * 0.3, hr * 0.32, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); ell(hx - hr * 0.6, hy + hr * 0.3, hr * 0.13, hr * 0.08, 'rgba(255,120,140,.45)'); ell(hx + hr * 0.6, hy + hr * 0.3, hr * 0.13, hr * 0.08, 'rgba(255,120,140,.45)'); }
  if (v.glasses) { g.strokeStyle = '#5a3a2a'; g.lineWidth = Math.max(2, hr * 0.07); for (const sx of [-1, 1]) { g.beginPath(); g.arc(hx + sx * ex, ey, hr * 0.27, 0, 6.283); g.stroke(); } g.beginPath(); g.moveTo(hx - ex + hr * 0.27, ey); g.lineTo(hx + ex - hr * 0.27, ey); g.stroke(); }
  if (v.stache) { ell(hx - hr * 0.17, hy + hr * 0.24, hr * 0.2, hr * 0.08, v.old ? '#e8e8ee' : v.hair, 0.2); ell(hx + hr * 0.17, hy + hr * 0.24, hr * 0.2, hr * 0.08, v.old ? '#e8e8ee' : v.hair, -0.2); }
  if (v.beard) { g.fillStyle = 'rgba(42,26,16,.45)'; g.beginPath(); g.arc(hx, hy + hr * 0.2, hr * 0.85, 0.1 * Math.PI, 0.9 * Math.PI); g.fill(); }
  if (v.old && face === 'happy') { g.strokeStyle = 'rgba(120,70,50,.4)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx - hr * 0.3, hy - hr * 0.55); g.lineTo(hx + hr * 0.3, hy - hr * 0.55); g.stroke(); }
  g.restore();
}
function nameLabel(v, x, y, size) { g.font = FONT(size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#3a1a5a'; g.strokeText(v.name, x, y); g.fillStyle = '#fff'; g.fillText(v.name, x, y); }
function playTrap(kind, victim, debug) {
  const v = VBY[victim] || VICTIMS[0];
  S.state = 'trap'; S.trap = { kind, v, t0: S.t, debug, ev: {} }; S.trapsPlayed = (S.trapsPlayed || 0) + 1;
  Music.start('party');
  say('sp_' + kind + '_' + v.id);
  const tok = S.trapTok = (S.trapTok || 0) + 1;
  setTimeout(() => { if (!S.active || S.trapTok !== tok) return; S.trap = null; Music.start('spooky'); nextWord(); }, TRAP_SEC * 1000);
}
function once(id, fn) { if (!S.trap.ev[id]) { S.trap.ev[id] = 1; fn(); } }
function bigText(txt, x, y, size, col) { g.font = FONT(size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = '#3a1a5a'; g.strokeText(txt, x, y); g.fillStyle = col || '#fff'; g.fillText(txt, x, y); }
const thud = () => { Sfx.tone(140, 50, 0.25, 'sine', 0.35); Sfx.noise(0.18, 'lowpass', 400, 0.8, 0.35); };
const scream = () => { Sfx.tone(500, 1300, 0.55, 'sawtooth', 0.07); Sfx.tone(520, 1350, 0.55, 'square', 0.04, 0.02); Sfx.noise(0.4, 'bandpass', 2400, 1.2, 0.12); };
const slam = () => { Sfx.noise(0.2, 'lowpass', 300, 0.7, 0.6); Sfx.tone(90, 40, 0.3, 'sine', 0.4); };
function drawTrap() {
  const T = S.trap, v = T.v, t = S.t - T.t0;
  const top = S.areaTop || 120, gy = H - Math.max(40, H * 0.08), sz = Math.min((gy - top) * 0.85, W * 0.32);
  g.fillStyle = 'rgba(20,0,40,.35)'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, gy, W, H - gy);
  bigText(T.kind === 'stink' ? 'STINK BOMB! 💣' : 'SCARY DOOR! 🚪', W / 2, top + Math.min(W * 0.05, 34), Math.min(W * 0.07, 50));
  if (T.kind === 'stink') {
    // timeline: 0-1.2 bomb arcs in; 1.2-2.8 gagging; then 3+ faint / get up / crawl cycles; 10.4 gotcha
    const C0 = 2.8, CY = 2.5, nC = 3;
    let x = W * 0.3, rot = 0, face = 'happy', walk = false, shake = 0;
    const ci = Math.floor((t - C0) / CY), ct = (t - C0) - ci * CY;
    const crawled = clamp(ci, 0, nC) * sz * 0.45 + (ci >= 0 && ci < nC ? clamp((ct - 1.4) / 0.8, 0, 1) * sz * 0.45 : 0);
    x += t > C0 ? crawled : 0;
    if (t > 1.2) face = 'gag';
    if (t > 1.2 && t < C0) shake = Math.sin(t * 40) * 4;
    if (t >= C0 && ci < nC) {
      if (ct < 0.45) { rot = ease(ct / 0.45) * Math.PI / 2 * (ci === 0 ? 1 : 1); face = 'faint'; if (ct < 0.45 && ct > 0.4) {} }
      else if (ct < 1.1) { rot = Math.PI / 2; face = 'faint'; }
      else if (ct < 1.4) { rot = Math.PI / 2 - ease((ct - 1.1) / 0.3) * (Math.PI / 2 - 1.05); face = 'gag'; }
      else if (ct < 2.2) { rot = 1.05 + Math.sin(ct * 14) * 0.06; face = 'gag'; walk = true; }
      else { rot = 1.05 - ease((ct - 2.2) / 0.3) * 0.5; face = 'gag'; }
      if (ct > 0.42) once('thud' + ci, () => { thud(); S.fx.push({ type: 'txt', text: ['THUD!', 'BONK!', 'FLOP!'][ci % 3], x: x + sz * 0.6, y: gy - sz * 0.4, t: 0, life: 1, size: 44, col: '#ffd84d' }); if (ci === 0) say('sp_faint'); if (ci === 1) say('sp_crawl'); });
    } else if (t >= C0) { rot = Math.PI / 2; face = 'faint'; }
    // bomb
    const bx = W * 0.3 + sz * 0.55, land = clamp(t / 1.2, 0, 1);
    const bpx = W + 40 + (bx - W - 40) * land, bpy = (top + 40) + (gy - 20 - top - 40) * land - Math.sin(land * Math.PI) * sz * 0.5;
    g.save(); g.translate(bpx, bpy); g.rotate(land * 8); emoji('💣', 0, 0, sz * 0.28); g.restore();
    if (t > 1.2) once('land', () => { Sfx.poof(); say('sp_smelly'); });
    // stink clouds + flies (follow the victim)
    if (t > 1.2) {
      const n = Math.min(14, Math.floor((t - 1.2) * 6));
      for (let i = 0; i < n; i++) { const a = i * 2.4 + t * 0.6, rr2 = sz * (0.25 + (i % 4) * 0.12); g.globalAlpha = 0.45; ell((bx + x) / 2 + Math.cos(a) * rr2 * 1.4, gy - sz * 0.45 + Math.sin(a * 1.3) * rr2 * 0.8, sz * 0.16, sz * 0.12, i % 2 ? '#7ed957' : '#a8e86a'); g.globalAlpha = 1; }
      for (let i = 0; i < 5; i++) emoji('🪰', x + Math.cos(t * (5 + i) + i * 2) * sz * 0.45, gy - sz * 0.9 + Math.sin(t * (7 + i) + i) * sz * 0.3, sz * 0.09);
      for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(110,200,80,.8)'; g.lineWidth = 5; g.beginPath(); const sx = bx - sz * 0.1 + i * sz * 0.1; for (let j = 0; j < 8; j++) g.lineTo(sx + Math.sin(t * 6 + j + i) * 8, gy - 30 - j * sz * 0.07); g.stroke(); }
    }
    g.save(); g.translate(x + shake, gy); g.rotate(rot); drawPerson(v, 0, 0, sz, { face, t, walk }); g.restore();
    if (face === 'faint') for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; emoji(i % 2 ? '💫' : '⭐', x + sz * 0.8 + Math.cos(a) * sz * 0.15, gy - sz * 0.25 + Math.sin(a) * sz * 0.06, sz * 0.1); }
    if (t > 1.3 && t < C0) bigText('Pee-yew! 🤢', x, gy - sz * 1.15, Math.min(W * 0.05, 36), '#b8ff9a');
    nameLabel(v, x, Math.min(H - 16, gy + 22), Math.min(W * 0.045, 30));
  } else {
    // scary door: 3 cycles of open -> BOO -> jump + scream -> slam -> tiptoe back
    const dx = W * 0.32, dw = sz * 0.55, dh = sz * 1.05, C0 = 1.0, CY = 3.3, nC = 3;
    const ci = Math.floor((t - C0) / CY), ct = (t - C0) - ci * CY, act = t >= C0 && ci < nC;
    let open = 0, jump = 0, face = 'happy', arms = '', back = 0, walk = false;
    if (act) {
      open = ct < 0.8 ? ease(ct / 0.8) : ct < 1.9 ? 1 : ct < 2.1 ? 1 - ease((ct - 1.9) / 0.2) : 0;
      if (ct > 0.85 && ct < 2.2) { face = 'scared'; arms = 'up'; jump = ct < 1.5 ? Math.sin((ct - 0.85) / 0.65 * Math.PI) * sz * 0.45 : 0; }
      back = ct < 0.85 ? 0 : ct < 1.5 ? ease((ct - 0.85) / 0.65) * sz * 0.35 : ct < 2.4 ? sz * 0.35 : sz * 0.35 * (1 - ease((ct - 2.4) / 0.8));
      walk = ct > 2.4;
      if (ct > 2.2 && ct < 2.4) face = 'scared';
      if (ct > 0.85) once('boo' + ci, () => { scream(); S.fx.push({ type: 'txt', text: 'AAAAH!', x: dx + dw * 1.6, y: gy - sz * 1.2, t: 0, life: 1.1, size: 54, col: '#ff5d8f' }); if (ci === 0) say('sp_scream'); });
      if (ct > 2.05) once('slam' + ci, () => { slam(); S.fx.push({ type: 'txt', text: 'SLAM!', x: dx, y: gy - dh - 10, t: 0, life: 0.9, size: 44, col: '#ffd84d' }); });
      if (ct > 2.6 && ci < nC - 1) once('again' + ci, () => say('sp_again_door'));
    }
    // wall + door frame
    g.fillStyle = '#6a4a8a'; g.fillRect(dx - dw * 0.75, gy - dh - sz * 0.15, dw * 1.5, dh + sz * 0.15);
    g.fillStyle = '#1a0a2a'; g.fillRect(dx - dw / 2, gy - dh, dw, dh);
    // scarer pops out of the dark doorway
    if (act && open > 0.3 && ct > 0.75 && ct < 2.1) {
      const sc = ease(clamp((ct - 0.75) / 0.25, 0, 1)) * (1 + 0.1 * Math.sin(ct * 20)), who = ['👻', '🎃', '🕷️'][ci % 3];
      if (who === '🕷️') { g.strokeStyle = '#ddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(dx, gy - dh); g.lineTo(dx, gy - dh * 0.55); g.stroke(); }
      g.save(); g.translate(dx + dw * 0.1, gy - dh * 0.5); g.scale(sc, sc); emoji(who, 0, 0, dw * 1.1); g.restore();
      if (ct < 1.4) bigText('BOO!', dx + dw * 0.1, gy - dh - 24, Math.min(W * 0.06, 44), '#ffd84d');
    }
    // door panel (hinged on the left, swings open)
    const pw = dw * (1 - open * 0.85);
    g.fillStyle = '#c8742a'; g.fillRect(dx - dw / 2, gy - dh, pw, dh); g.strokeStyle = '#7a4a1a'; g.lineWidth = 4; g.strokeRect(dx - dw / 2, gy - dh, pw, dh);
    ell(dx - dw / 2 + pw * 0.85, gy - dh * 0.5, Math.max(2, dw * 0.05 * (1 - open)), dw * 0.05, '#ffd84d');
    emoji('🎃', dx + dw * 0.75, gy - sz * 0.12, sz * 0.2);
    const vx = dx + dw * 1.25 + back;
    g.save(); g.translate(vx, gy - jump); if (face === 'scared') g.translate(Math.sin(t * 50) * 3, 0); drawPerson(v, 0, 0, sz * 0.95, { face, t, arms, walk }); g.restore();
    nameLabel(v, vx, Math.min(H - 16, gy + 22), Math.min(W * 0.045, 30));
  }
  if (t > TRAP_SEC - 1.6) { once('done', () => { say('sp_trapdone'); Sfx.victory && Sfx.victory(); }); bigText('GOTCHA! 😂', W / 2, H * 0.42, Math.min(W * 0.09, 64), '#ffd84d'); if (Math.random() < 0.8) confetti(4); }
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
      g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(wob); const sc = sp.sc || 1; g.scale(sc, sc);
      if (sp.st === 'up' || sp.st === 'rising') { g.shadowColor = sp.col; g.shadowBlur = 14 + 12 * Math.sin(S.t * 5 + sp.cell.x); }   // glow pulse while up
      tag(sp.w, 0, 0, sp.col, 1 + (sp.st === 'up' ? 0.04 * Math.sin(S.t * 5 + sp.cell.x) : 0)); g.restore();
      // peeking eyes
      if (sp.up > 0.6) { ell(c.x - 12, r.y + r.h + 10, 7, 8, '#fff'); ell(c.x + 12, r.y + r.h + 10, 7, 8, '#fff'); ell(c.x - 12, r.y + r.h + 12, 3.5, 4, '#222'); ell(c.x + 12, r.y + r.h + 12, 3.5, 4, '#222'); }
    } else sp.rect = null;
    drawCover(sp);
  }
}
function tag(w, cx, cy, col, sc) {
  const fs = S.fs * sc; g.font = FONT(fs); const tw = g.measureText(w).width, bw = Math.max(tw + fs * 1.0, fs * 2.6, 70 * sc), bh = Math.max(fs * 1.45, 64 * sc);
  g.fillStyle = 'rgba(20,0,40,.28)'; rr(cx - bw / 2 + 2, cy - bh / 2 + 6, bw, bh, bh * 0.42); g.fill();   // v13: soft drop shadow
  const tg = g.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#f3eeff');
  g.fillStyle = tg; rr(cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.42); g.fill(); g.lineWidth = Math.max(5, fs * 0.12); g.strokeStyle = col; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)'; rr(cx - bw / 2 + 8, cy - bh / 2 + 5, bw - 16, bh * 0.28, bh * 0.14); g.fill();
  g.fillStyle = '#2a1840'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(w, cx, cy + fs * 0.04);
}
const CONF = ['#ff7a2f', '#a66bff', '#5ee07a', '#ffd84d', '#ff5d8f', '#4dc4ff'];
function confetti(n) { for (let i = 0; i < n; i++) S.fx.push({ type: 'c', x: rnd(0, W), y: rnd(-60, -10), vx: rnd(-40, 40), vy: rnd(120, 260), t: 0, life: 6, col: pick(CONF), r: rnd(5, 10), rot: rnd(0, 6) }); }
function drawFx(dt) {
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const f = S.fx[i]; f.t += dt; if (f.t > f.life || f.y > H + 50) { S.fx.splice(i, 1); continue; }
    const a = 1 - f.t / f.life;
    if (f.type === 'p') { f.vy += 600 * dt; f.x += f.vx * dt; f.y += f.vy * dt; g.globalAlpha = a; ell(f.x, f.y, f.r, f.r, f.col); }
    else if (f.type === 'c') {   // v13: fluttering confetti: ribbons, dots and little stars with a shine
      f.x += (f.vx + Math.sin(f.t * 3 + f.rot) * 40) * dt; f.y += f.vy * dt; f.rot += dt * 4; const fl = Math.cos(f.t * 9 + f.r); g.globalAlpha = 1;
      g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.scale(1, fl); g.fillStyle = f.col; const sh = (f.r * 7 | 0) % 3;
      if (sh === 0) { g.beginPath(); g.roundRect ? g.roundRect(-f.r, -f.r * 0.4, f.r * 2, f.r * 0.8, f.r * 0.3) : g.rect(-f.r, -f.r * 0.4, f.r * 2, f.r * 0.8); g.fill(); }
      else if (sh === 1) { g.beginPath(); g.arc(0, 0, f.r * 0.6, 0, 6.283); g.fill(); }
      else { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, rr2 = i % 2 ? f.r * 0.45 : f.r; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill(); }
      if (fl > 0.6) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-f.r * 0.6, -f.r * 0.3, f.r * 0.5, f.r * 0.25); }
      g.restore(); }
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
  else if (!/^(shop|saving|gift|victim)$/.test(S.state)) drawTags();
  if (S.state === 'party') drawParty();
  if (S.gift) { const k = ease((S.t - S.gift.t0) / 0.6); emoji(S.gift.e, W / 2, H * 0.5 - k * 30, Math.min(W, H) * 0.12 + 140 * k); if (Math.random() < 0.5) confetti(2); }
  drawDollar();
  if (!S.vig || S.vig.w !== W || S.vig.h !== H) { const r = g.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(15,0,35,.32)'); S.vig = { w: W, h: H, r }; }
  g.fillStyle = S.vig.r; g.fillRect(0, 0, W, H);   // v13: soft vignette
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

if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(() => { const pr = $s('sprompt'); if (S.active && pr && pr.offsetHeight !== S._prH) layout(); })).observe($s('sprompt'));
S.start = start; S.tagRect = tagRect; S.layoutNow = layout;
S.cheatWin = () => { S.streak = 2; const sp = S.spots.find(s => s.w === S.target); sp.st = 'up'; sp.up = 1; tap(sp); };
})();
