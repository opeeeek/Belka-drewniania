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
// dane do rysunku obciążeń: wiersze (każde obciążenie – osobny wiersz)
function loadRows(md) {
  const rows = [];
  const mt = R && R.mt ? R.mt : mtNow();
  if (S.loads.sw && mt) {
    const parts = md.segs.map(s => ({ x1: s.x0, x2: s.x1, q1: mt.gamma * s.sec.A * 1e-6, q2: mt.gamma * s.sec.A * 1e-6 }));
    rows.push({ key: 'sw', id: 'G0', name: 'ciężar własny', col: KIND_COLOR.G, dist: parts, pts: [], dir: 'g' });
  }
  allItems().forEach(([arr, i, it]) => {
    if (it.off) return;
    const rg = E.itemRange(it, md), q2 = it.q2 === '' ? it.q : it.q2;
    const dist = (it.q || q2) && rg.xb > rg.xa ? [{ x1: rg.xa, x2: rg.xb, q1: it.q, q2 }] : [];
    const pts = (it.pts || []).filter(p => p.P).map(p => ({ x: E.ptX(p, rg), P: p.P }));
    if (!dist.length && !pts.length && !it.mt && !it.N) return;
    rows.push({ key: `${arr}.${i}`, id: idOf(arr, i), name: it.name || KIND_NAME[it.kind], col: KIND_COLOR[it.kind], dist, pts, dir: it.dir, proj: it.proj, mt: it.mt, N: it.N, rg });
  });
  return rows;
}
function schemeSVG(W, opt) {
  opt = opt || {};
  const md = R && R.md ? R.md : model();
  if (!md.segs.length) return '';
  const ml = 34, mr = 34, rowH = opt.compact ? 18 : 24;
  const rows = loadRows(md);
  const top = 22 + rows.length * rowH, yb = top + 14;
  const H = yb + (opt.noDims ? 50 : 110);
  const X = x => ml + x / md.Ltot * (W - ml - mr);
  let s = svgOpen(W, H, `class="schemesvg"`);
  // obciążenia
  rows.forEach((r, k) => {
    const y1 = 18 + k * rowH, y2 = y1 + rowH - 5, qmax = Math.max(1e-9, ...r.dist.map(d => Math.max(Math.abs(d.q1), Math.abs(d.q2))));
    s += `<g class="ld" data-ld="${r.key}"><title>${esc(r.id + ' – ' + r.name)} – kliknij, aby edytować</title><rect x="${ml - 4}" y="${y1 - 2}" width="${W - ml - mr + 8}" height="${rowH - 1}" fill="transparent"/>`;
    const dash = r.dir === 'z' ? ' stroke-dasharray="4 3"' : '';
    r.dist.forEach(d => {
      const xa = X(d.x1), xb = X(d.x2), ha = (rowH - 7) * Math.abs(d.q1) / qmax, hb = (rowH - 7) * Math.abs(d.q2) / qmax;
      s += `<polygon points="${xa},${y2} ${xa},${y2 - ha} ${xb},${y2 - hb} ${xb},${y2}" fill="${r.col}" fill-opacity="0.13" stroke="${r.col}" stroke-width="0.8"${dash}/>`;
      const n = Math.max(1, Math.round((xb - xa) / 16));
      for (let j = 0; j <= n; j++) {
        const x = xa + (xb - xa) * j / n, q = d.q1 + (d.q2 - d.q1) * j / n, hh = (rowH - 7) * Math.abs(q) / qmax;
        if (hh < 2) continue;
        const up = q < 0;
        s += up ? `<path d="M${x},${y2 - hh} v${hh - 1} M${x - 2},${y2 - hh + 3} l2,-3 l2,3" stroke="${r.col}" stroke-width="0.8" fill="none"/>` : `<path d="M${x},${y2 - hh} v${hh - 1} M${x - 2},${y2 - 3} l2,3 l2,-3" stroke="${r.col}" stroke-width="0.8" fill="none"/>`;
      }
    });
    r.pts.forEach(p => {
      const x = X(p.x), up = p.P < 0;
      s += `<path d="M${x},${y1} V${y2} ${up ? `M${x - 3.5},${y1 + 5} l3.5,-5 l3.5,5` : `M${x - 3.5},${y2 - 5} l3.5,5 l3.5,-5`}" stroke="${r.col}" stroke-width="1.6" fill="none"/>` + tx(x + 5, y1 + 8, `${fmt(p.P, p.P % 1 ? 2 : 0)} kN`, { a: 'start', fs: 9.5, c: r.col, w: 600 });
    });
    const qtxt = r.dist.length ? (Math.abs(r.dist[0].q1 - r.dist[0].q2) > 1e-9 ? `q = ${fmt(r.dist[0].q1, 2)}…${fmt(r.dist[0].q2, 2)} kN/m` : `q = ${fmt(r.dist[0].q1, 2)} kN/m`) : '';
    const extra = [r.dir === 'z' ? '[Z]' : r.dir === 'y' ? '[⊥]' : r.proj === 'hor' && S.geom.beta ? '[rzut]' : '', r.mt ? `m_t = ${fmt(r.mt, 2)}` : '', r.N ? `N = ${fmt(r.N, 1)} kN` : ''].filter(Boolean).join(' ');
    s += tx(ml - 2 + 4, y1 + 9, esc(`${r.id}: ${r.key === 'sw' ? '' : r.name + ' '}${qtxt}${extra ? ' ' + extra : ''}`), { a: 'start', fs: 9.5, c: '#3d4656' });
    s += '</g>';
  });
  // belka i odcinki
  md.segs.forEach(sg => {
    const xa = X(sg.x0), xb = X(sg.x1);
    s += `<g class="elm" data-seg="${sg.i}"><title>${esc(cap(sg.label))}: ${fmt(sg.L, 2)} m, przekrój ${fmt(sg.b1, 0)}×${fmt(sg.h, 0)}${S.geom.n > 1 ? ` (×${S.geom.n})` : ''} – kliknij: obciążenia, przekrój, węzły</title><rect class="elhl" x="${xa}" y="${yb - 9}" width="${xb - xa}" height="18" rx="3" fill="transparent" stroke="transparent"/>`;
    s += `<rect x="${xa}" y="${yb - 3.5}" width="${xb - xa}" height="7" fill="${WOOD}" stroke="${WOODE}" stroke-width="1"/>`;
    s += '</g>';
  });
  // podpory (oparcie t) i podcięcia
  md.sups.forEach(p => {
    const xx = X(p.x), tw = Math.max(2, p.t / 1000 / md.Ltot * (W - ml - mr));
    s += `<rect x="${xx - tw / 2}" y="${yb + 3.5}" width="${tw}" height="2.5" fill="#9aa3b0"/>`;
    if (p.notch && p.notch.on) s += `<path d="M${xx - 5},${p.notch.side === 'top' ? yb - 3.5 : yb + 3.5} h10 v${p.notch.side === 'top' ? 3 : -3} h-10 z" fill="#c0262d"><title>podcięcie</title></path>`;
    s += supportSym(p, xx, yb, opt);
  });
  // węzły użytkownika i przeguby
  S.nodes.forEach((n, k) => {
    const sg = md.segs[n.seg]; if (!sg || n.a >= sg.L) return;
    const xx = X(sg.x0 + n.a);
    s += `<g class="nod" data-node="${k}"><title>${n.hinge ? 'Przegub' : 'Węzeł'} w ${esc(sg.label)}, a = ${fmt(n.a, 2)} m – kliknij, aby zmienić</title><circle cx="${xx}" cy="${yb}" r="6" fill="transparent"/><circle cx="${xx}" cy="${yb}" r="${n.hinge ? 3.6 : 2.4}" fill="${n.hinge ? '#ffffff' : '#1b2230'}" stroke="#1b2230" stroke-width="1.2"/></g>`;
  });
  // opis przekroju i materiału
  const sg0 = md.segs.find(q => q.kind === 'span') || md.segs[0];
  s += tx((X(sg0.x0) + X(sg0.x1)) / 2, yb - 7, esc(`${S.mat.cls === 'U' ? 'materiał własny' : S.mat.cls} ${S.geom.n > 1 ? S.geom.n + '×' : ''}${fmt(S.geom.b, 0)}×${fmt(S.geom.h, 0)}${S.geom.beta ? ` · β = ${fmt(S.geom.beta, 0)}°` : ''}${S.geom.alpha ? ` · α = ${fmt(S.geom.alpha, 0)}°` : ''}`), { fs: 10, c: '#4a5466' });
  if (!opt.noDims) {
    let y = yb + 58;
    md.segs.forEach(sg => { s += dimH(X(sg.x0), X(sg.x1), y, fmt(sg.L, 2)); });
    if (md.segs.length > 1 || md.extL || md.extR) {
      y += 26;
      const a = X(0) - md.extL / md.Ltot * (W - ml - mr), b = X(md.Ltot) + md.extR / md.Ltot * (W - ml - mr);
      s += dimH(a, b, y, `długość elementu ${fmt(md.Lmember, 2)} m`);
    }
  }
  return s + '</svg>';
}
// wykres pod belką (Dane): M, V, ugięcie, N, wytężenie
function diagSVG(W, kind) {
  if (!R || !R.st || (R.errors && R.errors.length)) return '';
  const md = R.md, st = R.st, ml = 34, mr = 34, H = 150, y0 = 62;
  const X = x => ml + x / md.Ltot * (W - ml - mr);
  let mx, mn, unit, col, title, dp = 1, inv = false;
  if (kind === 'M') { mx = R.env.uls.My.mx; mn = R.env.uls.My.mn; unit = 'kNm'; col = '#c0262d'; title = 'M_Ed [kNm] – obwiednia SGN, po stronie włókien rozciąganych'; inv = true; }
  else if (kind === 'V') { mx = R.env.uls.Vy.mx; mn = R.env.uls.Vy.mn; unit = 'kN'; col = '#1d5bb8'; title = 'V_Ed [kN] – obwiednia SGN'; }
  else if (kind === 'N') { mx = R.env.uls.N.mx; mn = R.env.uls.N.mn; unit = 'kN'; col = '#6a3fb5'; title = 'N_Ed [kN] – obwiednia SGN (+ ściskanie)'; }
  else if (kind === 'w') { mx = R.defl.finMx.map(v => v * 1000); mn = R.defl.finMn.map(v => v * 1000); unit = 'mm'; col = '#1d7f3c'; title = 'w_fin [mm] – ugięcie końcowe (względne)'; inv = true; }
  else if (kind === 'eta') { mx = st.stX.map((x, i) => Math.max(R.eta.bend[i], R.eta.stab[i])); mn = st.stX.map((x, i) => -R.eta.shear[i]); unit = '%'; col = '#a35d00'; title = 'Wytężenie η(x): zginanie/stateczność (+), ścinanie (−)'; dp = 0; }
  else return '';
  const k = kind === 'eta' ? 100 : 1;
  let amax = 1e-9; for (let i = 0; i < mx.length; i++) amax = Math.max(amax, Math.abs(mx[i]) * k, Math.abs(mn[i]) * k);
  const sc = 48 / amax, Y = v => y0 + (inv ? 1 : -1) * v * k * sc;
  let s = svgOpen(W, H, 'class="diag"');
  s += tx(ml - 30, 12, esc(title), { a: 'start', fs: 10, c: '#5b6576' });
  const poly = arr => { let p = `${X(st.stX[0]).toFixed(1)},${y0} `; for (let i = 0; i < arr.length; i++) p += `${X(st.stX[i]).toFixed(1)},${Y(arr[i]).toFixed(1)} `; return p + `${X(st.stX[arr.length - 1]).toFixed(1)},${y0}`; };
  const fillP = kind === 'M' ? '#e6b3b3' : kind === 'V' ? '#c9d4e6' : kind === 'N' ? '#b597ee' : kind === 'w' ? '#a6c76a' : '#e6a35a';
  if (kind !== 'eta') { s += `<polygon points="${poly(mx)}" fill="${fillP}" fill-opacity="0.5" stroke="${col}" stroke-width="1.1"/>`; s += `<polygon points="${poly(mn)}" fill="${fillP}" fill-opacity="0.5" stroke="${col}" stroke-width="1.1"/>`; }
  else { s += `<polygon points="${poly(mx)}" fill="#e6a35a" fill-opacity="0.45" stroke="#a35d00" stroke-width="1.1"/><polygon points="${poly(mn)}" fill="#c9d4e6" fill-opacity="0.6" stroke="#1d5bb8" stroke-width="1.1"/>`;
    const y100 = Y(1), y100n = Y(-1); s += `<line x1="${ml}" y1="${y100}" x2="${W - mr}" y2="${y100}" stroke="#c0262d" stroke-dasharray="5 3" stroke-width="0.9"/><line x1="${ml}" y1="${y100n}" x2="${W - mr}" y2="${y100n}" stroke="#c0262d" stroke-dasharray="5 3" stroke-width="0.9"/>` + tx(W - mr + 2, y100 + 3, '100%', { a: 'start', fs: 9, c: '#c0262d' }); }
  s += `<line x1="${ml}" y1="${y0}" x2="${W - mr}" y2="${y0}" stroke="#39414f" stroke-width="1"/>`;
  // wartości ekstremalne w odcinkach
  const lab = (i, v, below) => { const x = X(st.stX[i]), y = Y(v); return `<circle cx="${x}" cy="${y}" r="2" fill="${col}"/>` + tx(Math.min(W - 20, Math.max(20, x)), y + (below ? 11 : -4), fmt(v * k, dp) + (kind === 'eta' ? '%' : ''), { fs: 9.5, c: col, w: 650 }); };
  md.segs.forEach(sg => {
    let iM = -1, iN = -1;
    for (let i = 0; i < mx.length; i++) { if (st.stSeg[i] !== sg.i) continue; if (iM < 0 || mx[i] > mx[iM]) iM = i; if (iN < 0 || mn[i] < mn[iN]) iN = i; }
    if (iM >= 0 && Math.abs(mx[iM]) * k > amax * 0.04) s += lab(iM, mx[iM], inv);
    if (iN >= 0 && Math.abs(mn[iN]) * k > amax * 0.04) s += lab(iN, mn[iN], !inv);
  });
  md.sups.forEach(p => { s += `<line x1="${X(p.x)}" y1="${y0 - 52}" x2="${X(p.x)}" y2="${y0 + 52}" stroke="#9aa3b0" stroke-width="0.6" stroke-dasharray="3 3"/>`; });
  return s + '</svg>';
}
// zestawienie obciążeń (wartości charakterystyczne)
function loadSummaryHTML() {
  const md = R && R.md ? R.md : model();
  const rows = allItems().map(([arr, i, it]) => {
    const rg = E.itemRange(it, md), where = it.spans && it.spans.length ? `odcinki ${it.spans.join(', ')}` : it.span ? md.segs[it.span - 1] ? md.segs[it.span - 1].label : '—' : 'cała belka';
    const q = it.q || (it.q2 !== '' && it.q2) ? `${fmt(it.q, 2)}${it.q2 !== '' && it.q2 !== it.q ? '…' + fmt(it.q2, 2) : ''} kN/m${it.x1 !== '' || it.x2 !== '' ? ` (${fmt(rg.xa, 2)}–${fmt(rg.xb, 2)} m)` : ''}` : '';
    const P = (it.pts || []).filter(p => p.P).map(p => `${fmt(p.P, 2)} kN @ ${fmt(E.ptX(p, rg), 2)} m`).join('; ');
    const dur = arr === 'perm' ? 'stałe' : E.DUR_NAME[E.durOf(it)];
    return `<tr data-openload="${arr}.${i}" class="${it.off ? 'ldoff' : ''}"><td><input type="checkbox" class="ldon" data-ldon="${arr}.${i}" ${it.off ? '' : 'checked'} title="aktywne"><b style="color:${KIND_COLOR[it.kind]}">${idOf(arr, i)}</b></td><td>${esc(it.name || KIND_NAME[it.kind])}<br><small style="color:var(--ink3)">${esc(KIND_NAME[it.kind])}, ${esc(dur)}${it.dir !== 'g' ? (it.dir === 'z' ? ', poziomo (z)' : ', ⊥ do osi') : ''}</small></td><td>${[q, P].filter(Boolean).join('<br>') || '—'}${it.mt ? `<br>m<sub>t</sub> = ${fmt(it.mt, 2)} kNm/m` : ''}${it.N ? `<br>N = ${fmt(it.N, 1)} kN` : ''}</td><td>${esc(where)}</td></tr>`;
  });
  const mt = R && R.mt;
  const sw = S.loads.sw && mt ? `<tr class="info"><td><b>G0</b></td><td>Ciężar własny belki</td><td>${fmt(mt.gamma, 1)} kN/m³ × A = ${fmt(mt.gamma * md.segs[0].sec.A * 1e-6, 3)} kN/m</td><td>cała belka</td></tr>` : '';
  return `<table class="ldsum"><tr><th>Ozn.</th><th>Obciążenie</th><th>Wartość charakterystyczna</th><th>Zakres</th></tr>${sw}${rows.join('') || '<tr><td colspan="4" class="lnone">Brak obciążeń – dodaj w formularzu lub kliknij przęsło na schemacie.</td></tr>'}</table>`;
}
function combSumHTML() {
  if (!R || !R.cb || (R.errors && R.errors.length)) return '';
  const g = R.checks.filter(c => /^SGN/.test(c.grp) && isFinite(c.ratio)).reduce((a, c) => (!a || c.ratio > a.ratio ? c : a), null);
  let mM = 0, mV = 0; for (let i = 0; i < R.env.uls.My.mx.length; i++) { mM = Math.max(mM, Math.abs(R.env.uls.My.mx[i]), Math.abs(R.env.uls.My.mn[i])); mV = Math.max(mV, Math.abs(R.env.uls.Vy.mx[i]), Math.abs(R.env.uls.Vy.mn[i])); }
  return `<div class="combsum">|M<sub>Ed</sub>|<sub>max</sub> = <b>${fmt(mM, 2)} kNm</b>, |V<sub>Ed</sub>|<sub>max</sub> = <b>${fmt(mV, 2)} kN</b> · kombinacji SGN: ${R.cb.uls.length}${g ? `<br><small>Decyduje: ${sym(g.name.replace(/ ≤.*$/, ''))} – ${esc(g.combo || '')}, η = ${fmt(g.ratio * 100, 0)}%</small>` : ''}</div>`;
}
let BEAMS = null, curB = 0;
function renderDataSide() {
  const el = $('#dataside'); if (!el) return;
  const W = Math.max(360, Math.min(900, (el.clientWidth || 600) - 26));
  const sch = schemeSVG(W);
  const kinds = [['M', 'M'], ['V', 'V'], ['w', 'ugięcie'], ['N', 'N'], ['eta', 'wytężenie η'], ['', 'bez wykresu']];
  el.innerHTML = `<div class="box">${beamTabsHTML()}<h4 class="schhd">Schemat statyczny i obciążenia</h4>
    <p class="hint">Kliknij przęsło (obciążenia, przekrój, węzły i przeguby), podporę (rodzaj, oparcie, podcięcie) albo obciążenie (edycja).</p>
    <div class="schemewrap">${sch}</div>
    <div class="segsw sm dgsw" style="margin:4px auto 2px;display:flex;justify-content:center">${kinds.map(([k, l]) => `<button data-dk="${k}" class="${k === diagKind ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${diagKind ? `<div class="schemewrap">${diagSVG(W, diagKind)}</div>` : ''}
    ${combSumHTML()}</div>
    <div class="box"><h4>Zestawienie obciążeń</h4>${loadSummaryHTML()}</div>`;
  bindScheme(el);
  $$('[data-dk]', el).forEach(b => b.addEventListener('click', () => { diagKind = b.dataset.dk; try { localStorage.setItem('belkadr-diag', diagKind); } catch (e) { /* */ } renderDataSide(); }));
  $$('tr[data-openload]', el).forEach(tr => tr.addEventListener('click', e => { if (e.target.closest('input')) return; const [a, i] = tr.dataset.openload.split('.'); loadPopup(a, +i); }));
  $$('[data-ldon]', el).forEach(cb => cb.addEventListener('change', () => { const [a, i] = cb.dataset.ldon.split('.'); arrByKey(a)[+i].off = !cb.checked; changed(true); }));
}
function bindScheme(root) {
  $$('.schemesvg .supp', root).forEach(g => g.addEventListener('click', () => supportPopup(+g.dataset.sup)));
  $$('.schemesvg .elm', root).forEach(g => g.addEventListener('click', () => spanPopup(+g.dataset.seg)));
  $$('.schemesvg .ld', root).forEach(g => g.addEventListener('click', () => { const k = g.dataset.ld; if (k === 'sw') { toast('Ciężar własny – wyłączysz go w grupie Obciążenia; ciężar objętościowy – w Materiale.'); return; } const [a, i] = k.split('.'); loadPopup(a, +i); }));
  $$('.schemesvg .nod', root).forEach(g => g.addEventListener('click', e => { e.stopPropagation(); spanPopup(S.nodes[+g.dataset.node].seg); }));
}

/* --------------------------------------------------------- okna: podpora */
function supportPopup(k) {
  const md = model(), p = md.sups[k]; if (!p) return;
  while (S.supCfg.length <= k) S.supCfg.push({});
  const c0 = JSON.parse(JSON.stringify(S.supCfg[k] || {}));
  const c = Object.assign({ dof: Object.assign({}, p.dof), kv: '', kr: '', t: '', a: '', direct: true, kc90: '', notch: { on: false, side: 'bot', hef: '', x: '', i: '' } }, c0);
  c.dof = Object.assign({}, p.dof, c0.dof || {}); c.notch = Object.assign({ on: false, side: 'bot', hef: '', x: '', i: '' }, c0.notch || {});
  const m = $('#modal');
  const sd = R && R.supData ? R.supData[k] : null;
  const draw = () => {
    const presets = [['roller', 'przegubowa przesuwna', 'blokady y, z'], ['pin', 'przegubowa nieprzesuwna', 'blokady x, y, z'], ['fix', 'utwierdzenie', 'x, y, z i obrót']];
    const cur = c.dof.r ? 'fix' : c.dof.x ? 'pin' : 'roller';
    const res = sd ? `<div class="hint">${sd.bear ? `R<sub>Ed,max</sub> = <b>${fmt(sd.bear.F, 2)} kN</b>, l<sub>ef</sub> = ${fmt(sd.bl.lef, 0)} mm, σ<sub>c,90,d</sub> = ${fmt(sd.bear.s, 2)} MPa ≤ k<sub>c,90</sub>·f<sub>c,90,d</sub> = ${fmt(sd.kc.k, 2)}·${fmt(sd.bear.fd, 2)} → η = <b>${fmt(sd.bear.ratio * 100, 0)}%</b> (${esc(sd.kc.src)})` : ''}${sd.notch ? `<br>Podcięcie: k<sub>v</sub> = ${fmt(sd.notch.kv, 3)}, τ<sub>d</sub> = ${fmt(sd.notch.tau, 2)} MPa → η = <b>${fmt(sd.notch.ratio * 100, 0)}%</b>` : ''}${sd.uplift ? `<br><b style="color:var(--warn)">Reakcja odrywająca R<sub>min</sub> = ${fmt(sd.uplift, 2)} kN – zaprojektuj zakotwienie.</b>` : ''}</div>` : '';
    const end = !p.segL || !p.segR;
    m.innerHTML = `<div class="dlg suppop"><h3>Podpora ${esc(p.label)} – ${esc(p.name)} (x = ${fmt(p.x, 2)} m)</h3>
      <div class="zg">${presets.map(([v, l, d]) => `<label class="rad ${cur === v ? 'on' : ''}"><input type="radio" name="sp" value="${v}" ${cur === v ? 'checked' : ''}><span><b>${l}</b><br><small>${d}</small></span></label>`).join('')}</div>
      <div class="zg">Blokady: ${[['x', 'przesuw x (wzdłuż osi)'], ['y', 'przesuw y (pionowo)'], ['z', 'przesuw z (bocznie)'], ['r', 'obrót']].map(([q, l]) => `<label class="dofc ${c.dof[q] ? 'on' : ''}"><input type="checkbox" data-dof="${q}" ${c.dof[q] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <h4 class="lsec">Oparcie i docisk (6.1.5)</h4>
      <div class="zg">długość oparcia t <input class="txt" data-c="t" value="${showNum(c.t)}" placeholder="${S.geom.t}"> mm ${end ? `· wysunięcie belki poza podporę a <input class="txt" data-c="a" value="${showNum(c.a)}" placeholder="0"> mm` : ''} · k<sub>c,90</sub> <input class="txt" data-c="kc90" value="${showNum(c.kc90)}" placeholder="auto"></div>
      <label class="chk"><input type="checkbox" data-c="direct" ${c.direct !== false ? 'checked' : ''}> podparcie bezpośrednie (od dołu) – redukcja V<sub>Ed</sub> wg 6.1.7(3)</label>
      <div class="zg">podatność pionowa k<sub>v</sub> <input class="txt" data-c="kv" value="${showNum(c.kv)}" placeholder="sztywna"> kN/mm · obrotowa k<sub>φ</sub> <input class="txt" data-c="kr" value="${showNum(c.kr)}" placeholder="—"> kNm/rad</div>
      <h4 class="lsec">Podcięcie belki przy podporze (6.5.2)</h4>
      <label class="chk"><input type="checkbox" data-n="on" ${c.notch.on ? 'checked' : ''}> belka podcięta na podporze</label>
      ${c.notch.on ? `<div class="zg"><select data-n="side"><option value="bot" ${c.notch.side !== 'top' ? 'selected' : ''}>od strony podpory (dołem)</option><option value="top" ${c.notch.side === 'top' ? 'selected' : ''}>od strony przeciwnej (górą)</option></select> h<sub>ef</sub> <input class="txt" data-n="hef" value="${showNum(c.notch.hef)}" placeholder="${Math.round(S.geom.h * 0.75)}"> mm · x <input class="txt" data-n="x" value="${showNum(c.notch.x)}" placeholder="0"> mm · nachylenie 1:i, i = <input class="txt" data-n="i" value="${showNum(c.notch.i)}" placeholder="0"></div><div class="flex">${notchSVG(c.notch, p)}<div class="hint" style="max-width:300px">h<sub>ef</sub> – wysokość belki w miejscu podcięcia; x – odległość od osi reakcji podpory do naroża podcięcia; i – nachylenie skosu podcięcia (0 – podcięcie ostre). Dla podcięcia od strony przeciwnej do podpory k<sub>v</sub> = 1.</div></div>` : ''}
      ${res}
      <div class="dbtn"><button class="btn" data-a="def">Domyślna</button><span style="flex:1"></span><button class="btn" data-a="x">Anuluj</button><button class="btn pri" data-a="ok">Zastosuj</button></div></div>`;
    $$('input[name=sp]', m).forEach(r => r.addEventListener('change', () => { c.dof = Object.assign({}, E.SUP_DOF[r.value]); draw(); }));
    $$('[data-dof]', m).forEach(cb => cb.addEventListener('change', () => { c.dof[cb.dataset.dof] = cb.checked; draw(); }));
    $$('[data-c]', m).forEach(inp => inp.addEventListener('change', () => { const f = inp.dataset.c; if (f === 'direct') { c.direct = inp.checked; return; } const v = inp.value.trim() === '' ? '' : parseNum(inp.value); if (v === null || (v !== '' && v < 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); c[f] = v; }));
    $$('[data-n]', m).forEach(inp => inp.addEventListener('change', () => { const f = inp.dataset.n; if (f === 'on') { c.notch.on = inp.checked; draw(); return; } if (f === 'side') { c.notch.side = inp.value; draw(); return; } const v = inp.value.trim() === '' ? '' : parseNum(inp.value); if (v === null || (v !== '' && v < 0)) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); c.notch[f] = v; draw(); }));
    $$('[data-a]', m).forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'x') { m.style.display = 'none'; return; }
      if (a === 'def') S.supCfg[k] = {};
      else S.supCfg[k] = c;
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

/* --------------------------------------------------- okna: przęsło i obciążenia */
function spanPopup(si) {
  const md = model(), sg = md.segs[si]; if (!sg) return;
  const m = $('#modal');
  const draw = () => {
    const mine = allItems().filter(([a, i, it]) => it.span === si + 1 || (it.spans && it.spans.includes(si + 1)) || (!it.span && !(it.spans && it.spans.length)));
    const g = S.segGeo[si] || {};
    const nodes = S.nodes.map((n, k) => [n, k]).filter(([n]) => n.seg === si);
    m.innerHTML = `<div class="dlg lpop"><h3>${esc(cap(sg.label))} – L = ${fmt(sg.L, 2)} m</h3>
      <div class="addbar">Dodaj obciążenie w tym odcinku: ${['perm', 'imp', 'snow', 'wind', 'other', 'acc'].map(k => `<button class="addb" data-addk="${k}">+ ${KIND_NAME[k]}</button>`).join(' ')}</div>
      <div class="fields" id="spItems">${mine.map(([a, i, it]) => itemHTML(a, i, it)).join('') || '<div class="lnone">Brak obciążeń w tym odcinku.</div>'}</div>
      <h4 class="lsec">Przekrój w tym odcinku</h4>
      <div class="zg">b <input class="txt" data-g="b" value="${showNum(g.b || '')}" placeholder="${S.geom.b}"> × h <input class="txt" data-g="h" value="${showNum(g.h || '')}" placeholder="${S.geom.h}"> mm <span class="hint">(puste – przekrój ogólny ${S.geom.n > 1 ? S.geom.n + '×' : ''}${S.geom.b}×${S.geom.h})</span></div>
      <h4 class="lsec">Węzły i przeguby</h4>
      ${nodes.map(([n, k]) => `<div class="zg">a = <input class="txt" data-na="${k}" value="${showNum(n.a)}"> m od początku odcinka <label class="chk sm"><input type="checkbox" data-nh="${k}" ${n.hinge ? 'checked' : ''}> przegub</label><button class="del" data-nd="${k}" title="Usuń węzeł">×</button></div>`).join('')}
      <div class="zg"><button class="addp" data-nadd="1">+ węzeł</button><button class="addp" data-nadd="2">+ przegub (belka Gerbera)</button></div>
      <div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
    bindItems($('#spItems', m));
    $$('[data-addk]', m).forEach(b => b.addEventListener('click', () => {
      const kind = b.dataset.addk, A = listArr(kind), n = A.filter(it => arrKey(kind) !== 'var' || it.kind === kind).length + 1;
      const it = E.normItem(Object.assign(LIST_DEF[kind](n), { span: si + 1 }), kind === 'acc' || kind === 'perm' ? kind : undefined);
      A.push(it); changed(true); setTimeout(draw, 80);
    }));
    $$('[data-g]', m).forEach(inp => inp.addEventListener('change', () => { const v = inp.value.trim() === '' ? '' : parseNum(inp.value); if (v === null || (v !== '' && v < 10)) { inp.classList.add('bad'); return; } S.segGeo[si] = Object.assign({ b: '', h: '' }, S.segGeo[si] || {}, { [inp.dataset.g]: v }); changed(true); }));
    $$('[data-na]', m).forEach(inp => inp.addEventListener('change', () => { const v = parseNum(inp.value); if (v === null || v <= 0 || v >= sg.L) { inp.classList.add('bad'); return; } S.nodes[+inp.dataset.na].a = v; changed(true); }));
    $$('[data-nh]', m).forEach(cb => cb.addEventListener('change', () => { S.nodes[+cb.dataset.nh].hinge = cb.checked; changed(true); }));
    $$('[data-nd]', m).forEach(b => b.addEventListener('click', () => { S.nodes.splice(+b.dataset.nd, 1); changed(true); setTimeout(draw, 80); }));
    $$('[data-nadd]', m).forEach(b => b.addEventListener('click', () => { S.nodes.push({ seg: si, a: Math.round(sg.L / 2 * 100) / 100, hinge: b.dataset.nadd === '2' }); changed(true); setTimeout(draw, 80); }));
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
  };
  draw(); m.style.display = 'flex';
}
function loadPopup(arr, i) {
  const it = arrByKey(arr)[i]; if (!it) return;
  const m = $('#modal');
  const draw = () => {
    const it2 = arrByKey(arr)[i]; if (!it2) { m.style.display = 'none'; return; }
    m.innerHTML = `<div class="dlg lpop"><h3>${idOf(arr, i)} – ${esc(it2.name || KIND_NAME[it2.kind])}</h3><div class="fields" id="lpItem">${itemHTML(arr, i, it2)}</div><div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
    bindItems($('#lpItem', m));
    $$('[data-del]', m).forEach(b => b.addEventListener('click', () => { m.style.display = 'none'; }));
    $$('#lpItem [data-padd], #lpItem [data-pdel], #lpItem select', m).forEach(b => b.addEventListener(b.tagName === 'SELECT' ? 'change' : 'click', () => setTimeout(draw, 80)));
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
  };
  draw(); m.style.display = 'flex';
}
