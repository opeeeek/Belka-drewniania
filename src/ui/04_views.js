/* ----------------------------------------------------- zakładka Przekrój i nośność */
function sectionSVG(sec, o) {
  o = o || {};
  const b = sec.b, h = sec.h, n = sec.n || 1, maxD = o.size || 200;
  const sc = Math.min(maxD / h, (maxD * 0.9) / b, 1.2);
  const W = b * sc + 110, H = h * sc + 70, x0 = 55, y0 = 22;
  let s = svgOpen(W, H, `class="secsvg"`);
  const bw = b / n;
  for (let k = 0; k < n; k++) {
    const xa = x0 + k * bw * sc;
    s += `<rect x="${xa}" y="${y0}" width="${bw * sc}" height="${h * sc}" fill="${WOOD}" stroke="${WOODE}" stroke-width="1.3"/>`;
    // słoje (łuki z rdzeniem poza przekrojem – przekrój tarcicy)
    const cx = xa + bw * sc / 2, cy = y0 + h * sc + Math.max(bw, h) * sc * 0.6;
    s += `<clipPath id="cl${o.id || ''}${k}"><rect x="${xa}" y="${y0}" width="${bw * sc}" height="${h * sc}"/></clipPath><g clip-path="url(#cl${o.id || ''}${k})" fill="none" stroke="${WOODG}" stroke-width="0.7" opacity="0.8">`;
    for (let r = 12; r < (h + bw) * sc * 1.6; r += 9) s += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    s += '</g>';
    if (o.glulam) for (let yy = 40; yy < h; yy += 40) s += `<line x1="${xa}" y1="${y0 + yy * sc}" x2="${xa + bw * sc}" y2="${y0 + yy * sc}" stroke="${WOODE}" stroke-width="0.6"/>`;
  }
  if (o.fire) {
    const f = o.fire, bfi = Math.max(0, f.bfi), hfi = Math.max(0, f.hfi), top = o.fireTop;
    const fx = x0 + (b - bfi) / 2 * sc, fy = y0 + (top ? (h - hfi) / 2 : 0) * sc;
    s += `<path d="M${x0},${y0} h${b * sc} v${h * sc} h${-b * sc} z M${fx},${fy} v${hfi * sc} h${bfi * sc} v${-hfi * sc} z" fill="#39414f" fill-opacity="0.55" fill-rule="evenodd"/>`;
    s += `<rect x="${fx}" y="${fy}" width="${bfi * sc}" height="${hfi * sc}" fill="none" stroke="#c0262d" stroke-width="1.4" stroke-dasharray="5 3"/>`;
    s += tx(x0 + b * sc / 2, y0 + h * sc + 32, `po R${S.fire.R}: ${fmt(bfi, 0)}×${fmt(hfi, 0)} mm`, { fs: 10, c: '#c0262d' });
  }
  // osie
  s += `<line x1="${x0 - 12}" y1="${y0 + h * sc / 2}" x2="${x0 + b * sc + 12}" y2="${y0 + h * sc / 2}" stroke="#1d5bb8" stroke-width="0.7" stroke-dasharray="8 3 2 3"/>` + tx(x0 + b * sc + 16, y0 + h * sc / 2 + 4, 'y', { a: 'start', fs: 10, c: '#1d5bb8' });
  s += `<line x1="${x0 + b * sc / 2}" y1="${y0 - 10}" x2="${x0 + b * sc / 2}" y2="${y0 + h * sc + 10}" stroke="#1d5bb8" stroke-width="0.7" stroke-dasharray="8 3 2 3"/>` + tx(x0 + b * sc / 2 + 4, y0 - 4, 'z', { a: 'start', fs: 10, c: '#1d5bb8' });
  s += dimH(x0, x0 + b * sc, y0 + h * sc + 16, `b = ${fmt(b, 0)}`, { below: true, fs: 10 });
  s += dimV(x0 - 18, y0, y0 + h * sc, `h = ${fmt(h, 0)}`, { fs: 10 });
  return s + '</svg>';
}
// rozkład naprężeń normalnych (σ_m) i stycznych (τ) – mały wykres przy przekroju
function stressSVG(sec, sig, tau, o) {
  o = o || {};
  const h = sec.h, sc = Math.min(160 / h, 1.2), H = h * sc + 40, W = 250, y0 = 20, xs = 85, xt = 190;
  let s = svgOpen(W, H);
  s += `<line x1="${xs}" y1="${y0}" x2="${xs}" y2="${y0 + h * sc}" stroke="#39414f"/><line x1="${xt}" y1="${y0}" x2="${xt}" y2="${y0 + h * sc}" stroke="#39414f"/>`;
  const a = 40;
  if (sig) { s += `<polygon points="${xs},${y0} ${xs + a},${y0} ${xs - a},${y0 + h * sc} ${xs},${y0 + h * sc}" fill="#e6b3b3" fill-opacity="0.6" stroke="#c0262d"/>` + tx(xs + a + 2, y0 + 4, '−' + fmt(sig, 2), { a: 'start', fs: 9.5, c: '#c0262d' }) + tx(xs - a - 2, y0 + h * sc, '+' + fmt(sig, 2), { a: 'end', fs: 9.5, c: '#c0262d' }) + tx(xs, H - 4, 'σ_m [MPa]', { fs: 9.5, c: '#4a5466' }); }
  if (tau) { let p = `${xt},${y0} `; for (let k = 0; k <= 20; k++) { const z = k / 20; p += `${(xt + 32 * 4 * z * (1 - z)).toFixed(1)},${(y0 + z * h * sc).toFixed(1)} `; } p += `${xt},${y0 + h * sc}`; s += `<polygon points="${p}" fill="#c9d4e6" fill-opacity="0.7" stroke="#1d5bb8"/>` + tx(xt + 34, y0 + h * sc / 2 + 4, fmt(tau, 2), { a: 'start', fs: 9.5, c: '#1d5bb8' }) + tx(xt, H - 4, 'τ [MPa]', { fs: 9.5, c: '#4a5466' }); }
  return s + '</svg>';
}
function fdTableHTML() {
  const mt = R.mt, sec = R.md.segs[0].sec, sb = E.strengthBase(mt, sec);
  const rows = E.DUR.map(d => ({ lab: `${E.DUR_NAME[d]}`, k: mt.kmod[d], g: mt.gM }));
  if (R.cb.acc.length) rows.push({ lab: 'wyjątkowa (chwilowe)', k: mt.kmod.I, g: mt.gMA });
  const fi = S.fire.on ? { lab: `pożar (k<sub>fi</sub> = ${fmt(mt.kfi, 2)}, γ<sub>M,fi</sub> = 1,0)`, k: 1, g: 1, fi: true } : null;
  const c = (v, r) => fmt(r.fi ? v : r.k * v / r.g, 2);
  const used = new Set(R.cb.uls.map(q => q.fam));
  let h = `<table class="reqt"><tr><th>Klasa trwania / sytuacja</th><th>k<sub>mod</sub></th><th>γ<sub>M</sub></th><th>f<sub>m,y,d</sub></th><th>f<sub>m,z,d</sub></th><th>f<sub>t,0,d</sub></th><th>f<sub>c,0,d</sub></th><th>f<sub>c,90,d</sub></th><th>f<sub>v,d</sub></th></tr>`;
  rows.forEach((r, i) => { const d = E.DUR[i]; h += `<tr${d && !used.has(d) ? ' class="rare"' : ''}><td>${r.lab}${d && used.has(d) ? ' ●' : ''}</td><td>${fmt(r.k, 2)}</td><td>${fmt(r.g, 2)}</td><td>${c(sb.fmy, r)}</td><td>${c(sb.fmz, r)}</td><td>${c(sb.ft0, r)}</td><td>${c(sb.fc0, r)}</td><td>${c(sb.fc90, r)}</td><td>${c(sb.fv, r)}</td></tr>`; });
  if (fi) h += `<tr><td>${fi.lab}</td><td>1,00</td><td>1,00</td><td>${fmt(mt.kfi * mt.m.fmk, 2)}</td><td>${fmt(mt.kfi * mt.m.fmk, 2)}</td><td>${fmt(mt.kfi * mt.m.ft0k, 2)}</td><td>${fmt(mt.kfi * mt.m.fc0k, 2)}</td><td>${fmt(mt.kfi * mt.m.fc90k, 2)}</td><td>${fmt(mt.kfi * mt.m.fvk, 2)}</td></tr>`;
  h += `</table><p class="hint">f<sub>d</sub> = k<sub>mod</sub>·k<sub>h</sub>·k<sub>sys</sub>·f<sub>k</sub>/γ<sub>M</sub> [MPa]; k<sub>h,y</sub> = ${fmt(sb.khy, 3)} (h = ${fmt(sec.h, 0)} mm), k<sub>h,z</sub> = ${fmt(sb.khz, 3)}, k<sub>h,t</sub> = ${fmt(sb.kht, 3)}, k<sub>sys</sub> = ${fmt(mt.ksys, 2)}. ● – klasy trwania występujące w kombinacjach.</p>`;
  return h;
}
function renderSection(el) {
  const md = R.md, mt = R.mt;
  let h = `<div class="h2">Przekrój i nośność <small>${esc(mt.m.name)} · ${esc(E.FAM[mt.m.fam].name)} · klasa użytkowania ${S.env.sc}</small></div>`;
  // przekroje (unikalne)
  const uniq = []; md.segs.forEach(s => { if (!uniq.some(u => u.sec.b === s.sec.b && u.sec.h === s.sec.h)) uniq.push(s); });
  h += `<div class="flex">`;
  uniq.forEach((sg, k) => {
    const sec = sg.sec, sb = E.strengthBase(mt, sec), fd = R.fireData ? R.fireData.segs.find(q => q.seg.i === sg.i) : null;
    h += `<div class="box"><h4>Przekrój ${md.segs.filter(q => q.sec.b === sec.b && q.sec.h === sec.h).map(q => esc(q.label)).join(', ')} <button class="lnk" data-geo="${sg.i}">zmień…</button></h4><div class="flex"><div class="xclick secedit" data-geo="${sg.i}" title="Kliknij przekrój, aby zmienić wymiary, liczbę elementów i materiał">${sectionSVG(sec, { id: 's' + k, glulam: /^GL/.test(mt.m.fam), fire: fd, fireTop: S.fire.sides === 4 })}</div>
      <table class="kv"><tr><td>b × h</td><td>${S.geom.n > 1 ? S.geom.n + '×' : ''}${fmt(sec.b1, 0)} × ${fmt(sec.h, 0)}</td><td>mm</td></tr><tr><td>A</td><td>${fmt(sec.A / 100, 1)}</td><td>cm²</td></tr>
      <tr><td>I<sub>y</sub></td><td>${fmt(sec.Iy / 1e4, 0)}</td><td>cm⁴</td></tr><tr><td>W<sub>y</sub></td><td>${fmt(sec.Wy / 1e3, 1)}</td><td>cm³</td></tr><tr><td>I<sub>z</sub></td><td>${fmt(sec.Iz / 1e4, 0)}</td><td>cm⁴</td></tr><tr><td>W<sub>z</sub></td><td>${fmt(sec.Wz / 1e3, 1)}</td><td>cm³</td></tr>
      <tr><td>i<sub>y</sub> / i<sub>z</sub></td><td>${fmt(sec.iy, 1)} / ${fmt(sec.iz, 1)}</td><td>mm</td></tr><tr><td>I<sub>tor</sub> (β = ${fmt(sec.tc.beta, 3)})</td><td>${fmt(sec.It / 1e4, 0)}</td><td>cm⁴</td></tr><tr><td>W<sub>tor</sub> (α = ${fmt(sec.tc.alpha, 3)})</td><td>${fmt(sec.Wt / 1e3, 1)}</td><td>cm³</td></tr>
      <tr><td>k<sub>shape</sub> (6.1.8)</td><td>${fmt(sec.kshape, 3)}</td><td></td></tr><tr><td>k<sub>h,y</sub> / k<sub>h,z</sub></td><td>${fmt(sb.khy, 3)} / ${fmt(sb.khz, 3)}</td><td></td></tr><tr><td>ciężar własny</td><td>${fmt(mt.gamma * sec.A * 1e-6, 3)}</td><td>kN/m</td></tr></table></div></div>`;
  });
  h += `</div>`;
  h += `<div class="box" style="margin-top:12px"><h4>Wartości obliczeniowe wytrzymałości (3.1.3, 2.4.1, 6.6)</h4>${fdTableHTML()}</div>`;
  // przekroje decydujące
  h += `<div class="h2" style="margin-top:16px">Przekroje decydujące <small>kliknij wartość, aby zobaczyć tok obliczeń</small></div><div class="minisecs">`;
  R.segData.forEach(sd => {
    const G = sd.G, sec = sd.sec;
    const card = (t, d, body, ck) => `<div class="swcard"${ck ? ` data-ck="${ck}"` : ''}><div class="mst">${t}</div>${body}<div class="msd">${d}</div></div>`;
    if (G.bend) { const g = G.bend; h += card(`${esc(cap(sd.seg.label))} – zginanie`, `x = ${fmt(g.x, 2)} m; |M<sub>y,Ed</sub>| = ${fmt(g.My, 2)} kNm${g.Mz ? `, |M<sub>z,Ed</sub>| = ${fmt(g.Mz, 2)} kNm` : ''}${g.Nc || g.Nt ? `, N = ${fmt(g.Nc || -g.Nt, 1)} kN` : ''}<br>σ<sub>m,y,d</sub> = ${fmt(g.smy, 2)} MPa ≤ f<sub>m,y,d</sub> = ${fmt(g.f.my, 2)} MPa (k<sub>mod</sub> = ${fmt(g.kmod, 2)})<br>η = <b>${fmt(g.ratio * 100, 0)}%</b> · ${esc(g.c.eq)}`, stressSVG(sec, g.smy, null), `bend${sd.seg.i}`); }
    if (G.shear) { const g = G.shear; h += card(`${esc(cap(sd.seg.label))} – ścinanie`, `x = ${fmt(g.x, 2)} m; |V<sub>Ed</sub>| = ${fmt(g.Vy, 2)} kN; b<sub>ef</sub> = k<sub>cr</sub>·b = ${fmt(mt.kcr * sec.b, 1)} mm<br>τ<sub>d</sub> = 1,5·V/(b<sub>ef</sub>h) = ${fmt(g.ty, 3)} MPa ≤ f<sub>v,d</sub> = ${fmt(g.f.v, 2)} MPa<br>η = <b>${fmt(g.ratio * 100, 0)}%</b> · ${esc(g.c.eq)}`, stressSVG(sec, null, g.ty), `shear${sd.seg.i}`); }
  });
  h += `</div>`;
  // stateczność
  h += `<div class="box" style="margin-top:12px"><h4>Stateczność – zwichrzenie (6.3.3) i wyboczenie (6.3.2)</h4><table class="reqt"><tr><th>Odcinek / strefa</th><th>l<sub>ef</sub> [m]</th><th>σ<sub>m,crit</sub> [MPa]</th><th>λ<sub>rel,m</sub></th><th>k<sub>crit</sub></th><th>λ<sub>y</sub> / λ<sub>z</sub></th><th>k<sub>c,y</sub> / k<sub>c,z</sub></th></tr>`;
  R.segData.forEach(sd => {
    [['plus', 'M > 0 (krawędź górna)'], ['minus', 'M < 0 (krawędź dolna)']].forEach(([zk, l], j) => {
      const z = sd.ltb[zk];
      h += `<tr><td>${esc(cap(sd.seg.label))} – ${l}<br><small style="color:var(--ink3)">${esc(z.src || '')}</small></td><td>${z.lef ? fmt(z.lef / 1000, 2) : '—'}</td><td>${z.sigcrit ? fmt(z.sigcrit, 1) : '—'}</td><td>${z.lam ? fmt(z.lam, 3) : '—'}</td><td><b>${fmt(z.kcrit, 3)}</b></td>${j === 0 ? `<td rowspan="2">${fmt(sd.buck.y.lam, 0)} / ${sd.buck.z.cont ? '—' : fmt(sd.buck.z.lam, 0)}</td><td rowspan="2">${fmt(sd.buck.y.kc, 3)} / ${fmt(sd.buck.z.kc, 3)}</td>` : ''}</tr>`;
    });
  });
  h += `</table><p class="hint">σ<sub>m,crit</sub> = π·√(E<sub>0,05</sub>I<sub>z</sub>G<sub>0,05</sub>I<sub>tor</sub>)/(l<sub>ef</sub>W<sub>y</sub>) (6.31); λ<sub>rel,m</sub> = √(f<sub>m,k</sub>/σ<sub>m,crit</sub>); k<sub>crit</sub> wg (6.34). Wyboczenie ma znaczenie tylko przy ściskaniu osiowym.</p></div>`;
  el.innerHTML = h;
  $$('[data-ck]', el).forEach(c => { c.classList.add('xclick'); c.title = 'Kliknij – tok obliczeń'; c.addEventListener('click', () => { const ck = R.checks.find(q => q.id === c.dataset.ck); if (ck) explainPopup(ck); }); });
  $$('[data-geo]', el).forEach(b => b.addEventListener('click', () => geoPopup(+b.dataset.geo)));
}

