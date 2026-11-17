/* ------------------------------------------- zakładka Dane – schemat belki (panel boczny) */
let diagKind = (() => { try { return localStorage.getItem('belkadr-diag') || 'M'; } catch (e) { return 'M'; } })();
const allItems = () => [...S.loads.perm.map((it, i) => ['perm', i, it]), ...S.loads.var.map((it, i) => ['var', i, it]), ...S.loads.acc.map((it, i) => ['acc', i, it])];
function supportSym(p, xx, yb, opt) {
  opt = opt || {};
  const ttl = `${p.label} – ${p.name}: ${p.typeName}${!p.dof.y ? ', bez blokady y' : ''}${p.kv ? `, k_v = ${fmt(+p.kv, 1)} kN/mm` : ''}${p.kr ? `, k_φ = ${fmt(+p.kr, 0)} kNm/rad` : ''}, t = ${fmt(p.t, 0)} mm – kliknij, aby zmienić`;
  let s = `<g class="supp" data-sup="${p.i}"><title>${esc(ttl)}</title><rect class="suphl" x="${xx - 16}" y="${yb - 18}" width="32" height="54" rx="4" fill="transparent" stroke="transparent"/>`;
  if (!p.dof.y) s += `<g opacity="0.4">`;
  const spring = p.kv > 0 ? 8 : 0;
  if (spring) s += `<path d="M${xx},${yb + 2} l0,2 l-4,1.5 l8,1.5 l-8,1.5 l8,1.5 l-4,1 l0,1" fill="none" stroke="#1b2230" stroke-width="1"/>`;
  const y0 = yb + 2 + spring;
  if (p.type === 'fix') {
    const d = !p.segL ? -1 : !p.segR ? 1 : 0;
    if (d) {
      s += `<line x1="${xx}" y1="${yb - 14}" x2="${xx}" y2="${yb + 14}" stroke="#1b2230" stroke-width="2"/>`;
      for (let k = -14; k < 14; k += 5) s += `<line x1="${xx}" y1="${yb + k}" x2="${xx + d * 6}" y2="${yb + k + 5}" stroke="#1b2230" stroke-width="0.8"/>`;
    } else {
      s += `<rect x="${xx - 7}" y="${y0}" width="14" height="12" fill="#cfd4db" stroke="#1b2230" stroke-width="1"/>`;
      for (let k = -7; k < 7; k += 4) s += `<line x1="${xx + k}" y1="${y0 + 12}" x2="${xx + k + 4}" y2="${y0 + 16}" stroke="#1b2230" stroke-width="0.7"/>`;
    }
    if (p.kr > 0) s += `<path d="M${xx - 9},${yb - 8} a10,10 0 1,1 4,13" fill="none" stroke="#a35d00" stroke-width="1.2"/>`;
  } else {
    s += `<path d="M${xx},${y0} l-7,12 h14 z" fill="#ffffff" stroke="#1b2230" stroke-width="1.2"/>`;
    if (p.type === 'roller') s += `<circle cx="${xx - 4}" cy="${y0 + 14.5}" r="2.3" fill="#ffffff" stroke="#1b2230" stroke-width="0.9"/><circle cx="${xx + 4}" cy="${y0 + 14.5}" r="2.3" fill="#ffffff" stroke="#1b2230" stroke-width="0.9"/><line x1="${xx - 10}" y1="${y0 + 17.5}" x2="${xx + 10}" y2="${y0 + 17.5}" stroke="#1b2230"/>`;
    else { s += `<line x1="${xx - 10}" y1="${y0 + 14}" x2="${xx + 10}" y2="${y0 + 14}" stroke="#1b2230"/>`; for (let k = -10; k < 10; k += 4) s += `<line x1="${xx + k}" y1="${y0 + 14}" x2="${xx + k - 3}" y2="${y0 + 18}" stroke="#1b2230" stroke-width="0.7"/>`; }
  }
  if (!p.dof.y) s += '</g>';
  if (!opt.compact) s += tx(xx, yb + 34 + spring, esc(p.label), { fs: 10.5, c: '#3d4656', w: 650 });
  return s + '</g>';
}
// dane do rysunku obciążeń: wiersze (każde obciążenie – osobny wiersz; pominięte – wyszarzone)
function loadRows(md, withOff) {
  const rows = [];
  const mt = R && R.mt ? R.mt : mtNow();
  if (mt) {
    const parts = md.segs.map(s => ({ x1: s.x0, x2: s.x1, q1: mt.gamma * s.sec.A * 1e-6, q2: mt.gamma * s.sec.A * 1e-6 }));
    if (S.loads.sw || withOff) rows.push({ key: 'sw', id: 'G0', name: 'ciężar własny', col: KIND_COLOR.G, dist: parts, pts: [], dir: 'g', off: !S.loads.sw, sw: true });
  }
  allItems().forEach(([arr, i, it]) => {
    if (it.off && !withOff) return;
    const rg = E.itemRange(it, md), q2 = it.q2 === '' || it.q2 == null ? it.q : it.q2;
    const dist = (it.q || q2) && rg.xb > rg.xa ? [{ x1: rg.xa, x2: rg.xb, q1: it.q, q2 }] : [];
    const pts = (it.pts || []).filter(p => p.P || p.T).map(p => ({ x: E.ptX(p, rg), P: p.P, T: p.T }));
    rows.push({ key: `${arr}.${i}`, arr, i, id: idOf(arr, i), name: it.name || KIND_NAME[it.kind], col: KIND_COLOR[it.kind], dist, pts, dir: it.dir, proj: it.proj, mt: it.mt, N: it.N, rg, off: !!it.off });
  });
  return rows;
}
// schemat belki: obciążenia (wiersze), belka, podpory, węzły, wymiary; opcjonalnie – wykres pod belką (Dane)
// opt: { edit, sel: Set, diag, legend: [], dims, out: {}, compact }
function schemeSVG(W, opt) {
  opt = opt || {};
  const md = R && R.md ? R.md : model();
  if (!md.segs.length) return '';
  const ml = 34, mr = 34, rowH = opt.compact ? 18 : 22;
  const rows = loadRows(md, !!opt.edit);
  const top = 14 + rows.length * rowH, yb = top + 16;
  const dims = opt.dims !== false;
  let yEnd = yb + 46 + (dims ? (md.segs.length > 1 || md.extL || md.extR ? 52 : 26) : 0);
  const dgY = yEnd + 4, dgTop = dgY + 30, dgH = 160;
  const H = opt.diag ? dgTop + dgH : yEnd + 4;
  const X = x => ml + x / md.Ltot * (W - ml - mr);
  let s = svgOpen(W, H, `class="schemesvg"`);
  // obciążenia
  rows.forEach((r, k) => {
    const y1 = 10 + k * rowH, y2 = y1 + rowH - 5, qmax = Math.max(1e-9, ...r.dist.map(d => Math.max(Math.abs(d.q1), Math.abs(d.q2))));
    if (opt.legend) opt.legend.push({ y: (y1 + y2) / 2, key: r.key, name: `${r.id} ${r.name}`, col: r.col, off: r.off, sw: r.sw });
    s += `<g class="ld${r.off ? ' ldoffg' : ''}" data-ld="${r.key}"${r.off ? ' opacity="0.35"' : ''}><title>${esc(r.id + ' – ' + r.name)}${r.off ? ' (pominięte)' : ''} – kliknij, aby edytować</title><rect x="${ml - 4}" y="${y1 - 2}" width="${W - ml - mr + 8}" height="${rowH - 1}" fill="transparent"/>`;
    const dash = r.dir === 'z' || r.off ? ' stroke-dasharray="4 3"' : '';
    r.dist.forEach(d => {
      const xa = X(d.x1), xb = X(d.x2), ha = (rowH - 7) * Math.abs(d.q1) / qmax, hb = (rowH - 7) * Math.abs(d.q2) / qmax;
      s += `<polygon points="${xa},${y2} ${xa},${y2 - ha} ${xb},${y2 - hb} ${xb},${y2}" fill="${r.col}" fill-opacity="0.13" stroke="${r.col}" stroke-width="0.8"${dash}/>`;
      const n = Math.max(1, Math.round((xb - xa) / 16));
      for (let j = 0; j <= n; j++) {
        const x = xa + (xb - xa) * j / n, q = d.q1 + (d.q2 - d.q1) * j / n, hh = (rowH - 7) * Math.abs(q) / qmax;
        if (hh < 2) continue;
        s += q < 0 ? `<path d="M${x},${y2 - hh} v${hh - 1} M${x - 2},${y2 - hh + 3} l2,-3 l2,3" stroke="${r.col}" stroke-width="0.8" fill="none"/>` : `<path d="M${x},${y2 - hh} v${hh - 1} M${x - 2},${y2 - 3} l2,3 l2,-3" stroke="${r.col}" stroke-width="0.8" fill="none"/>`;
      }
    });
    r.pts.forEach(p => {
      const x = X(p.x);
      if (p.P) s += `<path d="M${x},${y1} V${y2} ${p.P < 0 ? `M${x - 3.5},${y1 + 5} l3.5,-5 l3.5,5` : `M${x - 3.5},${y2 - 5} l3.5,5 l3.5,-5`}" stroke="${r.col}" stroke-width="1.6" fill="none"/>` + tx(x + 5, y1 + 8, `${fmt(p.P, p.P % 1 ? 2 : 0)} kN`, { a: 'start', fs: 9.5, c: r.col, w: 600 });
      if (p.T) s += `<path d="M${x - 6},${y2 - 2} a6,6 0 1,1 6,4" fill="none" stroke="${r.col}" stroke-width="1.2"/>` + tx(x - 8, y1 + 8, `T=${fmt(p.T, 2)}`, { a: 'end', fs: 9, c: r.col });
    });
    const qtxt = r.dist.length ? (Math.abs(r.dist[0].q1 - r.dist[0].q2) > 1e-9 ? `q = ${fmt(r.dist[0].q1, 2)}…${fmt(r.dist[0].q2, 2)} kN/m` : `q = ${fmt(r.dist[0].q1, 2)} kN/m`) : '';
    const extra = [r.dir === 'z' ? '[Z]' : r.dir === 'y' ? '[⊥]' : r.proj === 'hor' && S.geom.beta ? '[rzut]' : '', r.mt ? `m_t = ${fmt(r.mt, 2)}` : '', r.N ? `N = ${fmt(r.N, 1)} kN` : ''].filter(Boolean).join(' ');
    s += tx(ml + 2, y1 + 9, esc(`${r.id}: ${r.sw ? '' : r.name + ' '}${qtxt}${extra ? ' ' + extra : ''}`), { a: 'start', fs: 9.5, c: '#3d4656' });
    s += '</g>';
  });
  // belka i odcinki (zaznaczanie)
  md.segs.forEach(sg => {
    const xa = X(sg.x0), xb = X(sg.x1), on = opt.sel && opt.sel.has(sg.i);
    s += `<g class="elm${on ? ' sel' : ''}" data-seg="${sg.i}"><title>${esc(cap(sg.label))}: ${fmt(sg.L, 2)} m, przekrój ${fmt(sg.b1, 0)}×${fmt(sg.h, 0)}${S.geom.n > 1 ? ` (×${S.geom.n})` : ''}${opt.edit ? ' – lewy przycisk: zaznacz, prawy: menu' : ''}</title><rect class="elhl" x="${xa}" y="${yb - 10}" width="${xb - xa}" height="20" rx="3" fill="transparent" stroke="transparent"/>`;
    s += `<rect x="${xa}" y="${yb - 3.5}" width="${xb - xa}" height="7" fill="${on ? '#7fa3e0' : WOOD}" stroke="${on ? '#1d5bb8' : WOODE}" stroke-width="${on ? 1.6 : 1}"/>`;
    s += '</g>';
  });
  md.sups.forEach(p => {
    const xx = X(p.x), tw = Math.max(2, p.t / 1000 / md.Ltot * (W - ml - mr));
    s += `<rect x="${xx - tw / 2}" y="${yb + 3.5}" width="${tw}" height="2.5" fill="#9aa3b0"/>`;
    if (p.notch && p.notch.on) s += `<path d="M${xx - 5},${p.notch.side === 'top' ? yb - 3.5 : yb + 3.5} h10 v${p.notch.side === 'top' ? 3 : -3} h-10 z" fill="#c0262d"><title>podcięcie</title></path>`;
    s += supportSym(p, xx, yb, opt);
    const cfg = S.supCfg[p.i]; if (cfg && cfg.col && cfg.col.on) s += `<g class="supp" data-sup="${p.i}"><rect x="${xx - 5}" y="${yb + 38}" width="10" height="9" fill="${WOOD}" stroke="${WOODE}"/><title>słup pod podporą ${esc(p.label)}</title></g>`;
  });
  S.nodes.forEach((n, k) => {
    const sg = md.segs[n.seg]; if (!sg || n.a >= sg.L) return;
    const xx = X(sg.x0 + n.a);
    s += `<g class="nod" data-node="${k}"><title>${n.hinge ? 'Przegub' : 'Węzeł'} w ${esc(sg.label)}, a = ${fmt(n.a, 2)} m – kliknij, aby zmienić</title><circle cx="${xx}" cy="${yb}" r="7" fill="transparent"/><circle cx="${xx}" cy="${yb}" r="${n.hinge ? 3.6 : 2.4}" fill="${n.hinge ? '#ffffff' : '#1b2230'}" stroke="#1b2230" stroke-width="1.2"/></g>`;
  });
  const sg0 = md.segs.find(q => q.kind === 'span') || md.segs[0];
  s += tx((X(sg0.x0) + X(sg0.x1)) / 2, yb - 8, esc(`${S.mat.cls === 'U' ? 'materiał własny' : S.mat.cls} ${S.geom.n > 1 ? S.geom.n + '×' : ''}${fmt(S.geom.b, 0)}×${fmt(S.geom.h, 0)}${S.geom.beta ? ` · β = ${fmt(S.geom.beta, 0)}°` : ''}${S.geom.alpha ? ` · α = ${fmt(S.geom.alpha, 0)}°` : ''}`), { fs: 10, c: '#4a5466' });
  if (dims) {
    let y = yb + 58;
    md.segs.forEach(sg => { s += dimH(X(sg.x0), X(sg.x1), y, fmt(sg.L, 2)); });
    if (md.segs.length > 1 || md.extL || md.extR) {
      y += 26;
      const a = X(0) - md.extL / md.Ltot * (W - ml - mr), b = X(md.Ltot) + md.extR / md.Ltot * (W - ml - mr);
      s += dimH(a, b, y, `długość elementu ${fmt(md.Lmember, 2)} m`);
    }
  }
  if (opt.diag && R && R.st && !(R.errors && R.errors.length)) s += diagBand(opt.diag, X, dgTop, dgH, W, ml, mr);
  if (opt.out) Object.assign(opt.out, { H, dgY, yb });
  return s + '</svg>';
}
// wykres pod belką (Dane): M, V, ugięcie, N, R (reakcje), η (wytężenie)
function diagBand(kind, X, yTop, HB, W, ml, mr) {
  const md = R.md, st = R.st, y0 = yTop + HB / 2 + 6;
  let s = `<g class="diag">`;
  md.sups.forEach(p => { s += `<line x1="${X(p.x)}" y1="${yTop}" x2="${X(p.x)}" y2="${yTop + HB - 8}" stroke="#9aa3b0" stroke-width="0.6" stroke-dasharray="3 3"/>`; });
  if (kind === 'R') {
    md.sups.forEach((p, k) => {
      const r = R.reac[k], xx = X(p.x), up = r.ULS.mx >= 0;
      s += `<path d="M${xx},${y0 + 34} V${y0 - 6} M${xx - 4},${y0 + (up ? 0 : 28)} l4,${up ? -6 : 6} l4,${up ? 6 : -6}" stroke="#c0262d" stroke-width="2" fill="none"/>`;
      s += tx(xx, y0 + 50, `R_Ed = ${fmt(r.ULS.mx, 1)}`, { fs: 10, c: '#c0262d', w: 650 }) + tx(xx, y0 + 62, `min ${fmt(r.ULS.mn, 1)} · R_k ${fmt(r.CHAR.mx, 1)}`, { fs: 9, c: '#4a5466' });
    });
    s += tx(ml - 30, yTop + 4, 'Reakcje [kN]: R_Ed max / min (SGN), R_k (charakterystyczna)', { a: 'start', fs: 10, c: '#5b6576' });
    return s + '</g>';
  }
  let mx, mn, col, title, dp = 1, inv = false, k = 1, fill;
  if (kind === 'M') { mx = R.env.uls.My.mx; mn = R.env.uls.My.mn; col = '#c0262d'; fill = '#e6b3b3'; title = 'M_Ed [kNm] – obwiednia SGN, po stronie włókien rozciąganych'; inv = true; dp = 2; }
  else if (kind === 'V') { mx = R.env.uls.Vy.mx; mn = R.env.uls.Vy.mn; col = '#1d5bb8'; fill = '#c9d4e6'; title = 'V_Ed [kN] – obwiednia SGN'; dp = 2; }
  else if (kind === 'N') { mx = R.env.uls.N.mx; mn = R.env.uls.N.mn; col = '#6a3fb5'; fill = '#b597ee'; title = 'N_Ed [kN] – obwiednia SGN (+ ściskanie)'; }
  else if (kind === 'w') { mx = Array.from(R.defl.finMx, v => v * 1000); mn = Array.from(R.defl.finMn, v => v * 1000); col = '#1d7f3c'; fill = '#a6c76a'; title = 'w_fin [mm] – ugięcie końcowe (przęsła – od cięciwy), linia przerywana – granica w_net,fin'; inv = true; }
  else { mx = Array.from(st.stX, (x, i) => Math.max(R.eta.bend[i], R.eta.stab[i])); mn = Array.from(st.stX, (x, i) => -R.eta.shear[i]); col = '#a35d00'; fill = '#e6a35a'; title = 'Wytężenie η(x) [%]: zginanie i stateczność (+), ścinanie (−)'; dp = 0; k = 100; }
  let amax = 1e-9; for (let i = 0; i < mx.length; i++) amax = Math.max(amax, Math.abs(mx[i]) * k, Math.abs(mn[i]) * k);
  if (kind === 'eta') amax = Math.max(amax, 100);
  const sc = (HB / 2 - 30) / amax, Y = v => y0 + (inv ? 1 : -1) * v * k * sc;
  s += tx(ml - 30, yTop + 10, esc(title), { a: 'start', fs: 10, c: '#5b6576' });
  const poly = arr => { let p = `${X(st.stX[0]).toFixed(1)},${y0} `; for (let i = 0; i < arr.length; i++) p += `${X(st.stX[i]).toFixed(1)},${Y(arr[i]).toFixed(1)} `; return p + `${X(st.stX[arr.length - 1]).toFixed(1)},${y0}`; };
  if (kind === 'eta') { s += `<polygon points="${poly(mx)}" fill="#e6a35a" fill-opacity="0.45" stroke="#a35d00" stroke-width="1.1"/><polygon points="${poly(mn)}" fill="#c9d4e6" fill-opacity="0.6" stroke="#1d5bb8" stroke-width="1.1"/>`;
    [1, -1].forEach(sg => { const yy = Y(sg); s += `<line x1="${ml}" y1="${yy}" x2="${W - mr}" y2="${yy}" stroke="#c0262d" stroke-dasharray="5 3" stroke-width="0.9"/>`; }); s += tx(W - mr + 2, Y(1) + 3, '100%', { a: 'start', fs: 9, c: '#c0262d' }); }
  else { s += `<polygon points="${poly(mx)}" fill="${fill}" fill-opacity="0.5" stroke="${col}" stroke-width="1.1"/><polygon points="${poly(mn)}" fill="${fill}" fill-opacity="0.5" stroke="${col}" stroke-width="1.1"/>`; }
  if (kind === 'w' && R.slsData) R.slsData.forEach(q => { const j = 1; if (!S.sls.use[j] || !(q.lim[j] > 0)) return; const v = q.Lmm / q.lim[j]; s += `<line x1="${X(q.seg.x0)}" y1="${Y(v)}" x2="${X(q.seg.x1)}" y2="${Y(v)}" stroke="#c0262d" stroke-dasharray="5 3" stroke-width="0.9"/>`; });
  s += `<line x1="${ml}" y1="${y0}" x2="${W - mr}" y2="${y0}" stroke="#39414f" stroke-width="1"/>`;
  const lab = (i, v, below) => { const x = X(st.stX[i]), y = Y(v); return `<circle cx="${x}" cy="${y}" r="2" fill="${col}"/>` + tx(Math.min(W - 20, Math.max(20, x)), y + (below ? 11 : -4), fmt(v * k, dp) + (kind === 'eta' ? '%' : ''), { fs: 9.5, c: col, w: 650 }); };
  md.segs.forEach(sg => {
    let iM = -1, iN = -1;
    for (let i = 0; i < mx.length; i++) { if (st.stSeg[i] !== sg.i) continue; if (iM < 0 || mx[i] > mx[iM]) iM = i; if (iN < 0 || mn[i] < mn[iN]) iN = i; }
    if (iM >= 0 && Math.abs(mx[iM]) * k > amax * 0.04) s += lab(iM, mx[iM], inv);
    if (iN >= 0 && Math.abs(mn[iN]) * k > amax * 0.04) s += lab(iN, mn[iN], !inv);
  });
  return s + '</g>';
}
// zestawienie obciążeń (wartości charakterystyczne)
function loadSummaryHTML() {
  const md = R && R.md ? R.md : model();
  const rows = allItems().map(([arr, i, it]) => {
    const rg = E.itemRange(it, md), where = it.spans && it.spans.length ? `odcinki ${it.spans.join(', ')}` : it.span ? md.segs[it.span - 1] ? md.segs[it.span - 1].label : '—' : 'cała belka';
    const q = it.q || (it.q2 !== '' && it.q2) ? `${fmt(it.q, 2)}${it.q2 !== '' && it.q2 !== it.q ? '…' + fmt(it.q2, 2) : ''} kN/m${it.x1 !== '' || it.x2 !== '' ? ` (${fmt(rg.xa, 2)}–${fmt(rg.xb, 2)} m)` : ''}` : '';
    const P = (it.pts || []).filter(p => p.P).map(p => `${fmt(p.P, 2)} kN @ ${fmt(E.ptX(p, rg), 2)} m`).join('; ');
    const dur = arr === 'perm' ? 'stałe' : E.DUR_NAME[E.durOf(it)];
    return `<tr data-openload="${arr}.${i}" class="${it.off ? 'ldoff' : ''}" title="Kliknij, aby zmienić"><td><input type="checkbox" class="ldon" data-ldon="${arr}.${i}" ${it.off ? '' : 'checked'} title="uwzględnij / pomiń"><b style="color:${KIND_COLOR[it.kind]}">${idOf(arr, i)}</b></td><td>${esc(it.name || KIND_NAME[it.kind])}<br><small style="color:var(--ink3)">${esc(KIND_NAME[it.kind])}, ${esc(dur)}${it.dir !== 'g' ? (it.dir === 'z' ? ', poziomo (z)' : ', ⊥ do osi') : ''}</small></td><td>${[q, P].filter(Boolean).join('<br>') || '—'}${it.mt ? `<br>m<sub>t</sub> = ${fmt(it.mt, 2)} kNm/m` : ''}${it.N ? `<br>N = ${fmt(it.N, 1)} kN` : ''}</td><td>${esc(where)}</td></tr>`;
  });
  const mt = R && R.mt;
  const sw = mt ? `<tr class="${S.loads.sw ? 'info' : 'ldoff'}"><td><input type="checkbox" class="ldon" data-ck="loads.sw" ${S.loads.sw ? 'checked' : ''} title="uwzględnij ciężar własny"><b>G0</b></td><td>Ciężar własny belki</td><td>${fmt(mt.gamma, 1)} kN/m³ × A = ${fmt(mt.gamma * md.segs[0].sec.A * 1e-6, 3)} kN/m</td><td>cała belka</td></tr>` : '';
  return `<table class="ldsum"><tr><th>Ozn.</th><th>Obciążenie</th><th>Wartość charakterystyczna</th><th>Zakres</th></tr>${sw}${rows.join('') || '<tr><td colspan="4" class="lnone">Brak obciążeń – przycisk „Obciążenia” nad schematem albo prawy przycisk na przęśle.</td></tr>'}</table>`;
}
function combSumHTML() {
  if (!R || !R.cb || (R.errors && R.errors.length)) return '';
  const g = R.checks.filter(c => /^SGN|^Słup/.test(c.grp) && isFinite(c.ratio)).reduce((a, c) => (!a || c.ratio > a.ratio ? c : a), null);
  let mM = 0, mV = 0; for (let i = 0; i < R.env.uls.My.mx.length; i++) { mM = Math.max(mM, Math.abs(R.env.uls.My.mx[i]), Math.abs(R.env.uls.My.mn[i])); mV = Math.max(mV, Math.abs(R.env.uls.Vy.mx[i]), Math.abs(R.env.uls.Vy.mn[i])); }
  return `<div class="combsum">|M<sub>Ed</sub>|<sub>max</sub> = <b>${fmt(mM, 2)} kNm</b>, |V<sub>Ed</sub>|<sub>max</sub> = <b>${fmt(mV, 2)} kN</b> · kombinacji SGN: ${R.cb.uls.length}${g ? `<br><small>Decyduje: ${sym(g.name.replace(/ ≤.*$/, ''))} – ${esc(g.combo || '')}, η = ${fmt(g.ratio * 100, 0)}%</small>` : ''}</div>`;
}
function supRowTxt(p) {
  const c = S.supCfg[p.i] || {}, col = c.col && c.col.on ? c.col : null;
  return `${esc(p.typeName)}, t = ${fmt(p.t, 0)} mm${p.a ? `, a = ${fmt(p.a, 0)} mm` : ''}${p.kv ? `, k<sub>v</sub> = ${fmt(+p.kv, 1)} kN/mm` : ''}${p.notch && p.notch.on ? ', podcięcie' : ''}${col ? `<br><b>słup</b> ${fmt(col.b, 0)}×${fmt(col.h, 0)}, H = ${fmt(col.L, 2)} m, stopa: ${col.type === 'slot' ? 'blacha wpuszczana' : 'blachy zewnętrzne'}, ${col.n * col.m}×⌀${col.d}` : ''}`;
}
let BEAMS = null, curB = 0;
let selSpans = new Set();
let showDims = (() => { try { return localStorage.getItem('belkadr-dims') !== '0'; } catch (e) { return true; } })();
function renderDataSide() {
  const el = $('#dataside'); if (!el) return;
  const md = R && R.md ? R.md : model();
  for (const i of Array.from(selSpans)) if (!md.segs[i]) selSpans.delete(i);
  const cw = el.clientWidth || 600, LEGW = cw < 560 ? 0 : 132;
  const W = Math.max(320, Math.min(980, cw - 30 - LEGW));
  const leg = [], out = {};
  const svgS = schemeSVG(W, { edit: true, sel: selSpans, diag: diagKind === 'off' ? null : diagKind, legend: leg, dims: showDims, out });
  const tools = `<span class="schtools">${[['loads', 'Obciążenia', 'Obciążenia zaznaczonych przęseł albo całej belki (gdy nic nie zaznaczono)'], ['sec', 'Przekrój', 'Przekroje zaznaczonych przęseł: wymiary b × h, materiał, dobór'], ['node', 'Węzeł', 'Węzły i przeguby w przęśle, podział elementu'], ['dims', 'Wymiary', 'Pokaż / ukryj linie wymiarowe']].map(([k, l, t]) => `<button type="button" class="btn sm${k === 'dims' && showDims ? ' on' : ''}" data-tool="${k}" title="${t}">${l}</button>`).join('')}</span>`;
  const selTxt = Array.from(selSpans).sort((a, b) => a - b).map(i => md.segs[i] ? md.segs[i].label : '').filter(Boolean);
  const legH = leg.map(q => `<label class="ldl${q.off ? ' off' : ''}" style="top:${(q.y / (out.H || 1) * 100).toFixed(2)}%" title="${q.off ? 'Obciążenie pominięte – zaznacz, aby uwzględnić' : 'Odznacz, aby pominąć obciążenie w obliczeniach'}"><input type="checkbox" ${q.sw ? 'data-ck="loads.sw"' : `data-ldon="${q.key}"`} ${q.off ? '' : 'checked'}><i style="background:${q.col}"></i><span>${esc(q.name)}</span></label>`).join('');
  const kinds = [['M', 'M'], ['V', 'V'], ['w', 'ugięcie'], ['N', 'N'], ['R', 'R'], ['eta', 'wytężenie η'], ['off', 'bez wykresu']];
  const dgSw = `<span class="segsw sm dgsw">${kinds.map(([k, l]) => `<button data-dk="${k}" class="${(diagKind || 'off') === k ? 'on' : ''}">${l}</button>`).join('')}</span>`;
  const dgBar = `<div class="dgbar" style="top:${((out.dgY + 11) / (out.H || 1) * 100).toFixed(2)}%">${dgSw}</div>`;
  let h = `<div class="box"><div class="schsticky">${beamTabsHTML()}<h4 class="schhd">Schemat statyczny i obciążenia${tools}</h4>
    <div class="schsel">${selTxt.length ? `Zaznaczone: <b>${esc(selTxt.join(', '))}</b> · <button class="lnk" id="selClr">odznacz (Esc)</button>` : '<span class="mut">Lewy przycisk – zaznacz przęsło, prawy – menu (obciążenia, przekrój, węzeł, wymiary).</span>'}${md.segs.length > 1 && selSpans.size < md.segs.length ? ` · <button class="lnk" id="selAll">zaznacz wszystkie</button>` : ''}</div>
    <div class="schrow">${LEGW ? `<div class="ldleg" style="width:${LEGW}px">${legH}</div>` : ''}<div class="schemewrap"><div class="zoomtgt">${svgS}${diagKind && diagKind !== 'off' || true ? dgBar : ''}</div></div></div>${LEGW ? '' : `<div class="ldlegm">${legH}</div>`}</div>
    <div class="optchk"><label class="chk sm"><input type="checkbox" data-ck="loads.sw" ${S.loads.sw ? 'checked' : ''}><span>Uwzględnij ciężar własny belki (γ = ${fmt((R && R.mt ? R.mt.gamma : 4.2), 1)} kN/m³ × A)</span></label>
    <label class="chk sm"><input type="checkbox" data-ck="loads.pattern" ${S.loads.pattern ? 'checked' : ''}><span>Układ szachownicowy obciążeń użytkowych (każde przęsło osobno, tylko gdzie niekorzystne)</span></label>
    <label class="chk sm"><input type="checkbox" data-ck="coef.vRed" ${S.coef.vRed ? 'checked' : ''}><span>Pomijanie obciążeń w odległości h od krawędzi podpory przy ścinaniu wg <span>6.1.7(3)</span></span></label>
    <label class="chk sm"><input type="checkbox" data-ck="sls.shear" ${S.sls.shear ? 'checked' : ''}><span>Odkształcenia postaciowe (G<sub>mean</sub>) w statyce i ugięciach</span></label>
    <div class="firerow"><label class="chk sm"><input type="checkbox" data-ck="fire.on" ${S.fire.on ? 'checked' : ''}><span>Odporność ogniowa wg PN-EN 1995-1-2</span></label><select id="fireR" style="width:auto" ${S.fire.on ? '' : 'disabled'}>${[15, 30, 45, 60, 90, 120].map(r => `<option value="${r}" ${S.fire.R === r ? 'selected' : ''}>R ${r}</option>`).join('')}</select></div></div>
    ${combSumHTML()}
    <div class="hint">${exDetails('<b>Lewy przycisk</b> na przęśle – zaznaczanie przęseł (kolejne kliknięcia dodają / odejmują, Esc – odznacz wszystkie); <b>prawy przycisk</b> – menu: obciążenia, przekrój, węzeł, wymiary (te same co przyciski nad schematem). Bez zaznaczenia „Obciążenia” otwiera obciążenia całej belki, przy kilku zaznaczonych przęsłach – obciążenie wspólne tych przęseł. Kliknij <b>obciążenie</b> – aby je zmienić; pole wyboru z lewej – uwzględnij / pomiń obciążenie. Kliknij <b>węzeł</b> – aby go przesunąć lub zamienić w przegub; <b>podporę</b> – rodzaj podparcia, długość oparcia, podatność, podcięcie i <b>słup ze stopą</b>. Ctrl + kółko myszy – powiększenie schematu, dwuklik – widok całości.', 'Jak zadawać obciążenia i podpory?')}</div>
    <h4 class="lsec">Zestawienie obciążeń</h4>${loadSummaryHTML()}
    <h4 class="lsec">Podpory</h4><table class="kv suptab">${md.sups.map(p => `<tr data-sup="${p.i}" title="Kliknij, aby zmienić"><td><b>${esc(p.label)}</b></td><td>${supRowTxt(p)}</td><td><button class="lnk" data-sup="${p.i}">zmień…</button></td></tr>`).join('')}</table></div>`;
  if (R && R.errors && R.errors.length) h += errBox();
  else if (R && R.warns && R.warns.length) h += `<div class="msgs">${R.warns.map(e => `<div class="msg wrn">${esc(e)}</div>`).join('')}</div>`;
  el.innerHTML = h;
  bindScheme(el, true);
  legFix(el);
  zoomInit(el);
}
function legFix(el) {
  const lg = $('.ldleg', el); if (!lg) return;
  requestAnimationFrame(() => { let last = -1e9; $$('.ldl', lg).sort((a, b) => a.offsetTop - b.offsetTop).forEach(q => { const t = Math.max(q.offsetTop - q.offsetHeight / 2, last + 1); q.style.top = t + 'px'; q.style.transform = 'none'; last = t + q.offsetHeight; }); });
}
function bindScheme(root, edit) {
  $$('.schemesvg .supp, tr[data-sup], button[data-sup]', root).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); supportPopup(+g.dataset.sup); }));
  $$('.schemesvg .ld', root).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); const k = g.dataset.ld; if (k === 'sw') { toast('Ciężar własny – pole „Uwzględnij ciężar własny belki” pod schematem; ciężar objętościowy – w grupie Materiał.'); return; } const [a, i] = k.split('.'); openLoad(a, +i); }));
  $$('.schemesvg .nod', root).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); nodePopup(+g.dataset.node); }));
  if (!edit) { $$('.schemesvg .elm', root).forEach(g => g.addEventListener('click', () => { selSpans = new Set([+g.dataset.seg]); schemeAct('loads'); })); return; }
  $$('.schemesvg .elm', root).forEach(g => g.addEventListener('click', ev => { ev.stopPropagation(); const i = +g.dataset.seg; if (selSpans.has(i)) selSpans.delete(i); else selSpans.add(i); renderDataSide(); }));
  const sw = $('.schemewrap', root);
  if (sw) sw.addEventListener('contextmenu', ev => { ev.preventDefault(); const g = ev.target.closest && ev.target.closest('.elm'); if (g && !selSpans.has(+g.dataset.seg)) { selSpans.add(+g.dataset.seg); renderDataSide(); } schemeMenu(ev.clientX, ev.clientY); });
  $$('[data-tool]', root).forEach(b => b.addEventListener('click', () => schemeAct(b.dataset.tool)));
  $$('[data-dk]', root).forEach(b => b.addEventListener('click', () => { diagKind = b.dataset.dk; try { localStorage.setItem('belkadr-diag', diagKind); } catch (e) { /* */ } renderDataSide(); }));
  $$('input[data-ldon]', root).forEach(cb => { cb.addEventListener('click', ev => ev.stopPropagation()); cb.addEventListener('change', () => { const [a, i] = cb.dataset.ldon.split('.'); const it = arrByKey(a)[+i]; if (it) { it.off = !cb.checked; changed(true); } }); });
  $$('input[data-ck]', root).forEach(cb => { cb.addEventListener('click', ev => ev.stopPropagation()); cb.addEventListener('change', () => { setP(S, cb.dataset.ck, cb.checked); changed(true); }); });
  $$('tr[data-openload]', root).forEach(tr => tr.addEventListener('click', e => { if (e.target.closest('input')) return; const [a, i] = tr.dataset.openload.split('.'); openLoad(a, +i); }));
  const fr = $('#fireR', root); if (fr) fr.onchange = () => { S.fire.R = +fr.value; changed(true); };
  const sa = $('#selAll', root); if (sa) sa.onclick = () => { (R && R.md ? R.md : model()).segs.forEach(sg => selSpans.add(sg.i)); renderDataSide(); };
  const sc = $('#selClr', root); if (sc) sc.onclick = () => { selSpans.clear(); renderDataSide(); };
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && selSpans.size && !$('.ctxmenu') && $('#modal').style.display !== 'flex') { selSpans.clear(); if ($('.tabs button.on') && $('.tabs button.on').dataset.tab === 'data') renderDataSide(); } });
// narzędzia schematu (przyciski nad schematem i menu prawego przycisku)
const selList = () => { const md = R && R.md ? R.md : model(); return Array.from(selSpans).filter(i => md.segs[i]).sort((a, b) => a - b); };
function schemeAct(a) {
  const md = R && R.md ? R.md : model(), sel = selList();
  if (a === 'loads') { if (!sel.length) loadPopup({ all: true }); else if (sel.length === 1) loadPopup({ seg: sel[0] }); else loadPopup({ spans: sel.map(i => i + 1) }); }
  else if (a === 'sec') secWinPopup(sel);
  else if (a === 'node') nodeWinPopup(sel.length ? sel[0] : (md.segs.find(sg => sg.kind === 'span') || md.segs[0]).i);
  else if (a === 'dims') { showDims = !showDims; try { localStorage.setItem('belkadr-dims', showDims ? '1' : '0'); } catch (e) { /* */ } renderDataSide(); }
  else if (a === 'all') { md.segs.forEach(sg => selSpans.add(sg.i)); renderDataSide(); }
  else if (a === 'none') { selSpans.clear(); renderDataSide(); }
  else if (/^sup\d+$/.test(a)) supportPopup(+a.slice(3));
}
function closeCtx() { const d = $('.ctxmenu'); if (d) d.remove(); document.removeEventListener('pointerdown', ctxOutside, true); }
function ctxOutside(e) { if (!(e.target.closest && e.target.closest('.ctxmenu'))) closeCtx(); }
function schemeMenu(x, y) {
  closeCtx();
  const n = selSpans.size, md = R && R.md ? R.md : model();
  const it = [['loads', n ? `Obciążenia – ${n === 1 ? md.segs[selList()[0]].label : `zaznaczone (${n})`}…` : 'Obciążenia – cała belka…'], ['sec', 'Przekrój…'], ['node', 'Węzeł / przegub…'], ['dims', `${showDims ? '✓ ' : ''}Wymiary`], ['-'], ...md.sups.map(p => [`sup${p.i}`, `Podpora ${p.label}${(S.supCfg[p.i] || {}).col && S.supCfg[p.i].col.on ? ' i słup' : ''}…`]), ['-'], ['all', 'Zaznacz wszystkie przęsła'], ['none', 'Odznacz wszystko (Esc)']];
  const d = document.createElement('div'); d.className = 'ctxmenu'; d.setAttribute('role', 'menu');
  d.innerHTML = it.map(([k, l]) => k === '-' ? '<hr>' : `<button type="button" role="menuitem" data-act2="${k}"${(k === 'none' && !n) ? ' disabled' : ''}>${esc(l)}</button>`).join('');
  document.body.appendChild(d);
  const r = d.getBoundingClientRect(); d.style.left = Math.max(4, Math.min(window.innerWidth - r.width - 4, x)) + 'px'; d.style.top = Math.max(4, Math.min(window.innerHeight - r.height - 4, y)) + 'px';
  d.addEventListener('click', e => { const b = e.target.closest('[data-act2]'); if (!b || b.disabled) return; closeCtx(); schemeAct(b.dataset.act2); });
  setTimeout(() => document.addEventListener('pointerdown', ctxOutside, true), 0);
  const f = d.querySelector('button'); if (f) f.focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtx(); });
