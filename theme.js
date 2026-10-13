/* v13: modern look for the whole game (loaded last so it wins the cascade).
   Self-hosted Fredoka (rounded), soft-gradient glassy cards, glossy press-able buttons, a cleaner glass HUD,
   eased screen transitions. Pure CSS: no gameplay or layout-box changes (sizes stay as before, so the overlap
   rules and tests are unaffected). */
(() => {
'use strict';
const css = document.createElement('style'); css.id = 'v13theme';
css.textContent = `
@font-face{font-family:'Fredoka';font-style:normal;font-weight:400 700;font-display:swap;src:url(fredoka.woff2?v=13) format('woff2');}
:root{--font:'Fredoka', ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Avenir Next", system-ui, -apple-system, sans-serif;
  --glass:rgba(255,255,255,.78);--glassB:rgba(255,255,255,.9);--ink:#3b2266;--shadow:0 6px 18px rgba(20,10,60,.22),0 1px 3px rgba(20,10,60,.18);}
body,button{font-family:var(--font) !important;}
@keyframes v13in{from{opacity:0;transform:scale(1.025)}to{opacity:1;transform:none}}
@keyframes v13pop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
#rlayer,#slayer{animation:v13in .38s cubic-bezier(.2,.8,.2,1)}
.rpanel,#sshop,#svict{animation:v13in .3s ease-out;}

/* ---------- menu ---------- */
#start.rstart{background:radial-gradient(120% 90% at 50% 0%, rgba(120,200,255,.18), rgba(6,40,90,.25) 45%, rgba(3,20,55,.62)) !important;}
#start.rstart h1{font-weight:700 !important;letter-spacing:.5px;text-shadow:0 2px 0 rgba(6,40,90,.35),0 8px 24px rgba(0,20,60,.35) !important;}
#start.rstart h1 .abc{background:linear-gradient(180deg,#fff3a8,#ffc93d 60%,#ff9f1c);-webkit-background-clip:text;background-clip:text;color:transparent !important;filter:drop-shadow(0 2px 0 rgba(120,60,0,.35));}
.rgroup{background-image:linear-gradient(160deg,rgba(255,255,255,.34) 0%,rgba(255,255,255,.06) 42%,rgba(0,0,0,.16) 100%) !important;
  border:1.5px solid rgba(255,255,255,.55) !important;border-radius:26px !important;
  box-shadow:0 10px 26px rgba(4,20,60,.32),0 2px 6px rgba(4,20,60,.2),inset 0 1px 0 rgba(255,255,255,.55) !important;
  transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .18s;animation:v13pop .45s cubic-bezier(.2,.8,.2,1) both}
.rgroup:nth-child(2){animation-delay:.03s}.rgroup:nth-child(3){animation-delay:.06s}.rgroup:nth-child(4){animation-delay:.09s}.rgroup:nth-child(5){animation-delay:.12s}
.rgroup:nth-child(6){animation-delay:.15s}.rgroup:nth-child(7){animation-delay:.18s}.rgroup:nth-child(8){animation-delay:.21s}.rgroup:nth-child(9){animation-delay:.24s}
.rgroup:active{transform:scale(.97)}
.rgroup .gname{font-weight:700 !important;text-shadow:0 1px 0 rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.18) !important}
.rgroup .gicon{filter:drop-shadow(0 4px 6px rgba(0,0,0,.22))}
.rgroup button{background:radial-gradient(circle at 34% 28%,#fffbe0 0%,#ffe36e 32%,#ffc928 62%,#f0a500 100%) !important;color:#3b2266 !important;font-weight:700 !important;
  box-shadow:0 4px 0 #c47f00,0 8px 14px rgba(80,40,0,.3),inset 0 -3px 6px rgba(200,110,0,.35),inset 0 2px 2px rgba(255,255,255,.8) !important;
  transition:transform .12s cubic-bezier(.2,.8,.2,1),box-shadow .12s}
.rgroup button:active{transform:translateY(3px) scale(.95) !important;box-shadow:0 1px 0 #c47f00,0 3px 6px rgba(80,40,0,.3),inset 0 -2px 4px rgba(200,110,0,.35) !important}
.rgroup small{font-weight:600 !important;opacity:1 !important;color:rgba(255,255,255,.96) !important;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.rgroup small span{font-weight:500;opacity:.85 !important}
#sreset{background:rgba(255,255,255,.14) !important;border:1px solid rgba(255,255,255,.45) !important;font-weight:600 !important}

/* ---------- Aaron's shark HUD (index) ---------- */
.cornerbtn,#lvl{background:linear-gradient(180deg,rgba(255,255,255,.32),rgba(255,255,255,.12)) !important;border:1.5px solid rgba(255,255,255,.6) !important;
  box-shadow:0 6px 16px rgba(0,25,70,.28),inset 0 1px 0 rgba(255,255,255,.6) !important;}
.cornerbtn:active{transform:scale(.92)}
#strip span{box-shadow:inset 0 1px 0 rgba(255,255,255,.35);}
.bigbtn{transition:transform .12s cubic-bezier(.2,.8,.2,1)}.bigbtn:active{transform:translateY(4px) scale(.97)}

/* ---------- runner / tap-game HUD ---------- */
#rbadge,#rcoins,#shud .sb{background:var(--glass) !important;border:1px solid rgba(255,255,255,.9);
  box-shadow:var(--shadow) !important;color:var(--ink) !important;font-weight:700 !important;text-shadow:none !important}
#rcoins{border-radius:18px;padding:5px 12px}
#rbadge b{background:linear-gradient(180deg,#ff8db4,#ff4f86) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
#rprog{background:rgba(255,255,255,.55) !important;border:1px solid rgba(255,255,255,.9);box-shadow:inset 0 1px 3px rgba(0,0,0,.15),var(--shadow) !important}
#rprog i{background:linear-gradient(90deg,#ff6fa5,#ffcf4d 35%,#5fe08a 70%,#4dc4ff) !important;box-shadow:inset 0 2px 0 rgba(255,255,255,.45)}
#rmute,#rmenu,#smute,#smenu{background:linear-gradient(180deg,#ffffff,#eef0ff) !important;border:1px solid rgba(255,255,255,.95) !important;box-shadow:var(--shadow),inset 0 -2px 0 rgba(60,40,140,.12) !important;transition:transform .12s}
#rsay,#ssay{background:radial-gradient(circle at 35% 28%,#fffbe0,#ffd84d 45%,#f5a800) !important;box-shadow:var(--shadow),inset 0 -2px 4px rgba(180,100,0,.35) !important;transition:transform .12s}
#rmute:active,#rmenu:active,#rsay:active,#smute:active,#smenu:active,#ssay:active{transform:scale(.9)}
#rprompt,#sprompt{background:rgba(255,255,255,.88) !important;border:1px solid #fff;box-shadow:0 10px 28px rgba(40,10,90,.25) !important;font-weight:700 !important;color:#4a2590 !important}
.rbtn{border-radius:999px !important;font-weight:700 !important;box-shadow:0 6px 0 rgba(0,0,0,.18),0 12px 26px rgba(0,0,0,.25),inset 0 2px 0 rgba(255,255,255,.35) !important;transition:transform .12s}
.rbtn.g{background:linear-gradient(180deg,#5be38a,#21b357) !important}.rbtn.p{background:linear-gradient(180deg,#ff8db4,#ff4f86) !important}
.rbtn.b{background:linear-gradient(180deg,#6fb6ff,#2d7ee0) !important}.rbtn.y{background:linear-gradient(180deg,#ffd36b,#f5a000) !important}
.rbtn:active{transform:translateY(4px) scale(.97) !important}
.rpanel h2,#sshop h2,#svict h2{font-weight:700 !important;text-shadow:0 2px 0 rgba(80,20,140,.55),0 8px 24px rgba(0,0,0,.35) !important}
#sshop button,#svict button{border:2px solid #fff !important;box-shadow:0 8px 20px rgba(30,10,70,.35),inset 0 2px 0 rgba(255,255,255,.7),inset 0 -4px 0 rgba(0,0,0,.06) !important;transition:transform .12s}
#sshop button:active,#svict button:active{transform:translateY(3px) scale(.96) !important}
#sshop button{background:linear-gradient(180deg,#fffaf0,#ffe9b8) !important}#sshop button.trap{background:linear-gradient(180deg,#f1ffe4,#c8f59e) !important}
#sshop button.save{background:linear-gradient(180deg,#fff0f6,#ffc6dd) !important}#svict button{background:linear-gradient(180deg,#fffdf6,#ffefc8) !important}
#sshelf{background:var(--glass) !important;box-shadow:var(--shadow)}
`;
document.head.appendChild(css);
// canvas text uses Fredoka too: once it's loaded, let the levels re-measure their labels
if (document.fonts && document.fonts.load) document.fonts.load('700 40px Fredoka').then(() => { try { if (window.Spooky && Spooky.active) Spooky.layoutNow(); } catch (_) {} }).catch(() => {});
})();
