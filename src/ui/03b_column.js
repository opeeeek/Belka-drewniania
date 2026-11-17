/* --------------------------------------- okno: słup pod podporą i połączenie z fundamentem */
// rysunek podstawy słupa: widok z boku (płaszczyzna blachy) z łącznikami, blachą podstawy, kotwami i fundamentem
function colSVG(c, o) {
  o = o || {};
  const zone = c.a3 + (c.n - 1) * c.a1 + c.e1p + 120;           // pokazywana wysokość słupa [mm]
  const sc = Math.min(230 / Math.max(c.pa, c.h + 80), 260 / (zone + 160));
  const W = 330, H = Math.round((zone + 190) * sc) + 40, cx = 150, yF = H - 40 - 70 * sc;   // yF – wierzch fundamentu
  const tp = 15, yP = yF - tp * sc, yC = yP - c.gap * sc;      // blacha podstawy, czoło słupa
  const X = v => cx + v * sc, hh = c.h / 2;
  let s = svgOpen(W, H, 'class="colsvg"');
  s += `<rect x="${X(-c.pa / 2 - 60)}" y="${yF}" width="${(c.pa + 120) * sc}" height="${70 * sc + 30}" fill="#cfd4db" stroke="#5d6778"/>` + tx(X(c.pa / 2 + 50), yF + 16, esc(c.conc), { a: 'end', fs: 9.5, c: '#4a5466' });
  s += `<rect x="${X(-c.pa / 2)}" y="${yP}" width="${c.pa * sc}" height="${tp * sc}" fill="#9aa3b0" stroke="#39414f"/>`;
  const na = c.na, ax = na === 1 ? [0] : Array.from({ length: na }, (_, i) => -c.pa / 2 + 35 + (c.pa - 70) * i / (na - 1));
  ax.forEach(x => { s += `<line x1="${X(x)}" y1="${yP - 8}" x2="${X(x)}" y2="${yF + 60 * sc + 22}" stroke="#39414f" stroke-width="2"/><rect x="${X(x) - 5}" y="${yP - 7}" width="10" height="5" fill="#39414f"/>`; });
  s += `<rect x="${X(-hh)}" y="${yC - zone * sc}" width="${c.h * sc}" height="${zone * sc}" fill="${WOOD}" stroke="${WOODE}" stroke-width="1.3"/>`;
  s += `<path d="M${X(-hh)},${yC - zone * sc} l6,-6 l6,6 l6,-6 l6,6" fill="none" stroke="${WOODE}"/>`;
  const plH = c.a3 + (c.n - 1) * c.a1 + c.e1p + c.gap, plW = c.h - 20;
  if (c.type === 'slot') s += `<rect x="${X(-plW / 2)}" y="${yP - plH * sc}" width="${plW * sc}" height="${plH * sc}" fill="#9aa3b0" fill-opacity="0.35" stroke="#39414f" stroke-dasharray="4 2"/>`;
  else s += `<rect x="${X(-plW / 2)}" y="${yP - plH * sc}" width="${plW * sc}" height="${plH * sc}" fill="#9aa3b0" fill-opacity="0.55" stroke="#39414f"/>`;
  const xs = c.m === 1 ? [0] : Array.from({ length: c.m }, (_, j) => -(c.m - 1) * c.a2 / 2 + j * c.a2);
  for (let i = 0; i < c.n; i++) xs.forEach(x => { const y = yC - (c.a3 + i * c.a1) * sc; s += `<circle cx="${X(x)}" cy="${y}" r="${Math.max(2.5, c.d / 2 * sc)}" fill="#ffffff" stroke="#1b2230" stroke-width="1.2"/>`; });
  // wymiary
  s += dimV(X(hh) + 16, yC - c.a3 * sc, yC, `a₃=${fmt(c.a3, 0)}`, { right: true, fs: 9.5 });
  if (c.n > 1) s += dimV(X(hh) + 16, yC - (c.a3 + c.a1) * sc, yC - c.a3 * sc, `a₁=${fmt(c.a1, 0)}`, { right: true, fs: 9.5 });
  s += dimH(X(-hh), X(hh), yC - zone * sc - 14, `h = ${fmt(c.h, 0)}`, { fs: 9.5 });
  if (c.gap > 0) s += tx(X(-hh) - 4, yC + 2, `szczelina ${fmt(c.gap, 0)}`, { a: 'end', fs: 9, c: '#5b6576' });
  s += tx(X(-c.pa / 2), yF + 12, `blacha ${fmt(c.pa, 0)}×${fmt(c.pb, 0)}`, { a: 'start', fs: 9, c: '#4a5466' });
  // przekrój poziomy słupa przez łączniki
  const sx = 285, sy = yC - zone * sc * 0.55, s2 = Math.min(60 / c.b, 60 / c.h);
  s += `<rect x="${sx - c.b * s2 / 2}" y="${sy - c.h * s2 / 2}" width="${c.b * s2}" height="${c.h * s2}" fill="${WOOD}" stroke="${WOODE}"/>`;
  if (c.type === 'slot') s += `<rect x="${sx - c.ts * s2 / 2 - 1}" y="${sy - plW * s2 / 2}" width="${Math.max(2, c.ts * s2)}" height="${plW * s2}" fill="#5d6778"/>`;
  else [-1, 1].forEach(sd => { s += `<rect x="${sx + sd * c.b * s2 / 2 + (sd < 0 ? -Math.max(2, c.ts * s2) : 0)}" y="${sy - plW * s2 / 2}" width="${Math.max(2, c.ts * s2)}" height="${plW * s2}" fill="#5d6778"/>`; });
  xs.forEach(x => { s += `<line x1="${sx - c.b * s2 / 2 - 6}" y1="${sy + x * s2}" x2="${sx + c.b * s2 / 2 + 6}" y2="${sy + x * s2}" stroke="#1b2230" stroke-width="1.6"/>`; });
  s += tx(sx, sy + c.h * s2 / 2 + 12, `${fmt(c.b, 0)}×${fmt(c.h, 0)}`, { fs: 9, c: '#4a5466' });
  return s + '</svg>';
}
const COL_FIELDS = [
  ['sub', 'Słup'],
  ['b', 'Szerokość b (oś łączników)', 'mm'], ['h', 'Wymiar h (płaszczyzna blachy)', 'mm'], ['L', 'Wysokość słupa', 'm'],
  ['ky', 'β_{y} – długość wyboczeniowa l_{c} = β·H (w płaszczyźnie h)', ''], ['kz', 'β_{z} – w płaszczyźnie b', ''],
  ['e', 'Mimośród reakcji belki e (zginanie w płaszczyźnie h)', 'mm'], ['Hadd', 'Siła pozioma u podstawy H_{Ed} (np. wiatr, stężenia)', 'kN'],
  ['sub', 'Stopa stalowa i łączniki'],
  ['ts', 'Grubość blachy t_{s}', 'mm'], ['n', 'Łączniki w szeregu (wzdłuż włókien) n', ''], ['m', 'Szeregi łączników (w poprzek) m', ''],
  ['a1', 'Rozstaw wzdłuż włókien a_{1}', 'mm'], ['a2', 'Rozstaw w poprzek włókien a_{2}', 'mm'], ['a3', 'Odległość od czoła słupa a_{3,t}', 'mm'], ['a4', 'Odległość od krawędzi bocznej a_{4}', 'mm'], ['e1p', 'Odległość łącznika od krawędzi blachy e_{1}', 'mm'],
  ['sub', 'Fundament'],
  ['pa', 'Blacha podstawy – długość', 'mm'], ['pb', 'Blacha podstawy – szerokość', 'mm'], ['gap', 'Szczelina czoło słupa – beton', 'mm'],
  ['na', 'Liczba kotew', ''], ['NRd', 'Nośność kotwy na rozciąganie N_{Rd} (ETA)', 'kN'], ['VRd', 'Nośność kotwy na ścinanie V_{Rd} (ETA)', 'kN'],
];
function colPopup(k) {
  const md = model(), p = md.sups[k]; if (!p) return;
  while (S.supCfg.length <= k) S.supCfg.push({});
  S.supCfg[k].col = E.normCol(Object.assign({}, S.supCfg[k].col || {}, { on: true }));
  const m = $('#modal');
  const resHTML = () => {
    if (!R || !R.checks) return '';
    const cs = R.checks.filter(q => q.col === k);
    if (!cs.length) return '<p class="hint">Wyniki pojawią się po przeliczeniu.</p>';
    return `<table class="reqt"><tr><th>Sprawdzenie</th><th>η</th></tr>${cs.map(q => `<tr><td>${sym(q.name.replace(/ – słup pod podporą.*$/, ''))}<br><small style="color:var(--ink3)">${esc(q.combo || q.note || '')}</small></td><td class="${q.status === 'fail' ? 'no' : q.status === 'ok' ? 'yes' : ''}">${isFinite(q.ratio) ? fmt(q.ratio * 100, 0) + '%' : U.STL[q.status]}</td></tr>`).join('')}</table>`;
  };
  const draw = () => {
    const c = S.supCfg[k].col;
    const fam = curFam();
    const clsOpts = `<option value="" ${!c.cls ? 'selected' : ''}>jak belka (${esc(S.mat.cls === 'U' ? 'materiał własny' : S.mat.cls)})</option>` + E.MAT_LIST.map(q => `<option value="${q.id}" ${q.id === c.cls ? 'selected' : ''}>${esc(q.name)}</option>`).join('');
    let f = `<div class="row wide"><label>Materiał słupa</label><select data-cs="cls">${clsOpts}</select></div>`;
    COL_FIELDS.forEach(([key, l, u]) => {
      if (key === 'sub') { f += `<div class="lsub">${esc(l)}</div>`; if (l === 'Stopa stalowa i łączniki') f += `<div class="row wide"><label>Rodzaj stopy</label><select data-cs="type"><option value="slot" ${c.type === 'slot' ? 'selected' : ''}>blacha wpuszczana w nacięcie słupa</option><option value="side" ${c.type === 'side' ? 'selected' : ''}>dwie blachy zewnętrzne (stopa U)</option></select></div><div class="row wide"><label>Łączniki</label><select data-cs="fast"><option value="dowel" ${c.fast === 'dowel' ? 'selected' : ''}>sworznie (trzpienie)</option><option value="bolt" ${c.fast === 'bolt' ? 'selected' : ''}>śruby z podkładkami</option></select></div><div class="row wide"><label>Średnica ⌀ / gatunek</label><span style="display:flex;gap:4px"><select data-cs="d">${[8, 10, 12, 14, 16, 20, 24].map(v => `<option value="${v}" ${c.d === v ? 'selected' : ''}>⌀${v}</option>`).join('')}</select><select data-cs="grade">${Object.entries(E.FAST_STEEL).filter(([q]) => c.fast === 'bolt' ? /\./.test(q) : true).map(([q, v]) => `<option value="${q}" ${c.grade === q ? 'selected' : ''}>${esc(v.n)} (f<sub>u</sub> = ${v.fu})</option>`).join('')}</select></span></div><div class="row wide"><label>Stal blachy</label><select data-cs="steel">${Object.keys(E.PLATE_STEEL).map(q => `<option ${c.steel === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div>`; if (l === 'Fundament') f += `<div class="row wide"><label>Klasa betonu fundamentu</label><select data-cs="conc">${Object.keys(E.CONC_FCK).map(q => `<option ${c.conc === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div>`; return; }
      f += `<div class="row"><label>${sym(l)}</label><input class="txt" data-cn="${key}" value="${showNum(c[key])}" style="text-align:right"><span class="unit">${u}</span></div>`;
      if (key === 'Hadd') f += `<label class="chk sm"><input type="checkbox" data-cb="Hreac" ${c.Hreac ? 'checked' : ''}> dodaj reakcje poziome belki w tej podporze (H<sub>x</sub>, R<sub>z</sub>) – słup przenosi je na fundament</label>`;
    });
    m.innerHTML = `<div class="dlg fpop colwin"><h3>Słup i stopa – podpora ${esc(p.label)} (${esc(p.name)})</h3>
      <p class="hint">Słup przegubowy (stężony) obciążony reakcjami belki z każdej kombinacji SGN (z k<sub>mod</sub> tej kombinacji) i ciężarem własnym; podstawa – stopa stalowa z łącznikami trzpieniowymi i kotwami do fundamentu. Odrywanie (reakcje ujemne, np. ssanie wiatru) przenoszą łączniki i kotwy.</p>
      <div class="zcols"><div class="fields">${f}</div><div class="zprev">${colSVG(c)}<div id="colRes">${resHTML()}</div></div></div>
      <div class="dbtn"><button class="btn dng" data-off>Usuń słup</button><span style="flex:1"></span><button class="btn pri" data-close>Zamknij</button></div></div>`;
    m.style.display = 'flex';
    const apply = () => { S.supCfg[k].col = E.normCol(S.supCfg[k].col); changed(false); setTimeout(() => { const r = $('#colRes', m); if (r) r.innerHTML = resHTML(); const sv = $('.zprev svg', m); if (sv) sv.outerHTML = colSVG(S.supCfg[k].col); }, 150); };
    $$('[data-cn]', m).forEach(inp => inp.addEventListener('change', () => { const v = parseNum(inp.value); if (v === null || v < 0) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); S.supCfg[k].col[inp.dataset.cn] = v; apply(); }));
    $$('[data-cs]', m).forEach(sel => sel.addEventListener('change', () => { const f2 = sel.dataset.cs; S.supCfg[k].col[f2] = f2 === 'd' ? +sel.value : sel.value; if (f2 === 'fast') S.supCfg[k].col.grade = sel.value === 'bolt' ? '4.6' : 'S235'; apply(); if (f2 === 'fast' || f2 === 'type') setTimeout(draw, 160); }));
    $$('[data-cb]', m).forEach(cb => cb.addEventListener('change', () => { S.supCfg[k].col[cb.dataset.cb] = cb.checked; apply(); }));
    $('[data-off]', m).onclick = () => { S.supCfg[k].col.on = false; m.style.display = 'none'; changed(true); };
    $('[data-close]', m).onclick = () => { m.style.display = 'none'; changed(true); };
  };
  changed(false);
  setTimeout(draw, 120);
}