// powiększanie rysunków SVG (Ctrl + kółko, przeciąganie po powiększeniu, dwuklik – całość)
const ZST = new WeakMap();
function zoomInit(root) {
  $$('.schemewrap > .zoomtgt > svg, .elevwrap > svg', root).forEach(svg => {
    const vb0 = svg.viewBox.baseVal; if (!vb0 || !vb0.width) return;
    const base = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height }, key = svg.closest('.elevwrap') ? 'elev' : 'scheme';
    const z = ZST.get(root) && ZST.get(root)[key];
    const set = v => { svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); const wr = svg.closest('.schemewrap, .elevwrap'); if (wr) wr.classList.toggle('zoomed', v.w < base.w - 1e-6); };
    let cur = z && Math.abs(z.bw - base.w) < 1 ? Object.assign({}, z.v) : Object.assign({}, base);
    set(cur);
    const save = () => { const o = ZST.get(root) || {}; o[key] = { v: Object.assign({}, cur), bw: base.w }; ZST.set(root, o); };
    svg.addEventListener('wheel', e => {
      if (!e.ctrlKey) return; e.preventDefault();
      const r = svg.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      const k = Math.exp(e.deltaY * 0.0015), w = Math.max(base.w / 12, Math.min(base.w, cur.w * k)), h = w * base.h / base.w;
      cur = { x: cur.x + (cur.w - w) * fx, y: cur.y + (cur.h - h) * fy, w, h };
      cur.x = Math.max(base.x, Math.min(base.x + base.w - w, cur.x)); cur.y = Math.max(base.y, Math.min(base.y + base.h - h, cur.y));
      set(cur); save();
    }, { passive: false });
    let drag = null;
    svg.addEventListener('pointerdown', e => { if (cur.w >= base.w - 1e-6 || e.button !== 0 || e.target.closest('.elm,.supp,.ld,.nod,.dgbar')) return; drag = { x: e.clientX, y: e.clientY, v: Object.assign({}, cur) }; });
    svg.addEventListener('pointermove', e => { if (!drag) return; const r = svg.getBoundingClientRect(); cur.x = Math.max(base.x, Math.min(base.x + base.w - cur.w, drag.v.x - (e.clientX - drag.x) * cur.w / r.width)); cur.y = Math.max(base.y, Math.min(base.y + base.h - cur.h, drag.v.y - (e.clientY - drag.y) * cur.h / r.height)); set(cur); });
    svg.addEventListener('pointerup', () => { if (drag) save(); drag = null; });
    svg.addEventListener('dblclick', e => { if (e.target.closest('.elm,.supp,.ld,.nod')) return; cur = Object.assign({}, base); set(cur); save(); });
  });
}