/* ------------------------------------------------------------- wykresy */
let chartSeq = 0;
const CHARTS = {};
function niceTicks(a, b, n) {
  const span = b - a; if (!(span > 0)) return [a];
  const step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), r = step0 / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
function lineChart(o) {
  const W = o.W || 820, H = o.H || 230, ml = 58, mr = 120, mt = 38, mb = 34;
  const xs = o.series.flatMap(s => Array.from(s.x)), ys = o.series.flatMap(s => Array.from(s.y).filter(isFinite)).concat((o.hl || []).map(h => h.y)).concat([0]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  let ymin = Math.min(...ys), ymax = Math.max(...ys);
  if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
  const pad = (ymax - ymin) * 0.12; ymin -= pad; ymax += pad;
  const inv = !!o.invert;
  const X = x => ml + (x - xmin) / (xmax - xmin) * (W - ml - mr);
  const Y = y => inv ? mt + (y - ymin) / (ymax - ymin) * (H - mt - mb) : H - mb - (y - ymin) / (ymax - ymin) * (H - mt - mb);
  const cid = 'c' + (++chartSeq);
  CHARTS[cid] = { ml, mr, W, H, mt, mb, xmin, xmax, series: o.series, unit: o.unit || '', dp: o.dp !== undefined ? o.dp : 2, X, Y };
  let s = svgOpen(W, H, `class="lchart" data-cid="${cid}"`);
  s += tx(ml, 14, esc(o.title || ''), { a: 'start', fs: 12, w: 650 });
  const ticks = niceTicks(ymin, ymax, 6);
  ticks.forEach(t => { s += `<line x1="${ml}" y1="${Y(t)}" x2="${W - mr}" y2="${Y(t)}" stroke="#eef0f3"/>` + tx(ml - 6, Y(t) + 3.5, fmt(t, Math.abs((ticks[1] || t + 1) - ticks[0]) < 1 ? 1 : 0), { a: 'end', fs: 10, c: '#7a8494' }); });
  const xt = niceTicks(xmin, xmax, 10);
  xt.forEach(t => { s += `<line x1="${X(t)}" y1="${mt}" x2="${X(t)}" y2="${H - mb}" stroke="#f3f4f6"/>` + tx(X(t), H - mb + 14, fmt(t, (xt[1] || 1) - xt[0] < 1 ? 1 : 0), { fs: 10, c: '#7a8494' }); });
  s += tx((ml + W - mr) / 2, H - 4, 'x [m]', { fs: 10.5, c: '#4a5466' });
  s += tx(14, (mt + H - mb) / 2, esc(o.yl || ''), { fs: 10.5, c: '#4a5466', rot: -90 });
  (o.vl || []).forEach(v => { s += `<line x1="${X(v.x)}" y1="${mt}" x2="${X(v.x)}" y2="${H - mb}" stroke="#9aa3b0" stroke-width="0.8" stroke-dasharray="4 3"/>` + (v.l ? tx(X(v.x), mt - 3, esc(v.l), { fs: 9.5, c: '#5b6576', w: 600 }) : ''); });
  s += `<line x1="${ml}" y1="${Y(0)}" x2="${W - mr}" y2="${Y(0)}" stroke="#39414f" stroke-width="1"/>`;
  (o.hseg || []).forEach(hs => { s += `<line x1="${X(hs.x0)}" y1="${Y(hs.y)}" x2="${X(hs.x1)}" y2="${Y(hs.y)}" stroke="${hs.c}" stroke-width="1.2" stroke-dasharray="6 4"/>` + (hs.l ? tx(X(hs.x1) - 3, Y(hs.y) + (inv ? -4 : 11) * (hs.y >= 0 ? 1 : -1), esc(hs.l), { a: 'end', fs: 9.5, c: hs.c }) : ''); });
  o.series.forEach(se => {
    const pts = se.x.map((x, i) => `${X(x).toFixed(1)},${Y(se.y[i]).toFixed(1)}`).join(' ');
    if (se.fill) s += `<polygon points="${X(se.x[0]).toFixed(1)},${Y(0).toFixed(1)} ${pts} ${X(se.x[se.x.length - 1]).toFixed(1)},${Y(0).toFixed(1)}" fill="${se.fill}" fill-opacity="0.45"/>`;
    s += `<polyline points="${pts}" fill="none" stroke="${se.c}" stroke-width="${se.w || 1.6}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>`;
  });
  (o.marks || []).forEach(mk => { const px = X(mk.x), py = Y(mk.y), below = inv ? mk.y >= 0 : mk.y < 0; s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.6" fill="${mk.c}"/>` + tx(Math.max(ml + 10, Math.min(W - mr - 10, px)), py + (below ? 13 : -6), esc(mk.l), { fs: 10, c: mk.c, w: 650 }); });
  let lx = W - mr + 8, ly = mt + 6;
  o.series.filter(se => se.l).forEach(se => { s += `<line x1="${lx}" y1="${ly}" x2="${lx + 16}" y2="${ly}" stroke="${se.c}" stroke-width="2" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/>` + tx(lx + 20, ly + 3.5, esc(se.l), { a: 'start', fs: 9.5 }); ly += 14; });
  s += `<g class="cur" style="display:none;pointer-events:none"><line class="curl" x1="0" y1="${mt}" x2="0" y2="${H - mb}" stroke="#1d5bb8" stroke-width="1" stroke-dasharray="3 2"/><g class="curd"></g><rect class="curbg" x="0" y="${mt - 2}" width="10" height="16" rx="3" fill="#ffffff" fill-opacity="0.92" stroke="#c9d4e6"/><text class="curt" x="0" y="${mt + 10}" font-size="10.5" fill="#1b2230"></text></g>`;
  s += `<rect class="hit" x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}" fill="transparent"/>`;
  return s + '</svg>';
}
function serAt(se, x) {
  const xs = se.x, ys = se.y;
  for (let i = 0; i < xs.length - 1; i++) if (x >= xs[i] - 1e-9 && x <= xs[i + 1] + 1e-9 && xs[i + 1] > xs[i]) return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
  return null;
}
// znaczniki na wykresach (LPM – dodaj / usuń w tym miejscu, PPM – usuń wszystkie): wspólne położenia x [m]
const chartPins = [];
function drawPins(svg) {
  const C = CHARTS[svg.dataset.cid]; if (!C) return;
  let g = svg.querySelector('g.pins'); if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'pins'); svg.insertBefore(g, svg.querySelector('g.cur')); }
  let s = ''; const boxes = [];
  chartPins.forEach(xm => {
    if (xm < C.xmin - 1e-9 || xm > C.xmax + 1e-9) return;
    const px = C.X(xm);
    s += `<line x1="${px.toFixed(1)}" y1="${C.mt}" x2="${px.toFixed(1)}" y2="${C.H - C.mb}" stroke="#a35d00" stroke-width="0.8" stroke-dasharray="2 3"/>`;
    const xt = `x = ${fmt(xm, 2)}`, xw = xt.length * 5.4 + 6;
    s += `<rect x="${(px - xw / 2).toFixed(1)}" y="${C.H - C.mb - 12}" width="${xw.toFixed(1)}" height="12" rx="2" fill="#a35d00" fill-opacity="0.9"/>` + tx(px, C.H - C.mb - 3, xt, { fs: 9, c: '#ffffff', w: 600 });
    const seen = [];
    C.series.forEach(se => {
      const v = serAt(se, xm); if (v === null || !isFinite(v) || seen.some(q => Math.abs(q - v) < 1e-6)) return; seen.push(v);
      if (Math.abs(v) < 0.5 * Math.pow(10, -C.dp) && C.series.some(q => { const w = serAt(q, xm); return w !== null && Math.abs(w) >= 0.5 * Math.pow(10, -C.dp); })) return;
      const py = C.Y(v), lab = fmt(v, C.dp), tw = lab.length * 5.8 + 4;
      const cand = [[px, py - 6], [px, py + 13], [px + tw / 2 + 6, py + 3], [px - tw / 2 - 6, py + 3], [px, py - 17], [px, py + 24]];
      const ok = cand.find(([x, y]) => !boxes.some(b => Math.abs(b[0] - x) < (tw + b[2]) / 2 && Math.abs(b[1] - y) < 11) && y > C.mt && y < C.H - C.mb - 12) || cand[0];
      boxes.push([ok[0], ok[1], tw]);
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${se.c}" stroke="#ffffff" stroke-width="0.8"/><rect x="${(ok[0] - tw / 2).toFixed(1)}" y="${(ok[1] - 9).toFixed(1)}" width="${tw.toFixed(1)}" height="11" rx="2" fill="#ffffff" fill-opacity="0.85"/>` + tx(ok[0], ok[1], lab, { fs: 10, c: se.c, w: 650 });
    });
  });
  g.innerHTML = s;
}
function bindChartCursor(root) {
  const svgs = $$('svg.lchart', root);
  const xOf = (svg, e) => { const C = CHARTS[svg.dataset.cid], r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * C.W / r.width; const x = C.xmin + (px - C.ml) / (C.W - C.ml - C.mr) * (C.xmax - C.xmin); return x < C.xmin - 1e-9 || x > C.xmax + 1e-9 ? null : x; };
  const show = x => svgs.forEach(svg => {
    const C = CHARTS[svg.dataset.cid]; if (!C) return;
    const g = $('.cur', svg);
    if (x === null) { g.style.display = 'none'; return; }
    const px = C.X(x);
    g.style.display = '';
    $('.curl', g).setAttribute('x1', px); $('.curl', g).setAttribute('x2', px);
    const vals = C.series.filter(se => se.l).map(se => { const v = serAt(se, x); return v === null ? '' : `${se.l}: ${fmt(v, C.dp)}`; }).filter(Boolean);
    let d = ''; C.series.forEach(se => { const v = serAt(se, x); if (v !== null) d += `<circle cx="${px}" cy="${C.Y(v)}" r="2.5" fill="${se.c}"/>`; });
    $('.curd', g).innerHTML = d;
    const t = $('.curt', g); t.textContent = `x = ${fmt(x, 2)} m · ${vals.join(' · ')} ${C.unit}`;
    const tw = t.getComputedTextLength ? t.getComputedTextLength() : 200;
    const left = px + 8 + tw > C.W - 4 ? px - 8 - tw : px + 8;
    t.setAttribute('x', left); const bg = $('.curbg', g); bg.setAttribute('x', left - 4); bg.setAttribute('width', tw + 8);
  });
  const updBar = () => { const b = $('#pinClr', root); if (b) b.style.display = chartPins.length ? '' : 'none'; };
  svgs.forEach(svg => {
    const C = CHARTS[svg.dataset.cid]; if (!C) return;
    svg.style.cursor = 'crosshair';
    svg.addEventListener('mousemove', e => show(xOf(svg, e)));
    svg.addEventListener('mouseleave', () => show(null));
    svg.addEventListener('click', e => {
      const x = xOf(svg, e); if (x === null) return;
      const tol = 7 * (C.xmax - C.xmin) / (C.W - C.ml - C.mr), j = chartPins.findIndex(v => Math.abs(v - x) <= tol);
      if (j >= 0) chartPins.splice(j, 1); else { chartPins.push(+x.toFixed(3)); if (chartPins.length > 10) chartPins.shift(); }
      svgs.forEach(drawPins); updBar();
    });
    svg.addEventListener('contextmenu', e => { e.preventDefault(); if (!chartPins.length) return; chartPins.length = 0; svgs.forEach(drawPins); updBar(); toast('Usunięto znaczniki z wykresów.', 1500); });
  });
  svgs.forEach(drawPins); updBar();
  const pc = $('#pinClr', root); if (pc) pc.onclick = () => { chartPins.length = 0; svgs.forEach(drawPins); updBar(); };
}
function envSeries(env, k, stX, mul) {
  mul = mul || 1;
  return { x: Array.from(stX), mx: Array.from(env[k].mx, v => v * mul), mn: Array.from(env[k].mn, v => v * mul) };
}
function extremeMarks(st, arrMx, arrMn, md, col, dp) {
  const marks = [];
  md.segs.forEach(sg => {
    let iM = -1, iN = -1;
    for (let i = 0; i < arrMx.length; i++) { if (st.stSeg[i] !== sg.i) continue; if (iM < 0 || arrMx[i] > arrMx[iM]) iM = i; if (iN < 0 || arrMn[i] < arrMn[iN]) iN = i; }
    if (iM >= 0 && arrMx[iM] > 1e-6) marks.push({ x: st.stX[iM], y: arrMx[iM], l: fmt(arrMx[iM], dp), c: col });
    if (iN >= 0 && arrMn[iN] < -1e-6) marks.push({ x: st.stX[iN], y: arrMn[iN], l: fmt(arrMn[iN], dp), c: col });
  });
  return marks;
}
let chartItems = false;
let chartSel = (() => { try { return localStorage.getItem('belkadr-chart') || 'M'; } catch (e) { return 'M'; } })();
function renderCharts(el) {
  const md = R.md, st = R.st, W = Math.max(640, Math.min(1400, (el.clientWidth || 1000) - 30));
  Object.keys(CHARTS).forEach(k => delete CHARTS[k]);
  const vl = md.sups.map(p => ({ x: p.x, l: p.label }));
  const hasN = st.need.x || st.items.some(o => o.it.N);
  const avail = [['M', 'M'], ['V', 'V'], ...(hasN ? [['N', 'N']] : []), ...(st.need.z ? [['Mz', 'M_z, V_z']] : []), ...(st.need.t ? [['T', 'T']] : []), ['w', 'ugięcia'], ['eta', 'wytężenie η'], ['R', 'reakcje'], ['comb', 'kombinacje'], ['all', 'wszystkie']];
  if (!avail.some(a => a[0] === chartSel)) chartSel = 'M';
  const on = k => chartSel === 'all' || chartSel === k;
  let h = `<p class="hint">Najedź kursorem na wykres – wartości w tym miejscu belki. <b>Kliknij wykres</b> – znacznik: kropki i wartości w tym miejscu na wszystkich wykresach; kliknięcie przy znaczniku – usunięcie; <b>prawy przycisk</b> – usunięcie wszystkich znaczników. <button class="lnk" id="pinClr" style="display:none">usuń znaczniki</button></p>`;
  h += `<div class="box"><h4>Schemat obciążeń <small style="font-weight:400;color:var(--ink3)">wartości charakterystyczne; [Z] – poziomo, [⊥] – prostopadle do osi; kliknij przęsło lub obciążenie, aby je zmienić</small></h4>${schemeSVG(W)}</div>`;
  h += `<div class="chsw"><span class="segsw" role="tablist" aria-label="Wykres">${avail.map(([k, l]) => `<button data-chs="${k}" class="${chartSel === k ? 'on' : ''}">${l}</button>`).join('')}</span>${on('M') || on('V') ? `<label class="chk sm"><input type="checkbox" id="chItems" ${chartItems ? 'checked' : ''}> od poszczególnych obciążeń (char.) zamiast obwiedni</label>` : ''}</div>`;
  const ch = (o) => `<div class="box" style="margin-top:12px">${lineChart(Object.assign({ W, vl }, o))}</div>`;
  const x = Array.from(st.stX);
  if (on('R')) h += `<div class="box" style="margin-top:12px"><h4>Reakcje podporowe</h4>${reactionsHTML()}</div>`;
  if (chartItems && (on('M') || on('V'))) {
    const cols = ['#4a5466', '#1d5bb8', '#0e8fa8', '#1d7f3c', '#6a3fb5', '#b5651d', '#c0262d', '#0b7285'];
    const ser = k => st.items.map((o, j) => { const a = new Float64Array(x.length); o.units.forEach(u => { for (let i = 0; i < a.length; i++) a[i] += u[k][i]; }); return { x, y: Array.from(a), c: cols[j % cols.length], l: o.key, w: 1.3 }; });
    if (on('M')) h += ch({ title: 'Momenty zginające M_y [kNm] od poszczególnych obciążeń (char.)', series: ser('My'), yl: 'M [kNm]', invert: true, unit: 'kNm' });
    if (on('V')) h += ch({ title: 'Siły poprzeczne V_y [kN] od poszczególnych obciążeń (char.)', series: ser('Vy'), yl: 'V [kN]', unit: 'kN' });
  } else {
    if (on('M')) { const M = envSeries(R.env.uls, 'My', st.stX), Mk = envSeries(R.env.char, 'My', st.stX);
      h += ch({ title: 'Momenty zginające M_y [kNm] – po stronie włókien rozciąganych', series: [{ x, y: M.mx, c: '#c0262d', fill: '#e6b3b3', l: 'M_Ed max' }, { x, y: M.mn, c: '#c0262d', fill: '#e6b3b3', l: 'M_Ed min' }, { x, y: Mk.mx, c: '#1d5bb8', dash: '5 3', w: 1.2, l: 'M_k max' }, { x, y: Mk.mn, c: '#1d5bb8', dash: '5 3', w: 1.2, l: 'M_k min' }], yl: 'M [kNm]', invert: true, unit: 'kNm', H: 300, marks: extremeMarks(st, M.mx, M.mn, md, '#c0262d', 2) }); }
    if (on('V')) { const V = envSeries(R.env.uls, 'Vy', st.stX);
      h += ch({ title: 'Siły poprzeczne V_y [kN]', series: [{ x, y: V.mx, c: '#1d5bb8', fill: '#c9d4e6', l: 'V_Ed max' }, { x, y: V.mn, c: '#1d5bb8', fill: '#c9d4e6', l: 'V_Ed min' }], yl: 'V [kN]', unit: 'kN', H: 300, marks: extremeMarks(st, V.mx, V.mn, md, '#1d5bb8', 2) }); }
  }
  if (on('Mz') && st.need.z) {
    const Mz = envSeries(R.env.uls, 'Mz', st.stX), Vz = envSeries(R.env.uls, 'Vz', st.stX);
    h += ch({ title: 'Momenty zginające M_z [kNm] (płaszczyzna pozioma)', series: [{ x, y: Mz.mx, c: '#6a3fb5', fill: '#b597ee', l: 'M_z,Ed max' }, { x, y: Mz.mn, c: '#6a3fb5', fill: '#b597ee', l: 'M_z,Ed min' }], yl: 'M_z [kNm]', invert: true, unit: 'kNm', marks: extremeMarks(st, Mz.mx, Mz.mn, md, '#6a3fb5', 2) });
    h += ch({ title: 'Siły poprzeczne V_z [kN]', series: [{ x, y: Vz.mx, c: '#6a3fb5', l: 'V_z,Ed max' }, { x, y: Vz.mn, c: '#6a3fb5', l: 'V_z,Ed min' }], yl: 'V_z [kN]', unit: 'kN' });
  }
  if (on('N') && hasN) { const N = envSeries(R.env.uls, 'N', st.stX); h += ch({ title: 'Siła podłużna N [kN] (+ ściskanie)', series: [{ x, y: N.mx, c: '#6a3fb5', fill: '#b597ee', l: 'N_Ed max' }, { x, y: N.mn, c: '#6a3fb5', l: 'N_Ed min' }], yl: 'N [kN]', unit: 'kN', H: 260, marks: extremeMarks(st, N.mx, N.mn, md, '#6a3fb5', 1) }); }
  if (on('T') && st.need.t) { const T = envSeries(R.env.uls, 'T', st.stX); h += ch({ title: 'Momenty skręcające T [kNm]', series: [{ x, y: T.mx, c: '#b5651d', fill: '#e6a35a', l: 'T_Ed max' }, { x, y: T.mn, c: '#b5651d', l: 'T_Ed min' }], yl: 'T [kNm]', unit: 'kNm', H: 260, marks: extremeMarks(st, T.mx, T.mn, md, '#b5651d', 2) }); }
  if (on('w')) {
    const D = R.defl, w = k => Array.from(D[k], v => v * 1000);
    const hseg = [];
    md.segs.forEach(sg => { const sd = R.slsData[sg.i], lim = sd.lim; [[1, '#c0262d'], [0, '#a35d00']].forEach(([j, c]) => { if (S.sls.use[j] && lim[j] > 0) { const v = sd.Lmm / lim[j]; hseg.push({ x0: sg.x0, x1: sg.x1, y: v, c, l: `${sd.cant ? 'l_w' : 'L'}/${lim[j]}` }); } }); });
    h += ch({ title: 'Ugięcia [mm] – względem podpór (przęsła: od cięciwy); linie przerywane – granice w_net,fin i w_inst', series: [{ x, y: w('instMx'), c: '#a35d00', l: 'w_inst' }, { x, y: w('finMx'), c: '#1d7f3c', fill: '#a6c76a', l: 'w_fin' }, { x, y: w('instMn'), c: '#a35d00', w: 1 }, { x, y: w('finMn'), c: '#1d7f3c', w: 1 }], yl: 'w [mm]', invert: true, unit: 'mm', dp: 1, H: 300, hseg, marks: extremeMarks(st, w('finMx'), w('finMn'), md, '#1d7f3c', 1) });
    if (R.deflZ) { const wz = k => Array.from(R.deflZ[k], v => v * 1000); h += ch({ title: 'Ugięcia poziome w_z [mm]', series: [{ x, y: wz('instMx'), c: '#a35d00', l: 'w_z,inst' }, { x, y: wz('finMx'), c: '#6a3fb5', l: 'w_z,fin' }, { x, y: wz('finMn'), c: '#6a3fb5', w: 1 }], yl: 'w_z [mm]', invert: true, unit: 'mm', dp: 1 }); }
  }
  if (on('eta')) { const eb = Array.from(R.eta.bend, v => v * 100), es = Array.from(R.eta.shear, v => v * 100), et = Array.from(R.eta.stab, v => v * 100);
    h += ch({ title: 'Wytężenie wzdłuż belki η(x) [%] – SGN (obwiednia wszystkich kombinacji)', series: [{ x, y: eb, c: '#c0262d', l: 'zginanie', fill: '#e6b3b3' }, { x, y: et, c: '#a35d00', l: 'stateczność' }, { x, y: es, c: '#1d5bb8', l: 'ścinanie' }], hseg: [{ x0: 0, x1: md.Ltot, y: 100, c: '#c0262d', l: '100%' }], yl: 'η [%]', unit: '%', dp: 0, H: 300 }); }
  if (on('comb')) h += `<div class="box" style="margin-top:12px"><h4>Kombinacje SGN (PN-EN 1990) i ich wyniki</h4>${combosHTML()}</div>`;
  el.innerHTML = h;
  bindChartCursor(el);
  const ci = $('#chItems', el); if (ci) ci.onchange = e => { chartItems = e.target.checked; rendered.chart = false; renderActive(); };
  $$('[data-chs]', el).forEach(b => b.addEventListener('click', () => { chartSel = b.dataset.chs; try { localStorage.setItem('belkadr-chart', chartSel); } catch (e) { /* */ } rendered.chart = false; renderActive(); }));
  bindScheme(el);
}
function reactionsHTML() {
  const md = R.md;
  let h = `<table class="reqt"><tr><th>Podpora</th><th>x [m]</th><th>R<sub>Ed,max</sub></th><th>R<sub>Ed,min</sub></th><th>R<sub>k,max</sub></th><th>R<sub>k,G</sub></th>${R.st.items.filter(o => o.cls !== 'G').map(o => `<th>R<sub>k</sub> ${o.key}</th>`).join('')}<th>H<sub>Ed</sub></th>${R.st.need.z ? '<th>R<sub>z,Ed</sub></th>' : ''}<th>M<sub>Ed</sub></th></tr>`;
  md.sups.forEach((p, k) => {
    const r = R.reac[k];
    const Hx = Math.abs(r.H.mx) > Math.abs(r.H.mn) ? r.H.mx : r.H.mn, Mm = Math.abs(r.M.mx) > Math.abs(r.M.mn) ? r.M.mx : r.M.mn, Rz = Math.abs(r.Z.mx) > Math.abs(r.Z.mn) ? r.Z.mx : r.Z.mn;
    h += `<tr><td>${esc(p.label)} – ${esc(p.typeName)}</td><td>${fmt(p.x, 2)}</td><td><b>${fmt(r.ULS.mx, 2)}</b></td><td${r.ULS.mn < 0 ? ' class="no"' : ''}>${fmt(r.ULS.mn, 2)}</td><td>${fmt(r.CHAR.mx, 2)}</td><td>${fmt(r.G, 2)}</td>${R.st.items.filter(o => o.cls !== 'G').map(o => `<td>${fmt(r.items[o.key].Ry, 2)}</td>`).join('')}<td>${p.dof.x ? fmt(Hx, 2) : '—'}</td>${R.st.need.z ? `<td>${fmt(Rz, 2)}</td>` : ''}<td>${p.dof.r ? fmt(Mm, 2) : '—'}</td></tr>`;
  });
  return h + `</table><p class="hint">Reakcje [kN, kNm]: dodatnie – podpora podtrzymuje belkę (w górę). R<sub>Ed</sub> – obwiednia kombinacji SGN, R<sub>k</sub> – kombinacja charakterystyczna i od poszczególnych oddziaływań (do zestawienia obciążeń konstrukcji podpierającej).</p>`;
}
function combosHTML() {
  const list = R.cb.uls.concat(R.cb.acc);
  const segMax = (c, k) => { let m = 0; for (let i = 0; i < c.env[k].mx.length; i++) m = Math.max(m, Math.abs(c.env[k].mx[i]), Math.abs(c.env[k].mn[i])); return m; };
  const etaC = c => { let m = 0; R.checks.forEach(x => { if (x.d && x.d.c === c && isFinite(x.ratio)) m = Math.max(m, x.ratio); }); return m; };
  let h = `<div class="tscroll"><table class="reqt"><tr><th>Nr</th><th>Wzór</th><th>Kombinacja (G – obciążenia stałe, Q – zmienne, A – wyjątkowe)</th><th>Klasa trwania</th><th>k<sub>mod</sub></th><th>|M<sub>Ed</sub>|<sub>max</sub></th><th>|V<sub>Ed</sub>|<sub>max</sub></th><th>decyduje w</th></tr>`;
  list.forEach(c => { const e = etaC(c); h += `<tr><td>${c.id}</td><td>${esc(c.eq)}</td><td>${esc(c.desc)}</td><td>${c.type === 'ACC' ? 'wyjątkowa' : esc(E.DUR_NAME[c.fam])}</td><td>${fmt(c.kmod, 2)}</td><td>${fmt(segMax(c, 'My'), 2)}</td><td>${fmt(segMax(c, 'Vy'), 2)}</td><td>${e ? fmt(e * 100, 0) + '%' : '—'}</td></tr>`; });
  h += `</table></div><p class="hint">Obciążenia stałe: γ<sub>G,sup</sub> gdy działają niekorzystnie, γ<sub>G,inf</sub> gdy korzystnie; zmienne – tylko tam, gdzie niekorzystne${S.loads.pattern ? ' (użytkowe i inne – osobno w każdym przęśle)' : ''}. Grupy wg klas trwania: w grupie są obciążenia o czasie trwania nie krótszym niż k<sub>mod</sub> grupy (3.1.3(2)). „decyduje w” – największe wytężenie, w którym ta kombinacja jest decydująca.</p>`;
  return h;
}

/* ----------------------------------------------- zakładka Belka i podpory (rysunek) */
function supTableHTML() {
  let h = `<table class="reqt"><tr><th>Podpora</th><th>rodzaj</th><th>t [mm]</th><th>l<sub>ef</sub> [mm]</th><th>k<sub>c,90</sub></th><th>F<sub>c,90,d</sub> [kN]</th><th>σ<sub>c,90,d</sub> [MPa]</th><th>k<sub>c,90</sub>·f<sub>c,90,d</sub></th><th>η</th><th>podcięcie</th></tr>`;
  R.supData.forEach(sd => {
    const p = sd.p, b = sd.bear;
    h += `<tr><td>${esc(p.label)} – ${esc(p.name)}</td><td>${esc(p.typeName)}</td><td>${fmt(p.t, 0)}</td><td>${fmt(sd.bl.lef, 0)}</td><td>${fmt(sd.kc.k, 2)}</td><td>${b ? fmt(b.F, 2) : '—'}</td><td>${b ? fmt(b.s, 2) : '—'}</td><td>${b ? fmt(sd.kc.k * b.fd, 2) : '—'}</td><td class="${b && b.ratio > 1 ? 'no' : 'yes'}">${b ? fmt(b.ratio * 100, 0) + '%' : '—'}</td><td>${sd.notch ? `h<sub>ef</sub> = ${fmt(sd.notch.hef, 0)}, k<sub>v</sub> = ${fmt(sd.notch.kv, 3)}, η = ${fmt(sd.notch.ratio * 100, 0)}%` : '—'}</td></tr>`;
  });
  return h + '</table>';
}
function scheduleHTML() {
  const md = R.md, mt = R.mt;
  const groups = [];
  md.segs.forEach(sg => {
    let L = sg.L; if (sg.i === 0) L += md.extL; if (sg.i === md.segs.length - 1) L += md.extR;
    const key = `${sg.b1}x${sg.h}`, g = groups.find(q => q.key === key);
    if (g) g.L += L; else groups.push({ key, b: sg.b1, h: sg.h, L });
  });
  let V = 0, M = 0;
  let h = `<table class="sched"><tr><th>Element</th><th>Materiał</th><th>Przekrój b×h [mm]</th><th>Liczba szt.</th><th>Długość [m]</th><th>Objętość [m³]</th><th>Masa [kg]</th></tr>`;
  groups.forEach((g, k) => {
    const n = S.geom.n, v = g.b * g.h * 1e-6 * g.L * n, mm = v * mt.m.rhom;
    V += v; M += mm;
    h += `<tr><td>${esc(S.meta.name)}${groups.length > 1 ? ` – część ${k + 1}` : ''}</td><td>${esc(mt.m.name)}</td><td class="n">${fmt(g.b, 0)}×${fmt(g.h, 0)}</td><td class="n">${n}</td><td class="n">${fmt(g.L, 2)}</td><td class="n">${fmt(v, 4)}</td><td class="n">${fmt(mm, 1)}</td></tr>`;
  });
  h += `<tr class="tot"><td colspan="5">Razem</td><td class="n">${fmt(V, 4)}</td><td class="n">${fmt(M, 1)}</td></tr></table>`;
  h += `<p class="hint">Masa z gęstości średniej ρ<sub>mean</sub> = ${fmt(mt.m.rhom, 0)} kg/m³ (bez naddatków na obróbkę i odpad). Długość elementu obejmuje oparcia na podporach skrajnych (t/2 + wysunięcie a).</p>`;
  return h;
}
/* ------------------------------------------------------------ podsumowanie */
const CHECK_DP = { kNm: 2, kN: 2, mm: 1, MPa: 2, '': 3, Hz: 2, 'mm/kN': 2 };
function ckVal(c, v) { const dp = typeof c.fmt === 'number' ? c.fmt : (CHECK_DP[c.unit] ?? 2); return fmt(v, dp); }
function ckCond(c) {
  if (c.cond) return esc(c.cond);
  if (c.status === 'info' || (c.status === 'warn' && !isFinite(c.ratio))) return '';
  const u = c.unit ? ' ' + c.unit : '';
  return `${ckVal(c, c.Ed)} ≤ ${ckVal(c, c.Rd)}${u}`;
}
const STL = { ok: 'OK', fail: 'NIE', warn: 'UWAGA', info: 'INFO' };
U.ckCond = ckCond; U.STL = STL;
function utilBar(c) {
  if (c.status === 'info' || !isFinite(c.ratio)) return '';
  const r = c.ratio, w = Math.min(100, r * 100);
  const cls = c.status === 'fail' ? 'fail' : r > 0.9 ? 'warn' : '';
  return `<span class="ub ${cls}"><i style="width:${w}%"></i></span><span class="pct">${fmt(r * 100, 0)}%</span>`;
}
function renderSummary(el) {
  const c = R.checks;
  const worst = pred => { const a = c.filter(pred).filter(x => x.status !== 'info' && isFinite(x.ratio)); return a.length ? a.reduce((p, q) => (q.ratio > p.ratio ? q : p)) : null; };
  const card = (t, v, s, ck) => `<div class="card ${ck ? (ck.status === 'fail' ? 'fail' : ck.status === 'warn' ? 'warn' : 'ok') : ''}"${ck ? ` data-cki="${c.indexOf(ck)}"` : ''}><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const mt = R.mt;
  let cards = card('Materiał', esc(mt.m.id === undefined ? mt.m.name : (S.mat.cls === 'U' ? 'własny' : S.mat.cls)), `${S.geom.n > 1 ? S.geom.n + '×' : ''}${fmt(S.geom.b, 0)}×${fmt(S.geom.h, 0)} mm · klasa użytk. ${S.env.sc} · γ<sub>M</sub> = ${fmt(mt.gM, 2)}`);
  const wb = worst(x => /^bend/.test(x.id)); if (wb) cards += card('Zginanie', `${fmt(wb.ratio * 100, 0)}%`, `σ<sub>m,d</sub> = ${fmt(wb.d.smy, 2)} / f<sub>m,d</sub> = ${fmt(wb.d.f.my, 2)} MPa`, wb);
  const ws = worst(x => /^shear\d/.test(x.id)); if (ws) cards += card('Ścinanie', `${fmt(ws.ratio * 100, 0)}%`, `τ<sub>d</sub> = ${fmt(ws.d.ty, 3)} / f<sub>v,d</sub> = ${fmt(ws.d.f.v, 2)} MPa`, ws);
  const wd = worst(x => /^(bear|ptb)/.test(x.id)); if (wd) cards += card('Docisk', `${fmt(wd.ratio * 100, 0)}%`, `σ<sub>c,90,d</sub> = ${fmt(wd.Ed, 2)} MPa`, wd);
  const wl = worst(x => /^ltb/.test(x.id)); if (wl) cards += card('Zwichrzenie', `${fmt(wl.ratio * 100, 0)}%`, `k<sub>crit</sub> = ${fmt(wl.d.z.kcrit, 3)}, l<sub>ef</sub> = ${fmt(wl.d.z.lef / 1000, 2)} m`, wl);
  const wn = worst(x => /^w(inst|netfin|fin)/.test(x.id)); if (wn) cards += card('Ugięcie', `${fmt(wn.Ed, 1)} mm`, `${sym(wn.name.replace(/ ≤.*$/, ''))} ≤ ${fmt(wn.Rd, 1)} mm`, wn);
  const wv = worst(x => /^vib/.test(x.id)); if (wv && R.vib) cards += card('Drgania', `${fmt(R.vib.f1, 1)} Hz`, `f<sub>1</sub>; w/F = ${fmt(R.vib.wF, 2)} mm/kN`, wv);
  const wf = worst(x => /^Pożar/.test(x.grp)); if (wf) cards += card(`Pożar R ${S.fire.R}`, `${fmt(wf.ratio * 100, 0)}%`, `d<sub>ef</sub> = ${fmt(R.fireData.ch.def, 1)} mm`, wf);
  let html = `<div class="cards">${cards}</div>`;
  const msgs = [...(R.errors || []).map(e => `<div class="msg err">${esc(e)}</div>`), ...(R.warns || []).map(e => `<div class="msg wrn">${esc(e)}</div>`)];
  if (msgs.length) html += `<div class="msgs">${msgs.join('')}</div>`;
  const nF = c.filter(x => x.status === 'fail').length;
  if (nF) html += `<div class="failnav">Niespełnione warunki: ${c.map((x, i) => x.status === 'fail' ? `<button class="goto" data-goto="${i}">${sym(x.name)}</button>` : '').join('')}</div>`;
  const ticks = S.meta.ticks || {};
  const nT = c.filter(x => ticks[x.id]).length;
  html += `<div class="tickbar"><span id="tickCnt">Odhaczono: <b>${nT}</b> z ${c.length}</span><button class="btn sm" id="tickOk" title="Przywróć automatyczne odhaczanie: spełnione – zaznaczone, niespełnione – odznaczone">Odhacz automatycznie</button><button class="btn sm" id="tickClr">Wyczyść znaczniki</button><span class="hint">Spełnione warunki są odhaczane automatycznie, niespełnione – odznaczane (także po każdej zmianie danych). Raport obejmuje sprawdzenia odhaczone. Kliknij numer punktu normy lub wartość – objaśnienie i tok obliczeń.</span></div>`;
  html += `<div class="tscroll"><table class="ctab"><thead><tr><th class="tk" title="Sprawdzone">✓</th><th>Sprawdzenie</th><th>PN-EN 1995</th><th style="text-align:right">Warunek</th><th>Wykorzystanie</th><th>Status</th><th class="nt">Kombinacja / uwagi</th></tr></thead><tbody>`;
  let grp = '';
  c.forEach((x, i) => {
    if (x.grp !== grp) { grp = x.grp; html += `<tr class="g"><td colspan="7">${esc(grp)}</td></tr>`; }
    const on = !!ticks[x.id];
    html += `<tr class="${on ? 'done' : ''}" data-ci="${i}"><td class="tk"><input type="checkbox" data-tick="${i}" ${on ? 'checked' : ''} aria-label="sprawdzone"></td><td>${sym(x.name)}</td><td class="ref">${x.ref ? `<button class="nlink" data-nref="${esc(x.ref)}" data-grp="${esc(x.grp)}">${esc(x.ref)}</button>` : ''}</td><td class="val">${ckCond(x)}</td><td class="bar" style="white-space:nowrap">${utilBar(x)}</td><td class="stc"><span class="st ${x.status}">${STL[x.status]}</span>${x.status === 'fail' || x.status === 'warn' ? `<button class="goto" data-goto="${i}" title="Przejdź do miejsca, którego dotyczy warunek">pokaż →</button>` : ''}</td><td class="nt">${esc(x.combo || '')}${x.note ? (x.combo ? '; ' : '') + esc(x.note) : ''}${x.d ? ` <button class="lnk" data-exp="${i}">▸ Objaśnienie</button>` : ''}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  el.innerHTML = html;
  const upd = () => { const n = c.filter(x => (S.meta.ticks || {})[x.id]).length; $('#tickCnt', el).innerHTML = `Odhaczono: <b>${n}</b> z ${c.length}`; };
  const setTick = (x, v) => { S.meta.tickMan = S.meta.tickMan || {}; S.meta.tickMan[x.id] = v; syncTicks(); };
  $$('[data-tick]', el).forEach(cb => cb.addEventListener('change', () => { const x = c[+cb.dataset.tick]; setTick(x, cb.checked); cb.closest('tr').classList.toggle('done', cb.checked); upd(); dirty = true; updateTitle(); autosave(); rendered.report = false; }));
  $('#tickOk', el).onclick = () => { S.meta.tickMan = {}; syncTicks(); dirty = true; updateTitle(); autosave(); rendered.report = false; renderSummary(el); };
  $('#tickClr', el).onclick = () => { S.meta.tickMan = {}; c.forEach(x => { S.meta.tickMan[x.id] = false; }); syncTicks(); dirty = true; updateTitle(); autosave(); rendered.report = false; renderSummary(el); };
  $$('[data-exp]', el).forEach(b => b.addEventListener('click', () => explainPopup(c[+b.dataset.exp])));
  $$('tr[data-ci] td.val, tr[data-ci] td.bar', el).forEach(td => { const x = c[+td.closest('tr').dataset.ci]; if (!x.d) return; td.classList.add('xclick'); td.title = 'Kliknij – jak obliczono'; td.addEventListener('click', () => explainPopup(x)); });
  $$('[data-cki]', el).forEach(cd => { cd.classList.add('xclick'); cd.addEventListener('click', () => explainPopup(c[+cd.dataset.cki])); });
  $$('[data-goto]', el).forEach(b => b.addEventListener('click', () => gotoCheck(c[+b.dataset.goto])));
}
// przejście do miejsca, którego dotyczy warunek (pole formularza / podpora)
function gotoCheck(c) {
  if (c.col !== undefined) { U.selectTab('data'); setTimeout(() => colPopup(c.col), 60); return; }
  if (c.sup !== undefined && /^(bear|notch|upl)/.test(c.id)) { U.selectTab('data'); setTimeout(() => supportPopup(c.sup), 60); return; }
  if (/^(bend|shear|tor|comp|tens|fi)/.test(c.id) && c.seg !== undefined) { U.selectTab('data'); setTimeout(() => secWinPopup([c.seg]), 60); return; }
  const fld = /^w/.test(c.id) ? 'sls.lim' : /^ltb/.test(c.id) ? 'ltb.top' : /^vib/.test(c.id) ? 'sls.vib.s' : /^fi/.test(c.id) ? 'fire.R' : 'geom.h';
  U.selectTab('data');
  setTimeout(() => {
    const inp = $(`#inputs [data-k="${fld}"]`); if (!inp) return;
    const d = inp.closest('details.grp'); if (d) d.open = true;
    inp.scrollIntoView({ block: 'center' }); inp.classList.add('hlg'); setTimeout(() => inp.classList.remove('hlg'), 5000); inp.focus();
  }, 80);
}
// okno objaśnienia: punkt normy + tok obliczeń dla danego sprawdzenia
function explainPopup(c) {
  const m = $('#nmodal');
  const det = window.BDR && window.BDR.detail ? window.BDR.detail(c, R, S) : '';
  const norm = window.BDN ? window.BDN.html(c.ref, c.grp) : '';
  m.innerHTML = `<div class="dlg norm expl"><h3>${sym(c.name)}</h3><p><span class="st ${c.status}">${STL[c.status]}</span> ${isFinite(c.ratio) ? `η = <b>${fmt(c.ratio * 100, 0)}%</b>` : ''} ${c.combo ? '· ' + esc(c.combo) : ''}</p>${det ? `<div class="rexp">${det}</div>` : ''}${norm}<div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
}
function normPopup(ref, grp) {
  if (!window.BDN) return;
  const m = $('#nmodal');
  m.innerHTML = `<div class="dlg norm">${window.BDN.html(ref, grp, true) || `<p>Brak objaśnienia dla ${esc(ref)}.</p>`}<div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-nref]'); if (b) { e.preventDefault(); normPopup(b.dataset.nref, b.dataset.grp || ''); } });
$('#nmodal') && $('#nmodal').addEventListener('mousedown', e => { if (e.target.id === 'nmodal') e.currentTarget.style.display = 'none'; });
