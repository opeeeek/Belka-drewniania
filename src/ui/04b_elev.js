/* ----------------------------------------------- zakładka Belka i podpory: widok 2D / 3D, przekroje */
let view3d = false;
const V3 = { yaw: -0.55, pitch: 0.38, k: 1, px: 0, py: 0, mode: 'rot' };
const colOf = k => { const c = S.supCfg[k] && S.supCfg[k].col; return c && c.on ? E.normCol(c) : null; };
// widok podłużny belki (skala pionowa powiększona): zarys, oparcia, podcięcia, stężenia, przeguby, słupy ze stopami
function elevationSVG(W, o) {
  o = o || {};
  const md = R.md, ext0 = md.extL, ext1 = md.extR, Lm = md.Lmember;
  const ml = 46, mr = 40, sx = (W - ml - mr) / Lm;
  const hmax = Math.max(...md.segs.map(s => s.h));
  const vs = Math.min(Math.max(sx, 70 / hmax * 1000), 160 / hmax * 1000);
  const X = x => ml + (x + ext0) * sx, Hh = h => h / 1000 * vs;
  const anyCol = md.sups.some(p => colOf(p.i));
  const yTop = 40, yb = yTop + Hh(hmax), colH = anyCol ? 120 : 0, H = yb + 24 + colH + 96;
  let s = svgOpen(W, H, `class="elev" data-ml="${ml}" data-sx="${sx}" data-ext="${ext0}" data-top="${yTop}" data-bh="${Hh(hmax)}"`);
  md.segs.forEach(sg => {
    let xa = X(sg.x0), xb = X(sg.x1);
    if (sg.i === 0) xa -= ext0 * sx; if (sg.i === md.segs.length - 1) xb += ext1 * sx;
    s += `<rect x="${xa}" y="${yb - Hh(sg.h)}" width="${xb - xa}" height="${Hh(sg.h)}" fill="${WOOD}" stroke="${WOODE}" stroke-width="1.2"/>`;
    for (let k = 1; k < 4; k++) s += `<line x1="${xa + 2}" y1="${yb - Hh(sg.h) * k / 4}" x2="${xb - 2}" y2="${yb - Hh(sg.h) * k / 4 + (k % 2 ? 1.5 : -1.5)}" stroke="${WOODG}" stroke-width="0.6" opacity="0.7"/>`;
  });
  md.sups.forEach(p => {
    const xx = X(p.x), tw = p.t / 1000 * sx, c = colOf(p.i);
    s += `<g class="supp" data-sup="${p.i}"><title>Podpora ${esc(p.label)} – kliknij, aby zmienić</title>`;
    if (c) {
      const cw = Math.max(8, c.h / 1000 * sx), y1 = yb, y2 = yb + colH;
      s += `<rect x="${xx - cw / 2}" y="${y1}" width="${cw}" height="${colH}" fill="${WOOD}" stroke="${WOODE}" stroke-width="1.1"/>`;
      s += `<path d="M${xx - cw / 2 - 3},${y1 + colH * 0.45} l${cw / 3},-5 l${cw / 3},10 l${cw / 3 + 6},-5" fill="none" stroke="${WOODE}"/>`;
      s += `<rect x="${xx - cw / 2 - 6}" y="${y2}" width="${cw + 12}" height="4" fill="#9aa3b0" stroke="#39414f" stroke-width="0.8"/><rect x="${xx - cw / 2 - 16}" y="${y2 + 4}" width="${cw + 32}" height="22" fill="#cfd4db" stroke="#5d6778" stroke-width="0.8"/>`;
      s += tx(xx + cw / 2 + 6, y1 + 18, `słup ${fmt(c.b, 0)}×${fmt(c.h, 0)}`, { a: 'start', fs: 9.5, c: '#4a5466' }) + tx(xx + cw / 2 + 6, y1 + 30, `H = ${fmt(c.L, 2)} m`, { a: 'start', fs: 9.5, c: '#4a5466' }) + tx(xx + cw / 2 + 6, y1 + 42, `${c.n * c.m}×⌀${c.d}`, { a: 'start', fs: 9.5, c: '#4a5466' });
    } else {
      s += `<rect x="${xx - tw / 2}" y="${yb}" width="${Math.max(tw, 2)}" height="12" fill="#cfd4db" stroke="#39414f" stroke-width="0.9"/>`;
      for (let k = xx - tw / 2; k < xx + tw / 2 - 1; k += 5) s += `<line x1="${k}" y1="${yb + 12}" x2="${k + 4}" y2="${yb + 17}" stroke="#39414f" stroke-width="0.6"/>`;
    }
    s += tx(xx, yb + (c ? colH + 40 : 30), esc(p.label), { fs: 11, w: 650, c: '#3d4656' }) + '</g>';
    if (p.notch && p.notch.on) {
      const sg = p.segR || p.segL, h = sg.h, hef = p.notch.hef > 0 ? Math.min(p.notch.hef, h) : h, dh = Hh(h - hef), dir = p.segR ? 1 : -1;
      const xe = p.segR ? X(p.x) - (p.i === 0 ? ext0 * sx : 0) : X(p.x) + (p.i === md.sups.length - 1 ? ext1 * sx : 0);
      const xc = xx + dir * (p.notch.x > 0 ? p.notch.x / 1000 * sx : tw / 2);
      s += `<rect x="${Math.min(xe, xc)}" y="${p.notch.side === 'top' ? yb - Hh(h) : yb - dh}" width="${Math.abs(xc - xe)}" height="${dh}" fill="var(--panel, #ffffff)" stroke="#c0262d" stroke-width="1"/>`;
    }
  });
  if (S.ltb.on && S.ltb.top > 0) md.segs.forEach(sg => { for (let x = sg.x0 + S.ltb.top; x < sg.x1 - 1e-6; x += S.ltb.top) s += `<path d="M${X(x) - 4},${yTop - 12} l4,8 l4,-8" fill="none" stroke="#1d7f3c" stroke-width="1.2"/>`; });
  if (S.ltb.on && S.ltb.top === 0) s += `<line x1="${X(0)}" y1="${yTop - 6}" x2="${X(md.Ltot)}" y2="${yTop - 6}" stroke="#1d7f3c" stroke-width="2" stroke-dasharray="2 2"/>` + tx(X(md.Ltot / 2), yTop - 10, 'krawędź górna stężona w sposób ciągły', { fs: 9.5, c: '#1d7f3c' });
  S.nodes.forEach(n => { const sg = md.segs[n.seg]; if (!sg || !n.hinge) return; const xx = X(sg.x0 + n.a); s += `<line x1="${xx}" y1="${yb - Hh(sg.h)}" x2="${xx}" y2="${yb}" stroke="#c0262d" stroke-width="1.2" stroke-dasharray="3 2"/><circle cx="${xx}" cy="${yb - Hh(sg.h) / 2}" r="3.5" fill="#ffffff" stroke="#c0262d"/>`; });
  let y = yb + colH + 58;
  md.segs.forEach(sg => { s += dimH(X(sg.x0), X(sg.x1), y, fmt(sg.L * 1000, 0)); });
  y += 28;
  s += dimH(X(-ext0), X(md.Ltot + ext1), y, `długość elementu ${fmt(Lm * 1000, 0)} mm`);
  s += dimV(ml - 18, yb - Hh(md.segs[0].h), yb, fmt(md.segs[0].h, 0));
  if (S.geom.beta) s += tx(W - mr, 14, `oś belki nachylona β = ${fmt(S.geom.beta, 1)}° (rysunek w rozwinięciu)`, { a: 'end', fs: 10, c: '#5b6576' });
  s += tx(ml, 14, 'Widok podłużny (skala pionowa powiększona) – przesuń kursor: przekrój obok; kliknij: okno przekroju', { a: 'start', fs: 10, c: '#5b6576' });
  return s + '</svg>';
}
// wartości w miejscu x: indeks stacji w odcinku zawierającym x
function stIdxAt(x) {
  const st = R.st; let best = 0, bd = Infinity;
  for (let i = 0; i < st.stX.length; i++) { const d = Math.abs(st.stX[i] - x); if (d < bd - 1e-12) { bd = d; best = i; } }
  return best;
}
function atX(x) {
  const st = R.st, md = R.md, i = stIdxAt(x), sg = E.segAt(md, x), sec = sg.sec, sd = R.segData[sg.i];
  const pick = (env, k) => { let mx = -Infinity, mn = Infinity; for (let j = Math.max(0, i - 1); j <= Math.min(st.stX.length - 1, i + 1); j++) { if (Math.abs(st.stX[j] - st.stX[i]) > 1e-9) continue; mx = Math.max(mx, env[k].mx[j]); mn = Math.min(mn, env[k].mn[j]); } return { mx, mn }; };
  const M = pick(R.env.uls, 'My'), V = pick(R.env.uls, 'Vy'), N = pick(R.env.uls, 'N');
  const Mabs = Math.max(Math.abs(M.mx), Math.abs(M.mn)), Vabs = Math.max(Math.abs(V.mx), Math.abs(V.mn));
  const sig = Mabs * 1e6 / sec.Wy, tau = 1.5 * Vabs * 1e3 / (R.mt.kcr * sec.b * sec.h);
  return { x, i, sg, sec, sd, M, V, N, Mabs, Vabs, sig, tau, eb: R.eta.bend[i], es: R.eta.shear[i], et: R.eta.stab[i], w: Math.max(Math.abs(R.defl.finMx[i]), Math.abs(R.defl.finMn[i])) * 1000 };
}
function hoverSecHTML(x) {
  let q; try { q = atX(x); } catch (e) { return ''; }
  const near = R.md.sups.find(p => Math.abs(p.x - x) < (p.t / 2 + 150) / 1000);
  return `<h4>Przekrój pod kursorem<small> · x = ${fmt(x, 2)} m · ${esc(q.sg.label)}</small></h4>
    <div class="xclick secedit" data-geo="${q.sg.i}" title="Kliknij, aby zmienić wymiary i materiał">${sectionSVG(q.sec, { id: 'h', size: 170, glulam: /^GL/.test(curFam()) })}</div>
    <table class="kv"><tr><td>b × h</td><td>${S.geom.n > 1 ? S.geom.n + '×' : ''}${fmt(q.sec.b1, 0)} × ${fmt(q.sec.h, 0)}</td><td>mm</td></tr>
    <tr><td>M<sub>Ed</sub> max / min</td><td>${fmt(q.M.mx, 2)} / ${fmt(q.M.mn, 2)}</td><td>kNm</td></tr>
    <tr><td>|V<sub>Ed</sub>|</td><td>${fmt(q.Vabs, 2)}</td><td>kN</td></tr>
    ${Math.abs(q.N.mx) + Math.abs(q.N.mn) > 1e-6 ? `<tr><td>N<sub>Ed</sub></td><td>${fmt(q.N.mx, 2)} / ${fmt(q.N.mn, 2)}</td><td>kN</td></tr>` : ''}
    <tr><td>σ<sub>m,d</sub> / τ<sub>d</sub></td><td>${fmt(q.sig, 2)} / ${fmt(q.tau, 3)}</td><td>MPa</td></tr>
    <tr><td>η zginanie / stateczność</td><td>${fmt(q.eb * 100, 0)}% / ${fmt(q.et * 100, 0)}%</td><td></td></tr>
    <tr><td>η ścinanie</td><td>${fmt(q.es * 100, 0)}%</td><td></td></tr>
    <tr><td>w<sub>fin</sub></td><td>${fmt(q.w, 1)}</td><td>mm</td></tr></table>
    <div class="secedbar"><button class="btn sm" data-geo="${q.sg.i}">Wymiary b × h…</button>${near ? `<button class="btn sm" data-sup2="${near.i}">Podpora ${esc(near.label)}…</button>` : ''}<button class="btn sm" data-secx="${x}">Okno przekroju…</button></div>`;
}
function sectionPopup(x) {
  const L = R.md.Ltot; x = Math.max(0, Math.min(L, x));
  const q = atX(x), m = $('#modal');
  m.innerHTML = `<div class="dlg secpop xres"><h3>Przekrój poprzeczny – x = ${fmt(x, 2)} m (${esc(q.sg.label)})</h3>
    <div class="secnav"><button class="btn sm" data-dx="-0.5">◀ 0,5 m</button><button class="btn sm" data-dx="-0.1">◀ 0,1 m</button><label>x = <input class="txt sm" id="spX" value="${fmt(x, 2)}"> m</label><button class="btn sm" data-dx="0.1">0,1 m ▶</button><button class="btn sm" data-dx="0.5">0,5 m ▶</button></div>
    <div class="flex" style="justify-content:center;gap:10px"><div class="xclick secedit" data-geo="${q.sg.i}" title="Kliknij, aby zmienić wymiary">${sectionSVG(q.sec, { id: 'p', size: 220, glulam: /^GL/.test(curFam()) })}</div>${stressSVG(q.sec, q.sig, q.tau)}</div>
    <div class="secedbar"><span>Zmień w tym miejscu:</span><button class="btn sm" data-geo="${q.sg.i}">Wymiary b × h, materiał</button><button class="btn sm" data-node2="${q.sg.i}">Węzeł / przegub</button><button class="btn sm" data-ld2="${q.sg.i}">Obciążenia odcinka</button></div>
    <table class="kv"><tr><td>M<sub>Ed</sub> max / min (obwiednia SGN)</td><td>${fmt(q.M.mx, 2)} / ${fmt(q.M.mn, 2)}</td><td>kNm</td></tr>
    <tr><td>|V<sub>Ed</sub>|</td><td>${fmt(q.Vabs, 2)}</td><td>kN</td></tr>
    <tr><td>σ<sub>m,d</sub> = |M|/W<sub>y</sub></td><td>${fmt(q.sig, 2)}</td><td>MPa</td></tr>
    <tr><td>τ<sub>d</sub> = 1,5V/(k<sub>cr</sub>bh)</td><td>${fmt(q.tau, 3)}</td><td>MPa</td></tr>
    <tr><td>wytężenie: zginanie / stateczność / ścinanie</td><td>${fmt(q.eb * 100, 0)}% / ${fmt(q.et * 100, 0)}% / ${fmt(q.es * 100, 0)}%</td><td></td></tr>
    <tr><td>ugięcie końcowe w<sub>fin</sub></td><td>${fmt(q.w, 1)}</td><td>mm</td></tr></table>
    <p class="hint">Wytężenie w tym miejscu – maksimum z kombinacji SGN (z k<sub>mod</sub> każdej kombinacji); zwichrzenie z k<sub>crit</sub> odcinka.</p>
    <div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
  $$('[data-dx]', m).forEach(b => b.onclick = () => sectionPopup(x + +b.dataset.dx));
  const inp = $('#spX', m); inp.addEventListener('change', () => { const v = parseNum(inp.value); if (v !== null) sectionPopup(v); }); inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.dispatchEvent(new Event('change')); });
  $$('[data-geo]', m).forEach(b => b.addEventListener('click', () => geoPopup(+b.dataset.geo, () => sectionPopup(x))));
  $$('[data-node2]', m).forEach(b => b.addEventListener('click', () => nodeWinPopup(+b.dataset.node2)));
  $$('[data-ld2]', m).forEach(b => b.addEventListener('click', () => loadPopup({ seg: +b.dataset.ld2 })));
}
function bindElev(el) {
  const svg = $('svg.elev', el); if (!svg) return;
  const ml = +svg.dataset.ml, sx = +svg.dataset.sx, ext = +svg.dataset.ext, top = +svg.dataset.top, bh = +svg.dataset.bh;
  const ns = 'http://www.w3.org/2000/svg', cur = document.createElementNS(ns, 'line');
  cur.setAttribute('y1', top - 6); cur.setAttribute('y2', top + bh + 6); cur.setAttribute('stroke-width', '1.4'); cur.setAttribute('stroke-dasharray', '4 3');
  cur.style.stroke = 'var(--acc)'; cur.style.display = 'none'; cur.style.pointerEvents = 'none'; svg.appendChild(cur); svg.style.cursor = 'crosshair';
  const xOf = ev => { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; const px = vb.x + (ev.clientX - r.left) * vb.width / r.width, py = vb.y + (ev.clientY - r.top) * vb.height / r.height; return { x: (px - ml) / sx - ext, px, py }; };
  const inside = q => q.py >= top - 30 && q.py <= top + bh + 30 && q.x >= 0 && q.x <= R.md.Ltot;
  const hs = $('#hsec', el); let pend = null, lastX = null;
  const showSec = x => { if (!hs || x === lastX) return; lastX = x; hs.innerHTML = hoverSecHTML(x); bindHs(); };
  const bindHs = () => { $$('[data-geo]', hs).forEach(b => b.addEventListener('click', () => geoPopup(+b.dataset.geo))); $$('[data-sup2]', hs).forEach(b => b.addEventListener('click', () => supportPopup(+b.dataset.sup2))); $$('[data-secx]', hs).forEach(b => b.addEventListener('click', () => sectionPopup(+b.dataset.secx))); };
  const gov = R.checks.find(c => /^bend/.test(c.id) && c.d) ; showSec(gov ? Math.round(gov.d.x * 100) / 100 : R.md.Ltot / 2);
  svg.addEventListener('mousemove', ev => { const q = xOf(ev); if (inside(q)) { cur.setAttribute('x1', q.px); cur.setAttribute('x2', q.px); cur.style.display = ''; const xx = Math.round(Math.max(0, Math.min(R.md.Ltot, q.x)) * 100) / 100; if (!pend) pend = requestAnimationFrame(() => { pend = null; showSec(xx); }); } else cur.style.display = 'none'; });
  svg.addEventListener('mouseleave', () => { cur.style.display = 'none'; });
  svg.addEventListener('click', ev => { if (ev.target.closest('.supp')) return; const q = xOf(ev); if (inside(q)) sectionPopup(Math.round(q.x * 100) / 100); });
  $$('.supp', svg).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); supportPopup(+g.dataset.sup); }));
}
// widok 3D (canvas): belka, oparcia, podcięcia, słupy, stopy i fundamenty; obrót / przesuw / powiększenie
function draw3D(cv) {
  const md = R.md, ctx = cv.getContext('2d'), W = cv.width, H = cv.height, dpr = window.devicePixelRatio || 1;
  cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr;
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const polys = [], lines = [];
  // geometria [mm]: x – wzdłuż belki, y – w górę, z – w poprzek; górna krawędź belki y = hMax
  const hMax = Math.max(...md.segs.map(s => s.h));
  const box = (x0, x1, y0, y1, z0, z1, kind) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]].forEach(f => polys.push({ f: f.map(i => c[i]), kind }));
  };
  const xOff = md.extL * 1000;
  md.segs.forEach((sg, i) => {
    let x0 = sg.x0 * 1000 + xOff, x1 = sg.x1 * 1000 + xOff; if (i === 0) x0 -= xOff; if (i === md.segs.length - 1) x1 += md.extR * 1000;
    const bw = sg.sec.b / 2;
    box(x0, x1, hMax - sg.h, hMax, -bw, bw, 'wood');
    if (S.geom.n > 1) for (let k = 1; k < S.geom.n; k++) { const z = -bw + 2 * bw * k / S.geom.n; lines.push([[x0, hMax - sg.h, z], [x0, hMax, z], '#8a5a2b', 1]); lines.push([[x1, hMax - sg.h, z], [x1, hMax, z], '#8a5a2b', 1]); }
  });
  let yMin = 0;
  md.sups.forEach(p => {
    const xx = p.x * 1000 + xOff, t = Math.max(60, p.t), seg = p.segR || p.segL, yb = hMax - seg.h, bw = seg.sec.b / 2 + 30, c = colOf(p.i);
    if (p.notch && p.notch.on) { const hef = p.notch.hef > 0 ? Math.min(p.notch.hef, seg.h) : seg.h, dir = p.segR ? 1 : -1, xc = xx + dir * (p.notch.x > 0 ? p.notch.x : t / 2), y0 = p.notch.side === 'top' ? hMax - (seg.h - hef) : yb, y1 = p.notch.side === 'top' ? hMax : yb + (seg.h - hef); [[xc, y0, -bw + 30], [xc, y1, -bw + 30], [xc, y1, bw - 30], [xc, y0, bw - 30]].forEach((q, j, a) => lines.push([q, a[(j + 1) % 4], '#c0262d', 1.6])); }
    if (c) {
      const L = c.L * 1000, cb = c.b / 2, ch = c.h / 2;
      box(xx - ch, xx + ch, yb - L, yb, -cb, cb, 'wood');
      box(xx - c.pa / 2, xx + c.pa / 2, yb - L - c.gap - 15, yb - L - c.gap, -c.pb / 2, c.pb / 2, 'steel');
      if (c.type === 'slot') box(xx - ch + 10, xx + ch - 10, yb - L - c.gap, yb - L + c.a3 + (c.n - 1) * c.a1 + c.e1p, -c.ts / 2, c.ts / 2, 'steel');
      else [-1, 1].forEach(sd => box(xx - ch + 10, xx + ch - 10, yb - L - c.gap, yb - L + c.a3 + (c.n - 1) * c.a1 + c.e1p, sd * cb, sd * (cb + c.ts), 'steel'));
      box(xx - c.pa / 2 - 150, xx + c.pa / 2 + 150, yb - L - c.gap - 15 - 400, yb - L - c.gap - 15, -c.pb / 2 - 150, c.pb / 2 + 150, 'conc');
      const xs = c.m === 1 ? [0] : Array.from({ length: c.m }, (_, j) => -(c.m - 1) * c.a2 / 2 + j * c.a2);
      for (let i = 0; i < c.n; i++) xs.forEach(dx => { const y = yb - L + c.a3 + i * c.a1; lines.push([[xx + dx, y, -cb - 15], [xx + dx, y, cb + 15], dark ? '#e6e9ef' : '#1b2230', 2.2]); });
      yMin = Math.min(yMin, yb - L - 450);
    } else {
      box(xx - t / 2, xx + t / 2, yb - 200, yb, -bw, bw, 'sup'); yMin = Math.min(yMin, yb - 200);
    }
  });
  if (S.ltb.on && S.ltb.top > 0) md.segs.forEach(sg => { for (let x = sg.x0 + S.ltb.top; x < sg.x1 - 1e-6; x += S.ltb.top) { const xx = x * 1000 + xOff; lines.push([[xx, hMax + 5, -sg.sec.b / 2 - 250], [xx, hMax + 5, sg.sec.b / 2 + 250], '#1d7f3c', 2]); } });
  const xL = 0, xR = md.Lmember * 1000, xc = (xL + xR) / 2, yc = (hMax + yMin) / 2;
  const spanY = hMax - yMin, base = Math.min((W - 60) / Math.max(1500, xR - xL + 400), (H - 70) / Math.max(800, spanY * 1.25 + 300));
  const COL = { wood: dark ? 'rgba(208,164,108,0.30)' : 'rgba(214,180,128,0.55)', steel: dark ? 'rgba(170,180,195,0.45)' : 'rgba(120,130,145,0.55)', conc: dark ? 'rgba(150,160,175,0.14)' : 'rgba(150,160,175,0.25)', sup: dark ? 'rgba(150,160,175,0.18)' : 'rgba(110,120,135,0.2)' };
  const render = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const cy = Math.cos(V3.yaw), sy = Math.sin(V3.yaw), cp = Math.cos(V3.pitch), sp = Math.sin(V3.pitch), sc0 = base * V3.k;
    const pr = ([x, y, z]) => { const X0 = x - xc, Y0 = y - yc; const X1 = X0 * cy + z * sy, Z1 = -X0 * sy + z * cy; const Y2 = Y0 * cp - Z1 * sp, Z2 = Y0 * sp + Z1 * cp; return [W / 2 + V3.px + X1 * sc0, H / 2 + V3.py - Y2 * sc0, Z2]; };
    const items = [];
    polys.forEach(({ f, kind }) => { const pp = f.map(pr); items.push({ z: pp.reduce((a, q) => a + q[2], 0) / pp.length, poly: pp, kind }); });
    lines.forEach(([a, b, c, w]) => { const A = pr(a), B = pr(b); items.push({ z: (A[2] + B[2]) / 2 + 1, line: [A, B], c, w }); });
    items.sort((u, v) => u.z - v.z);
    items.forEach(it => {
      if (it.poly) { ctx.beginPath(); it.poly.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = COL[it.kind]; ctx.fill(); ctx.strokeStyle = it.kind === 'wood' ? (dark ? 'rgba(208,164,108,0.8)' : 'rgba(138,90,43,0.75)') : (dark ? 'rgba(200,210,225,0.4)' : 'rgba(60,70,90,0.45)'); ctx.lineWidth = 0.8; ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(it.line[0][0], it.line[0][1]); ctx.lineTo(it.line[1][0], it.line[1][1]); ctx.strokeStyle = it.c; ctx.lineWidth = it.w; ctx.lineCap = 'round'; ctx.stroke(); }
    });
    ctx.fillStyle = dark ? '#c9d4e6' : '#1b2230'; ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    md.sups.forEach(p => { const seg = p.segR || p.segL, c = colOf(p.i), q = pr([p.x * 1000 + xOff, hMax - seg.h - (c ? c.L * 1000 + 520 : 300), 0]); ctx.fillText(p.label, q[0], q[1]); });
    ctx.textAlign = 'start'; ctx.fillStyle = dark ? '#c9d4e6' : '#3d4656'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`obrót ${Math.round(V3.yaw * 180 / Math.PI)}°, pochylenie ${Math.round(V3.pitch * 180 / Math.PI)}°, powiększenie ${Math.round(V3.k * 100)}% · tryb: ${V3.mode === 'pan' ? 'przesuw' : 'obrót'}`, 10, H - 10);
  };
  render();
  const zoomAt = (f, mx, my) => { const k1 = Math.max(0.3, Math.min(30, V3.k * f)), g = k1 / V3.k; V3.px = (mx - W / 2) - (mx - W / 2 - V3.px) * g; V3.py = (my - H / 2) - (my - H / 2 - V3.py) * g; V3.k = k1; };
  const loc = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  let drag = null;
  cv.oncontextmenu = e => e.preventDefault();
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); const pan = V3.mode === 'pan' || e.shiftKey || e.button === 1 || e.button === 2; drag = { x: e.clientX, y: e.clientY, v: Object.assign({}, V3), pan }; cv.style.cursor = pan ? 'move' : 'grabbing'; };
  cv.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (drag.pan) { V3.px = drag.v.px + dx; V3.py = drag.v.py + dy; } else { V3.yaw = drag.v.yaw + dx * 0.008; V3.pitch = Math.max(-1.45, Math.min(1.45, drag.v.pitch + dy * 0.008)); } render(); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; cv.style.cursor = ''; };
  cv.onwheel = e => { if (!e.ctrlKey) return; e.preventDefault(); const [mx, my] = loc(e); zoomAt(Math.exp(-e.deltaY * 0.002), mx, my); render(); };
  cv.ondblclick = () => { Object.assign(V3, { yaw: -0.55, pitch: 0.38, k: 1, px: 0, py: 0 }); render(); };
  const bar = cv.parentElement && cv.parentElement.querySelector('.v3tools');
  if (bar) {
    bar.querySelectorAll('[data-v3m]').forEach(b => b.onclick = () => { V3.mode = b.dataset.v3m; bar.querySelectorAll('[data-v3m]').forEach(q => q.classList.toggle('on', q === b)); render(); });
    bar.querySelectorAll('[data-v3z]').forEach(b => b.onclick = () => { zoomAt(+b.dataset.v3z > 0 ? 1.25 : 0.8, W / 2, H / 2); render(); });
    const rb = bar.querySelector('[data-v3r]'); if (rb) rb.onclick = () => cv.ondblclick();
  }
}
function colTableHTML() {
  if (!R.colData || !R.colData.length) return '';
  return `<div class="box" style="margin-top:12px"><h4>Słupy i stopy (połączenie z fundamentem)</h4><table class="reqt"><tr><th>Podpora</th><th>słup</th><th>stopa</th><th>N<sub>c,Ed</sub> max</th><th>N<sub>t,Ed</sub> max</th><th>największe η</th><th></th></tr>${R.colData.map(o => { const c = o.c, cs = R.checks.filter(q => q.col === o.k && isFinite(q.ratio)), mx = cs.length ? Math.max(...cs.map(q => q.ratio)) : 0; return `<tr><td>${esc(o.p.label)}</td><td>${esc(o.m.id || o.m.name)} ${fmt(c.b, 0)}×${fmt(c.h, 0)}, H = ${fmt(c.L, 2)} m</td><td>${c.type === 'slot' ? 'blacha wpuszczana' : 'blachy zewn.'} t = ${fmt(c.ts, 0)}, ${c.n * c.m}×⌀${c.d} ${c.fast === 'bolt' ? 'śruby' : 'sworznie'}; ${c.na} kotwy</td><td>${fmt(o.worst.buck ? o.worst.buck.Nc : 0, 2)}</td><td>${fmt(o.worst.conn ? o.worst.conn.Nt : 0, 2)}</td><td class="${mx > 1 ? 'no' : 'yes'}">${fmt(mx * 100, 0)}%</td><td><button class="lnk" data-colw="${o.k}">zmień…</button></td></tr>`; }).join('')}</table></div>`;
}
function renderElevation(el) {
  const narrow = el.clientWidth < 980;
  const W = narrow ? Math.max(600, el.clientWidth - 40) : Math.max(600, Math.min(1400, el.clientWidth - 40 - 336));
  let h = `<div class="etools"><div class="h2" style="margin:0">Belka i podpory<small>widok podłużny lub przestrzenny; obok – przekrój w miejscu kursora</small></div><span class="sp"></span><button class="btn pri sm" id="bDxf">Rysunek DXF…</button></div>`;
  h += `<div class="elevgrid"><div class="box elevbox"><div class="v3sw segsw sm" role="tablist" aria-label="Widok"><button data-v3="2d" class="${view3d ? '' : 'on'}">2D</button><button data-v3="3d" class="${view3d ? 'on' : ''}" title="Widok przestrzenny – obrót, przesuw i powiększenie">3D</button></div>` +
    (view3d ? `<div class="v3tools segsw sm" role="toolbar"><button data-v3m="rot" class="${V3.mode === 'pan' ? '' : 'on'}">⟳ Obrót</button><button data-v3m="pan" class="${V3.mode === 'pan' ? 'on' : ''}">✥ Przesuw</button><button data-v3z="1" title="Powiększ">+</button><button data-v3z="-1" title="Pomniejsz">−</button><button data-v3r="1" title="Widok domyślny">⌂</button></div><canvas class="v3d" width="${Math.round(W)}" height="${Math.round(Math.min(560, Math.max(340, W * 0.48)))}"></canvas><p class="hint" style="margin:4px 0 0">Lewy przycisk – obrót lub przesuw (wg trybu) · prawy przycisk albo Shift + przeciągnij – przesuw · Ctrl + kółko lub +/− – powiększenie · dwuklik – widok domyślny.</p>`
      : `<div class="tscroll elevwrap">${elevationSVG(W)}</div>`) + `</div><div class="box hsec" id="hsec"></div></div>`;
  h += colTableHTML();
  h += `<div class="box" style="margin-top:12px"><h4>Podpory – docisk (6.1.5) i podcięcia (6.5.2)</h4>${supTableHTML()}<p class="hint">Kliknij podporę na rysunku lub na schemacie w Danych, aby zmienić długość oparcia, rodzaj podparcia, podcięcie albo słup ze stopą.</p></div>`;
  if (R.ptBear && R.ptBear.length) h += `<div class="box" style="margin-top:12px"><h4>Docisk pod siłami skupionymi</h4><table class="reqt"><tr><th>Siła</th><th>x [m]</th><th>F<sub>d</sub> [kN]</th><th>l<sub>ef</sub> [mm]</th><th>σ<sub>c,90,d</sub></th><th>k<sub>c,90</sub>·f<sub>c,90,d</sub></th></tr>${R.ptBear.map(q => `<tr><td>${esc(q.o.key)}</td><td>${fmt(q.q.x, 2)}</td><td>${fmt(q.F, 2)}</td><td>${fmt(q.lef, 0)}</td><td>${fmt(q.s, 2)}</td><td>${fmt(q.kc * q.fd, 2)}</td></tr>`).join('')}</table></div>`;
  h += `<div class="box" style="margin-top:12px"><h4>Zestawienie drewna</h4>${scheduleHTML()}</div>`;
  el.innerHTML = h;
  $('#bDxf', el).onclick = exportDXF;
  $$('[data-v3]', el).forEach(b => b.addEventListener('click', () => { view3d = b.dataset.v3 === '3d'; rendered.elev = false; renderActive(); }));
  $$('[data-colw]', el).forEach(b => b.addEventListener('click', () => colPopup(+b.dataset.colw)));
  const hs = $('#hsec', el);
  if (view3d) { draw3D($('canvas.v3d', el)); if (hs) { hs.innerHTML = hoverSecHTML(R.md.Ltot / 2); $$('[data-geo]', hs).forEach(b => b.addEventListener('click', () => geoPopup(+b.dataset.geo))); $$('[data-secx]', hs).forEach(b => b.addEventListener('click', () => sectionPopup(+b.dataset.secx))); } }
  else { bindElev(el); zoomInit(el); }
}