/* --------------------------------------------------------- okna: obciążenia */
const KINDS = ['perm', 'imp', 'snow', 'wind', 'other', 'acc'];
// okno obciążeń: cała belka, odcinek albo kilka zaznaczonych przęseł (jedno obciążenie na wszystkich)
function loadPopup(tg) {
  const m = $('#modal');
  const draw = () => {
    const md = model();
    let title, sub, own, ctx;
    if (tg.spans && tg.spans.length > 1) {
      const key = tg.spans.join(',');
      title = `odcinki ${tg.spans.map(j => md.segs[j - 1] ? md.segs[j - 1].label : j).join(', ')}`;
      sub = 'Jedno obciążenie na wszystkich zaznaczonych odcinkach (w kombinacjach obciążenia użytkowe są i tak układane przęsłami – szachownica).';
      own = it => it.spans && it.spans.join(',') === key; ctx = { span: tg.spans[0], spans: tg.spans };
    } else if (tg.all || !md.segs[tg.seg]) {
      title = 'cała belka'; sub = `Działają na całej długości belki ${fmt(md.Ltot, 2)} m albo na jej części (pola „od x₁ / do x₂”, od lewego końca belki).`;
      own = it => !(it.span > 0) && !(it.spans && it.spans.length); ctx = { span: 0 };
    } else {
      const sg = md.segs[tg.seg];
      title = sg.label; sub = `x = ${fmt(sg.x0, 2)} ÷ ${fmt(sg.x1, 2)} m od lewego końca belki, długość ${fmt(sg.L, 2)} m. Położenia (od / do, siły) mierzone od początku odcinka.`;
      own = it => it.span === sg.i + 1 && !(it.spans && it.spans.length); ctx = { span: sg.i + 1 };
    }
    const mine = allItems().filter(([a, i, it]) => own(it));
    const glob = tg.all ? [] : allItems().filter(([a, i, it]) => !(it.span > 0) && !(it.spans && it.spans.length));
    let h = `<div class="dlg lpop"><h3>Obciążenia – ${esc(title)}</h3><p class="hint">${sub} Wartości charakterystyczne (wyjątkowe – obliczeniowe A<sub>d</sub>). Pole wyboru przy nazwie – uwzględnij / pomiń obciążenie.</p>
      <div class="addbar"><span>Dodaj:</span>${KINDS.map(k => `<button class="addb" data-addk="${k}">+ ${KIND_NAME[k]}</button>`).join('')}</div>
      <div class="fields" id="lpItems">${mine.map(([a, i, it]) => itemHTML(a, i, it)).join('') || '<p class="lnone">Brak obciążeń – dodaj je przyciskami powyżej.</p>'}</div>`;
    if (glob.length) h += `<h4 class="lsec">Obciążenia całej belki (działają też w tym odcinku)</h4><div class="fields" id="lpGlob">${glob.map(([a, i, it]) => itemHTML(a, i, it)).join('')}</div>`;
    h += `<div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
    const keep = $('.dlg.lpop', m) ? $('.dlg.lpop', m).scrollTop : 0;
    m.innerHTML = h; m.style.display = 'flex'; $('.dlg.lpop', m).scrollTop = keep;
    ['#lpItems', '#lpGlob'].forEach(sel => { const host = $(sel, m); if (host) bindItems(host, draw); });
    $$('[data-addk]', m).forEach(b => b.addEventListener('click', () => {
      const kind = b.dataset.addk, A = listArr(kind), n = A.filter(it => arrKey(kind) !== 'var' || it.kind === kind).length + 1;
      A.push(E.normItem(Object.assign(LIST_DEF[kind](n), { span: ctx.span, spans: ctx.spans || [] }), kind === 'acc' || kind === 'perm' ? kind : undefined));
      changed(false); draw();
    }));
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
  };
  draw();
}
// okno jednego obciążenia
function openLoad(arr, i) {
  const it0 = arrByKey(arr)[i]; if (!it0) return;
  const m = $('#modal');
  const draw = () => {
    const j = arrByKey(arr).indexOf(it0); if (j < 0) { m.style.display = 'none'; return; }
    const md = model(), rg = E.itemRange(it0, md);
    m.innerHTML = `<div class="dlg lpop"><h3>${idOf(arr, j)} – ${esc(it0.name || KIND_NAME[it0.kind])}</h3><p class="hint">Zakres: ${fmt(rg.a, 2)} ÷ ${fmt(rg.b, 2)} m od lewego końca belki (długość ${fmt(rg.L, 2)} m); położenia mierzone od początku zakresu.</p><div class="fields" id="lpItem">${itemHTML(arr, j, it0)}</div><div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
    m.style.display = 'flex';
    bindItems($('#lpItem', m), draw);
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
  };
  draw();
}

/* --------------------------------------------------------- okno: przekrój */
// wymiary przekroju odcinka: b, h (S.segGeo dla belki wieloodcinkowej, S.geom dla jednoodcinkowej)
function segBH(si) { const md = model(), g = S.segGeo[si] || {}; return { b: g.b > 0 ? g.b : S.geom.b, h: g.h > 0 ? g.h : S.geom.h, single: md.segs.length === 1 }; }
function setSegBH(si, k, v, all) {
  const md = model();
  if (md.segs.length === 1 || all) { S.geom[k] = v; if (all) Object.keys(S.segGeo).forEach(q => { if (S.segGeo[q]) S.segGeo[q][k] = ''; }); return; }
  S.segGeo[si] = Object.assign({ b: '', h: '' }, S.segGeo[si] || {}, { [k]: v === S.geom[k] ? '' : v });
}
function secWinPopup(segs) {
  const m = $('#modal');
  const draw = () => {
    const md = R && R.md ? R.md : model();
    const list = (segs && segs.length ? segs : md.segs.map(s => s.i)).filter(i => md.segs[i]);
    const card = i => {
      const sg = md.segs[i], sd = R && R.segData ? R.segData[i] : null, bh = segBH(i);
      const eb = sd && sd.G.bend ? sd.G.bend.ratio : null, es = sd && sd.G.shear ? sd.G.shear.ratio : null;
      return `<div class="swcard"><div class="mst">${esc(cap(sg.label))} – ${S.geom.n > 1 ? S.geom.n + '×' : ''}${fmt(bh.b, 0)}×${fmt(bh.h, 0)} mm · ${esc(R && R.mt ? R.mt.m.name : S.mat.cls)}</div>
        <div class="xclick secedit" data-geo="${i}" title="Kliknij przekrój, aby zmienić wymiary i materiał">${sectionSVG(sg.sec, { id: 'w' + i, size: 170, glulam: /^GL/.test(curFam()) })}</div>
        <div class="swgeo"><label>b × h</label><input class="txt sm" data-swg="b" data-si="${i}" value="${bh.b}" inputmode="numeric"><span>×</span><input class="txt sm" data-swg="h" data-si="${i}" value="${bh.h}" inputmode="numeric"><span>mm</span>${md.segs.length > 1 ? `<button class="lnk" data-swall="${i}" title="Przyjmij te wymiary we wszystkich odcinkach">wszystkie odcinki</button>` : ''}</div>
        <div class="msd">${eb !== null ? `zginanie η = <b>${fmt(eb * 100, 0)}%</b>` : ''}${es !== null ? ` · ścinanie η = <b>${fmt(es * 100, 0)}%</b>` : ''}${sd ? ` · k<sub>crit</sub> = ${fmt(Math.min(sd.ltb.plus.kcrit, sd.ltb.minus.kcrit), 3)}` : ''}</div></div>`;
    };
    m.innerHTML = `<div class="dlg fpop secwin"><h3>Przekrój – ${esc(list.length > 1 ? (segs && segs.length ? 'zaznaczone odcinki' : 'wszystkie odcinki') : md.segs[list[0]].label)}</h3>
      <div class="swbar"><button class="btn sm" data-swd="sec" title="Najmniejszy przekrój z wymiarów handlowych – obecna klasa">⚙ Dobierz przekrój</button><button class="btn sm" data-swd="cls" title="Najniższa klasa materiału dla obecnego przekroju">⚙ Dobierz klasę</button><button class="btn sm pri" data-swd="all" title="Przekrój i klasa – najmniejszy koszt">⚙ Dobierz wszystko</button><button class="btn sm" data-swd="mat">Materiał…</button></div>
      <div class="swcards">${list.map(card).join('')}</div>
      <p class="hint">Kliknij rysunek przekroju, aby zmienić wymiary, liczbę elementów i materiał; albo wpisz b × h i zatwierdź (Enter / opuszczenie pola).</p>
      <div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
    m.style.display = 'flex';
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
    $$('[data-geo]', m).forEach(r => r.addEventListener('click', () => geoPopup(+r.dataset.geo, () => secWinPopup(segs))));
    $$('input[data-swg]', m).forEach(inp => { const ap = () => { const v = parseNum(inp.value), k = inp.dataset.swg; if (v === null || v < (k === 'b' ? 10 : 20)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); setSegBH(+inp.dataset.si, k, v); changed(true); setTimeout(draw, 120); };
      inp.addEventListener('change', ap); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ap(); } }); });
    $$('[data-swall]', m).forEach(b => b.addEventListener('click', () => { const bh = segBH(+b.dataset.swall); S.geom.b = bh.b; S.geom.h = bh.h; S.segGeo = {}; changed(true); setTimeout(draw, 120); }));
    $$('[data-swd]', m).forEach(b => b.addEventListener('click', () => { const k = b.dataset.swd; if (k === 'mat') { matTablePopup(); return; } runDesign(k, () => setTimeout(draw, 150)); }));
  };
  draw();
}
// okno wymiarów i materiału przekroju (kliknięcie rysunku przekroju)
function geoPopup(si, back) {
  const md = model(), sg = md.segs[si] || md.segs[0], bh = segBH(sg.i);
  const m = $('#modal');
  const fam = curFam();
  const cat = catNow();
  const opts = (arr, v) => arr.map(x => `<option value="${x}" ${+x === +v ? 'selected' : ''}>${x}</option>`).join('');
  m.innerHTML = `<div class="dlg sm"><h3>Przekrój – ${esc(cap(sg.label))}</h3>
    <div class="flex" style="justify-content:center">${sectionSVG(sg.sec, { id: 'g' + si, size: 150, glulam: /^GL/.test(fam) })}</div>
    <div class="fields" style="padding:0">
      <div class="row"><label>Szerokość b</label><div class="combo"><input data-g="b" value="${showNum(bh.b)}"><button tabindex="-1" data-list="${esc(JSON.stringify(cat.b))}">▾</button></div><span class="unit">mm</span></div>
      <div class="row"><label>Wysokość h</label><div class="combo"><input data-g="h" value="${showNum(bh.h)}"><button tabindex="-1" data-list="${esc(JSON.stringify(cat.h))}">▾</button></div><span class="unit">mm</span></div>
      <div class="row wide"><label>Liczba elementów n</label><select data-g="n">${opts([1, 2, 3, 4, 5, 6], S.geom.n)}</select></div>
      <div class="row wide"><label>Klasa materiału (cała belka)</label><select data-g="cls">${fam === 'U' ? '<option value="U" selected>materiał własny</option>' : E.MAT_LIST.filter(q => q.fam === fam).map(q => `<option value="${q.id}" ${q.id === S.mat.cls ? 'selected' : ''}>${esc(q.name)}</option>`).join('')}</select></div>
      ${md.segs.length > 1 ? `<label class="chk"><input type="checkbox" data-g="all"> zastosuj b × h we wszystkich odcinkach</label>` : ''}
    </div>
    <div class="dbtn"><button class="btn" data-x>Anuluj</button><button class="btn pri" data-ok>Zastosuj</button></div></div>`;
  m.style.display = 'flex';
  $$('.combo button', m).forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); const inp = b.previousElementSibling, list = JSON.parse(b.dataset.list); const pop = $('#pop'); pop.innerHTML = list.map(v => `<div data-v="${v}">${v}</div>`).join(''); const r = inp.parentElement.getBoundingClientRect(); pop.style.display = 'block'; pop.style.minWidth = r.width + 'px'; pop.style.left = r.left + 'px'; pop.style.top = (r.bottom + 2) + 'px'; pop.style.zIndex = 200; $$('div', pop).forEach(d => d.addEventListener('mousedown', ev => { ev.preventDefault(); inp.value = d.dataset.v; pop.style.display = 'none'; })); }));
  const close = () => { m.style.display = 'none'; if (back) back(); };
  $('[data-x]', m).onclick = close;
  $('[data-ok]', m).onclick = () => {
    const b = parseNum($('[data-g="b"]', m).value), h = parseNum($('[data-g="h"]', m).value);
    if (!(b >= 10) || !(h >= 20)) { toast('Podaj wymiary b ≥ 10 mm, h ≥ 20 mm.'); return; }
    const all = $('[data-g="all"]', m) && $('[data-g="all"]', m).checked;
    setSegBH(sg.i, 'b', b, all); setSegBH(sg.i, 'h', h, all);
    S.geom.n = +$('[data-g="n"]', m).value;
    const cls = $('[data-g="cls"]', m).value; if (cls !== 'U') { S.mat.cls = cls; S.mat.user = null; }
    changed(true); close();
  };
}

/* --------------------------------------------------------- okna: węzły */
function nodeWinPopup(seg0) {
  const m = $('#modal'); let segI = seg0;
  const draw = () => {
    const md = model(), sg = md.segs[segI] || md.segs[0]; segI = sg.i;
    const ns = S.nodes.map((n, k) => [n, k]).filter(([n]) => n.seg === sg.i).sort((a, b) => a[0].a - b[0].a);
    let h = `<div class="dlg nodewin"><h3>Węzeł – ${esc(sg.label)}</h3>`;
    if (md.segs.length > 1) h += `<div class="zg"><span>Odcinek belki</span><select id="nwSeg">${md.segs.map(z => `<option value="${z.i}" ${z.i === sg.i ? 'selected' : ''}>${esc(cap(z.label))} (${fmt(z.L, 2)} m)</option>`).join('')}</select></div>`;
    h += `<h4 class="lsec">Węzeł lub przegub</h4><div class="zg"><span>Wstaw w odległości</span><input class="txt" id="nA" value="${esc(showNum(+(sg.L / 2).toFixed(3)))}" inputmode="decimal"><span>m od początku (L = ${fmt(sg.L, 2)} m)</span><label class="chk"><input type="checkbox" id="nH"><span>przegub</span></label><button class="btn sm" id="nIns">Wstaw</button></div>`;
    h += `<div class="zg"><span>Podziel na</span><select id="nDiv">${[2, 3, 4, 5, 6].map(v => `<option value="${v}">${v} równe części</option>`).join('')}</select><button class="btn sm" id="nDivB">Podziel</button></div>`;
    h += ns.length ? `<table class="sttab"><tr><th>Węzeł</th><th>a [m]</th><th>przegub</th><th></th></tr>${ns.map(([n, k]) => `<tr><td>${k + 1}</td><td><input class="txt sm" data-na="${k}" value="${showNum(n.a)}" style="width:70px;text-align:right"></td><td style="text-align:center"><input type="checkbox" data-nh="${k}" ${n.hinge ? 'checked' : ''}></td><td><button class="del" data-nd="${k}" title="Usuń węzeł">×</button></td></tr>`).join('')}</table>` : '<p class="hint">Brak węzłów w tym odcinku.</p>';
    h += `<p class="hint">Węzeł dzieli element (np. do zadania obciążenia na części odcinka); przegub zwalnia moment zginający (belka Gerbera) – sprawdź, czy układ pozostaje geometrycznie niezmienny.</p><div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
    m.innerHTML = h; m.style.display = 'flex';
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
    const ss = $('#nwSeg', m); if (ss) ss.onchange = () => { segI = +ss.value; draw(); };
    $('#nIns', m).onclick = () => { const a = parseNum($('#nA', m).value); if (a === null || !(a > 0.01) || a >= sg.L - 0.01) { $('#nA', m).classList.add('bad'); return; } S.nodes.push({ seg: sg.i, a, hinge: $('#nH', m).checked }); changed(true); draw(); };
    $('#nDivB', m).onclick = () => { const n = +$('#nDiv', m).value; for (let j = 1; j < n; j++) S.nodes.push({ seg: sg.i, a: +(sg.L * j / n).toFixed(4), hinge: false }); changed(true); draw(); };
    $$('[data-na]', m).forEach(inp => inp.addEventListener('change', () => { const v = parseNum(inp.value); if (v === null || v <= 0 || v >= sg.L) { inp.classList.add('bad'); return; } S.nodes[+inp.dataset.na].a = v; changed(true); }));
    $$('[data-nh]', m).forEach(cb => cb.addEventListener('change', () => { S.nodes[+cb.dataset.nh].hinge = cb.checked; changed(true); }));
    $$('[data-nd]', m).forEach(b => b.addEventListener('click', () => { S.nodes.splice(+b.dataset.nd, 1); changed(true); draw(); }));
  };
  draw();
}
function nodePopup(k) {
  const n = S.nodes[k]; if (!n) return;
  const md = model(), sg = md.segs[n.seg];
  const m = $('#modal');
  m.innerHTML = `<div class="dlg sm"><h3>${n.hinge ? 'Przegub' : 'Węzeł'} – ${esc(sg ? sg.label : '')}</h3><div class="zg">a = <input class="txt" id="ndA" value="${showNum(n.a)}"> m od początku odcinka (L = ${sg ? fmt(sg.L, 2) : '—'} m)</div><label class="chk"><input type="checkbox" id="ndH" ${n.hinge ? 'checked' : ''}><span>przegub (zwolnienie momentu)</span></label>
    <div class="dbtn"><button class="btn dng" data-del>Usuń</button><span style="flex:1"></span><button class="btn" data-x>Anuluj</button><button class="btn pri" data-ok>Zastosuj</button></div></div>`;
  m.style.display = 'flex';
  $('[data-x]', m).onclick = () => { m.style.display = 'none'; };
  $('[data-del]', m).onclick = () => { S.nodes.splice(k, 1); m.style.display = 'none'; changed(true); };
  $('[data-ok]', m).onclick = () => { const v = parseNum($('#ndA', m).value); if (v === null || v <= 0 || (sg && v >= sg.L)) { $('#ndA', m).classList.add('bad'); return; } n.a = v; n.hinge = $('#ndH', m).checked; m.style.display = 'none'; changed(true); };
}

/* --------------------------------------------------------- okna: podpora */
function supportPopup(k) {
  const md = model(), p = md.sups[k]; if (!p) return;
  while (S.supCfg.length <= k) S.supCfg.push({});
  const c0 = JSON.parse(JSON.stringify(S.supCfg[k] || {}));
  const c = Object.assign({ dof: Object.assign({}, p.dof), kv: '', kr: '', t: '', a: '', direct: true, kc90: '', notch: { on: false, side: 'bot', hef: '', x: '', i: '' } }, c0);
  c.dof = Object.assign({}, p.dof, c0.dof || {}); c.notch = Object.assign({ on: false, side: 'bot', hef: '', x: '', i: '' }, c0.notch || {}); c.col = E.normCol(c0.col);
  const m = $('#modal');
  const sd = R && R.supData ? R.supData[k] : null;
  const draw = () => {
    const presets = [['roller', 'przegubowa przesuwna', 'blokady y, z'], ['pin', 'przegubowa nieprzesuwna', 'blokady x, y, z'], ['fix', 'utwierdzenie', 'x, y, z i obrót']];
    const cur = c.dof.r ? 'fix' : c.dof.x ? 'pin' : 'roller';
    const res = sd ? `<div class="hint">${sd.bear ? `R<sub>Ed,max</sub> = <b>${fmt(sd.bear.F, 2)} kN</b>, l<sub>ef</sub> = ${fmt(sd.bl.lef, 0)} mm, σ<sub>c,90,d</sub> = ${fmt(sd.bear.s, 2)} MPa ≤ k<sub>c,90</sub>·f<sub>c,90,d</sub> = ${fmt(sd.kc.k, 2)}·${fmt(sd.bear.fd, 2)} → η = <b>${fmt(sd.bear.ratio * 100, 0)}%</b> (${esc(sd.kc.src)})` : ''}${sd.notch ? `<br>Podcięcie: k<sub>v</sub> = ${fmt(sd.notch.kv, 3)}, τ<sub>d</sub> = ${fmt(sd.notch.tau, 2)} MPa → η = <b>${fmt(sd.notch.ratio * 100, 0)}%</b>` : ''}${sd.uplift ? `<br><b style="color:var(--warn)">Reakcja odrywająca R<sub>min</sub> = ${fmt(sd.uplift, 2)} kN – zaprojektuj zakotwienie (np. słup ze stopą poniżej).</b>` : ''}</div>` : '';
    const end = !p.segL || !p.segR;
    const cd = R && R.colData ? R.colData.find(q => q.k === k) : null;
    m.innerHTML = `<div class="dlg suppop"><h3>Podpora ${esc(p.label)} – ${esc(p.name)} (x = ${fmt(p.x, 2)} m)</h3>
      <div class="zg">${presets.map(([v, l, d]) => `<label class="rad ${cur === v ? 'on' : ''}"><input type="radio" name="sp" value="${v}" ${cur === v ? 'checked' : ''}><span><b>${l}</b><br><small>${d}</small></span></label>`).join('')}</div>
      <div class="zg">Blokady: ${[['x', 'przesuw x (wzdłuż osi)'], ['y', 'przesuw y (pionowo)'], ['z', 'przesuw z (bocznie)'], ['r', 'obrót']].map(([q, l]) => `<label class="dofc ${c.dof[q] ? 'on' : ''}"><input type="checkbox" data-dof="${q}" ${c.dof[q] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <h4 class="lsec">Oparcie i docisk (6.1.5)</h4>
      <div class="zg">długość oparcia t <input class="txt" data-c="t" value="${showNum(c.t)}" placeholder="${S.geom.t}"> mm ${end ? `· wysunięcie belki poza podporę a <input class="txt" data-c="a" value="${showNum(c.a)}" placeholder="0"> mm` : ''} · k<sub>c,90</sub> <input class="txt" data-c="kc90" value="${showNum(c.kc90)}" placeholder="auto"></div>
      <label class="chk"><input type="checkbox" data-c="direct" ${c.direct !== false ? 'checked' : ''}> podparcie bezpośrednie (od dołu) – redukcja V<sub>Ed</sub> wg 6.1.7(3)</label>
      <div class="zg">podatność pionowa k<sub>v</sub> <input class="txt" data-c="kv" value="${showNum(c.kv)}" placeholder="sztywna"> kN/mm · obrotowa k<sub>φ</sub> <input class="txt" data-c="kr" value="${showNum(c.kr)}" placeholder="—"> kNm/rad</div>
      <h4 class="lsec">Podcięcie belki przy podporze (6.5.2)</h4>
      <label class="chk"><input type="checkbox" data-n="on" ${c.notch.on ? 'checked' : ''}> belka podcięta na podporze</label>
      ${c.notch.on ? `<div class="zg"><select data-n="side"><option value="bot" ${c.notch.side !== 'top' ? 'selected' : ''}>od strony podpory (dołem)</option><option value="top" ${c.notch.side === 'top' ? 'selected' : ''}>od strony przeciwnej (górą)</option></select> h<sub>ef</sub> <input class="txt" data-n="hef" value="${showNum(c.notch.hef)}"> mm · x <input class="txt" data-n="x" value="${showNum(c.notch.x)}" placeholder="0"> mm · nachylenie 1:i, i = <input class="txt" data-n="i" value="${showNum(c.notch.i)}" placeholder="0"></div><div class="flex">${notchSVG(c.notch, p)}<div class="hint" style="max-width:300px">h<sub>ef</sub> – wysokość belki w miejscu podcięcia; x – odległość od osi reakcji podpory do naroża podcięcia; i – nachylenie skosu podcięcia (0 – podcięcie ostre). Dla podcięcia od strony przeciwnej do podpory k<sub>v</sub> = 1.</div></div>` : ''}
      <h4 class="lsec">Słup drewniany pod podporą i połączenie z fundamentem</h4>
      <div class="zg"><label class="chk"><input type="checkbox" data-col="on" ${c.col.on ? 'checked' : ''}> słup pod tą podporą (obciążenie – reakcje belki z kombinacji)</label>${c.col.on ? `<button class="btn sm" data-colwin>Słup i stopa…</button>` : ''}</div>
      ${c.col.on ? `<div class="hint">${fmt(c.col.b, 0)}×${fmt(c.col.h, 0)} mm, H = ${fmt(c.col.L, 2)} m; stopa: ${c.col.type === 'slot' ? 'blacha wpuszczana' : 'blachy zewnętrzne'} t = ${fmt(c.col.ts, 0)} mm, ${c.col.n * c.col.m} × ${c.col.fast === 'bolt' ? 'śruba' : 'sworzeń'} ⌀${c.col.d}; blacha podstawy ${fmt(c.col.pa, 0)}×${fmt(c.col.pb, 0)} mm, ${c.col.na} kotwy${cd ? ` · największe wytężenie: <b>${fmt(Math.max(...R.checks.filter(q => q.col === k && isFinite(q.ratio)).map(q => q.ratio)) * 100, 0)}%</b>` : ''}</div>` : ''}
      ${res}
      <div class="dbtn"><button class="btn" data-a="def">Domyślna</button><span style="flex:1"></span><button class="btn" data-a="x">Anuluj</button><button class="btn pri" data-a="ok">Zastosuj</button></div></div>`;
    $$('input[name=sp]', m).forEach(r => r.addEventListener('change', () => { c.dof = Object.assign({}, E.SUP_DOF[r.value]); draw(); }));
    $$('[data-dof]', m).forEach(cb => cb.addEventListener('change', () => { c.dof[cb.dataset.dof] = cb.checked; draw(); }));
    $$('[data-c]', m).forEach(inp => inp.addEventListener('change', () => { const f = inp.dataset.c; if (f === 'direct') { c.direct = inp.checked; return; } const v = inp.value.trim() === '' ? '' : parseNum(inp.value); if (v === null || (v !== '' && v < 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); c[f] = v; }));
    $$('[data-n]', m).forEach(inp => inp.addEventListener('change', () => { const f = inp.dataset.n; if (f === 'on') { c.notch.on = inp.checked; if (c.notch.on && !(c.notch.hef > 0)) c.notch.hef = Math.round(Math.max(...[p.segL, p.segR].filter(Boolean).map(s => s.h)) * 0.75 / 5) * 5; if (c.notch.on && c.notch.x === '') c.notch.x = Math.round(p.t / 2); draw(); return; } if (f === 'side') { c.notch.side = inp.value; draw(); return; } const v = inp.value.trim() === '' ? '' : parseNum(inp.value); if (v === null || (v !== '' && v < 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); c.notch[f] = v; draw(); }));
    const co = $('[data-col="on"]', m); if (co) co.addEventListener('change', () => { c.col.on = co.checked; draw(); });
    const cw = $('[data-colwin]', m); if (cw) cw.onclick = () => { S.supCfg[k] = c; changed(true); colPopup(k); };
    $$('[data-a]', m).forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'x') { m.style.display = 'none'; return; }
      if (a === 'def') S.supCfg[k] = {}; else S.supCfg[k] = c;
      m.style.display = 'none'; changed(true);
    }));
  };
  draw(); m.style.display = 'flex';
}
function notchSVG(n, p) {
  const W = 260, H = 120, h = S.geom.h, hef = n.hef > 0 ? Math.min(n.hef, h) : h * 0.75, sc = 70 / h, x0 = 40, yT = 25, yB = yT + h * sc, L = 190;
  const xr = x0 + (n.x > 0 ? n.x : 0) * sc, dh = (h - hef) * sc, top = n.side === 'top', ii = n.i > 0 ? n.i : 0;
  let s = svgOpen(W, H);
  const pts = top ? `${x0},${yT + dh} ${xr},${yT + dh} ${xr + ii * dh},${yT} ${x0 + L},${yT} ${x0 + L},${yB} ${x0},${yB}` : `${x0},${yT} ${x0 + L},${yT} ${x0 + L},${yB} ${xr + ii * dh},${yB} ${xr},${yB - dh} ${x0},${yB - dh}`;
  s += `<polygon points="${pts}" fill="${WOOD}" stroke="${WOODE}" stroke-width="1.2"/>`;
  s += `<path d="M${x0 - 10},${top ? yB : yB - dh} h40" stroke="#1b2230" stroke-width="2"/>`;
  s += `<path d="M${x0 + 10},${(top ? yB : yB - dh) + 2} v14 M${x0 + 6},${(top ? yB : yB - dh) + 8} l4,-6 l4,6" stroke="#1d5bb8" stroke-width="1.3" fill="none"/>` + tx(x0 + 18, (top ? yB : yB - dh) + 16, 'R', { a: 'start', fs: 10, c: '#1d5bb8' });
  s += dimV(x0 + L + 14, yT, yB, `h=${fmt(h, 0)}`, { right: true, fs: 9.5 });
  s += top ? dimV(xr + 30, yT + dh, yB, `h_ef=${fmt(hef, 0)}`, { right: true, fs: 9.5 }) : dimV(xr + 30, yT, yB - dh, `h_ef=${fmt(hef, 0)}`, { right: true, fs: 9.5 });
  return s + '</svg>';
}

