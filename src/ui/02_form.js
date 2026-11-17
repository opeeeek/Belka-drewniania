/* ------------------------------------------------------- render formularza */
function optionsOf(f) { return typeof f.o === 'function' ? f.o(S) : f.o; }
const exDetails = (ex, t) => ex ? `<details class="exh"><summary>${t || 'Objaśnienie'}</summary><div>${ex}</div></details>` : '';
function hintHTML(f) {
  const h = f.h(S); if (!h) return '';
  return f.ex ? exDetails(h, f.exT) : h;
}
function fieldsHTML(items, gid) {
  let html = '';
  items.forEach((f, i) => {
    if (f.show && !f.show(S)) return;
    const id = `f_${gid}_${i}`;
    if (f.t === 'hint') { const h = hintHTML(f); html += `<div class="hint" data-hint="${gid}_${i}"${h ? '' : ' style="display:none"'}>${h}</div>`; return; }
    if (f.t === 'sub') { html += `<div class="lsub">${sym(f.l)}</div>`; return; }
    if (f.t === 'html') { html += `<div data-html="${gid}_${i}">${f.h(S)}</div>`; return; }
    if (f.t === 'sel') {
      const v = getP(S, f.k); const opts = optionsOf(f);
      const sel = opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('');
      html += `<div class="row ${f.wide ? 'wide' : ''}"><label for="${id}">${sym(f.l)}</label><select id="${id}" data-k="${f.k}" data-num="${f.num ? 1 : ''}" data-re="${f.re ? 1 : ''}">${sel}</select>${f.wide ? '' : '<span></span>'}</div>`;
    } else if (f.t === 'num') {
      const v = getP(S, f.k);
      const ph = typeof f.ph === 'function' ? f.ph(S) : f.ph;
      const list = typeof f.list === 'function' ? f.list(S) : (f.list || []);
      html += `<div class="row"><label for="${id}">${sym(f.l)}</label><div class="combo"><input id="${id}" data-k="${f.k}" value="${esc(showNum(v))}" ${ph ? `placeholder="${esc(ph)}"` : ''} data-opt="${f.opt ? 1 : ''}" ${f.auto ? 'data-auto="1"' : ''} data-min="${f.min !== undefined ? f.min : ''}" data-max="${f.max !== undefined ? f.max : ''}" data-re="${f.re ? 1 : ''}" data-ph="${typeof f.ph === 'function' ? gid + '_' + i : ''}" autocomplete="off" spellcheck="false"><button tabindex="-1" data-list="${esc(JSON.stringify(list))}" aria-label="lista wartości">▾</button></div><span class="unit">${esc(f.u || '')}</span></div>`;
    } else if (f.t === 'chk') {
      html += `<label class="chk"><input type="checkbox" data-k="${f.k}" data-re="${f.re ? 1 : ''}" ${getP(S, f.k) ? 'checked' : ''}><span>${sym(f.l)}</span></label>`;
    } else if (f.t === 'cont') {
      html += contHTML();
    } else if (f.t === 'list') {
      html += renderList(f.kind);
    }
  });
  return html;
}
// belka ciągła: liczba przęseł, rozpiętości, wsporniki
function contHTML() {
  const C = S.cont, n = C.spans.length;
  let h = `<div class="row wide"><label>Liczba przęseł</label><select data-cn="1">${rng(1, 10, 1).map(v => `<option value="${v}" ${v === n ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`;
  h += `<table class="sttab"><tr><th>Przęsło</th><th>L [m]</th><th>b×h (puste – jak ogólnie)</th></tr>`;
  C.spans.forEach((L, i) => {
    const si = (C.cantL > 0 ? 1 : 0) + i, g = S.segGeo[si] || {};
    h += `<tr><td>${i + 1}</td><td><input class="txt" data-span="${i}" value="${showNum(L)}" style="width:70px;text-align:right"></td><td><input class="txt sm" data-sg="${si}.b" value="${showNum(g.b || '')}" placeholder="${S.geom.b}" style="width:58px;text-align:right">×<input class="txt sm" data-sg="${si}.h" value="${showNum(g.h || '')}" placeholder="${S.geom.h}" style="width:58px;text-align:right"></td></tr>`;
  });
  h += `</table>`;
  h += `<div class="row"><label>Wspornik lewy l<sub>w</sub></label><div class="combo"><input data-k="cont.cantL" value="${showNum(C.cantL)}" data-min="0" data-re="1" autocomplete="off"><button tabindex="-1" data-list="${esc(JSON.stringify([0, 0.5, 0.8, 1.0, 1.2, 1.5, 2.0]))}">▾</button></div><span class="unit">m</span></div>`;
  h += `<div class="row"><label>Wspornik prawy l<sub>w</sub></label><div class="combo"><input data-k="cont.cantR" value="${showNum(C.cantR)}" data-min="0" data-re="1" autocomplete="off"><button tabindex="-1" data-list="${esc(JSON.stringify([0, 0.5, 0.8, 1.0, 1.2, 1.5, 2.0]))}">▾</button></div><span class="unit">m</span></div>`;
  return h;
}
// dodanie / usunięcie wspornika: przenumerowanie odcinków w obciążeniach, węzłach i przekrojach
function cantShift(side, add) {
  const md = model(), nSeg = md.segs.length;
  const items = [...S.loads.perm, ...S.loads.var, ...S.loads.acc];
  if (!add) {
    const gone = it => side === 'L' ? it.span === 1 : it.span === nSeg;
    ['perm', 'var', 'acc'].forEach(k => { const a = arrByKey(k); for (let i = a.length - 1; i >= 0; i--) if (gone(a[i]) && !(a[i].spans && a[i].spans.length)) a.splice(i, 1); });
    S.nodes = S.nodes.filter(q => side === 'L' ? q.seg !== 0 : q.seg !== nSeg - 1);
    if (side === 'L') { items.forEach(it => { if (it.span > 0) it.span--; if (it.spans) it.spans = it.spans.map(v => v - 1).filter(v => v > 0); }); S.nodes.forEach(q => q.seg--); const g = {}; Object.keys(S.segGeo).forEach(k => { if (+k > 0) g[+k - 1] = S.segGeo[k]; }); S.segGeo = g; }
  } else if (side === 'L') { items.forEach(it => { if (it.span > 0) it.span++; if (it.spans) it.spans = it.spans.map(v => v + 1); }); S.nodes.forEach(q => q.seg++); const g = {}; Object.keys(S.segGeo).forEach(k => { g[+k + 1] = S.segGeo[k]; }); S.segGeo = g; }
}
function renderInputs() {
  renderAutoBar();
  const host = $('#inputs'), pane = $('#p-data .dleft'), st = pane ? pane.scrollTop : 0;
  const openState = {}; $$('details.grp', host).forEach(d => openState[d.dataset.id] = d.open);
  const moreState = {}; $$('details.lmore', host).forEach(d => { const it = d.closest('[data-item]'); if (it) moreState[it.dataset.item] = d.open; });
  let html = '';
  GROUPS.forEach(G => {
    if (G.show && !G.show(S)) return;
    const open = openState[G.id] !== undefined ? openState[G.id] : !G.closed;
    html += `<details class="grp" data-id="${G.id}" ${open ? 'open' : ''}><summary>${esc(G.title)}</summary><div class="fields">${fieldsHTML(G.items, G.id)}</div></details>`;
  });
  host.innerHTML = html;
  $$('details.lmore', host).forEach(d => { const it = d.closest('[data-item]'); if (it && moreState[it.dataset.item] !== undefined) d.open = moreState[it.dataset.item]; });
  if (pane) pane.scrollTop = st;
  bindInputs(host);
}
function refreshHints() {
  GROUPS.forEach(G => G.items.forEach((f, i) => {
    const key = `${G.id}_${i}`;
    if (f.t === 'hint') { const el = $(`[data-hint="${key}"]`); if (!el) return; const open = !!el.querySelector('details.exh[open]'), h = hintHTML(f); el.innerHTML = h; el.style.display = h ? '' : 'none'; if (open) { const d = el.querySelector('details.exh'); if (d) d.open = true; } }
    if (f.t === 'num' && typeof f.ph === 'function') { const el = $(`[data-ph="${key}"]`); if (el) el.placeholder = f.ph(S); }
  }));
  $$('#inputs .litem').forEach(el => { const [arr, i] = el.dataset.item.split('.'); const lid = el.querySelector('.lid'); if (lid) lid.textContent = idOf(arr, +i); });
}
function bindInputs(host) {
  host = host || $('#inputs');
  $$('select[data-k]', host).forEach(el => el.addEventListener('change', () => {
    const k = el.dataset.k; let v = el.value;
    if (el.dataset.num) v = parseNum(v);
    if (k === 'scheme' && v !== S.scheme) {
      // nowy schemat – domyślne podpory; obciążenia przypisane do odcinków → cała belka
      S.supCfg = []; S.nodes = []; S.segGeo = {};
      [...S.loads.perm, ...S.loads.var, ...S.loads.acc].forEach(it => { it.span = 0; it.spans = []; });
      if (v === 'cont' && S.scheme === 'ss') S.cont.spans = [S.geom.L, S.geom.L];
      if (v !== 'cont' && S.scheme === 'cont') S.geom.L = S.cont.spans[0];
      if (v === 'cant' && S.scheme !== 'cant') S.geom.L = Math.min(S.geom.L, 2.0);
    }
    setP(S, k, v);
    changed(el.dataset.re);
  }));
  $$('input[type=checkbox][data-k]', host).forEach(el => el.addEventListener('change', () => { setP(S, el.dataset.k, el.checked); changed(el.dataset.re || true); }));
  $$('.combo input[data-k]', host).forEach(el => {
    el.addEventListener('input', () => numInput(el, false));
    el.addEventListener('change', () => numInput(el, true));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { numInput(el, true); el.select(); } });
  });
  $$('.combo button', host).forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); openList(b); }));
  const cn = $('select[data-cn]', host);
  if (cn) cn.addEventListener('change', () => {
    const n = +cn.value, C = S.cont;
    while (C.spans.length < n) C.spans.push(C.spans[C.spans.length - 1] || 4);
    if (C.spans.length > n) {
      const first = (C.cantL > 0 ? 1 : 0) + n;    // pierwszy usuwany odcinek (indeks)
      [...S.loads.perm, ...S.loads.var, ...S.loads.acc].forEach(it => { if (it.span > first) { it.span = 0; it.spans = []; } });
      S.nodes = S.nodes.filter(q => q.seg < first); Object.keys(S.segGeo).forEach(k => { if (+k >= first) delete S.segGeo[k]; });
      C.spans.length = n; S.supCfg = S.supCfg.slice(0, n + 1);
    }
    changed(true);
  });
  $$('input[data-span]', host).forEach(el => el.addEventListener('change', () => { const v = parseNum(el.value); if (v === null || v < 0.2) { el.classList.add('bad'); return; } el.classList.remove('bad'); S.cont.spans[+el.dataset.span] = v; changed(true); }));
  $$('input[data-sg]', host).forEach(el => el.addEventListener('change', () => {
    const [si, f] = el.dataset.sg.split('.'), v = el.value.trim() === '' ? '' : parseNum(el.value);
    if (v === null || (v !== '' && v < 10)) { el.classList.add('bad'); return; }
    el.classList.remove('bad'); S.segGeo[si] = Object.assign({ b: '', h: '' }, S.segGeo[si] || {}, { [f]: v }); changed(true);
  }));
  bindMat(host); bindDefl(host); bindItems(host);
}
function numInput(el, final) {
  const raw = el.value.trim();
  const opt = !!el.dataset.opt;
  const min = el.dataset.min !== '' ? parseFloat(el.dataset.min) : null, max = el.dataset.max ? parseFloat(el.dataset.max) : null;
  if (raw === '' && opt) { el.classList.remove('bad'); setP(S, el.dataset.k, ''); changed(final && !!el.dataset.re); return; }
  if (el.dataset.auto && /^auto/i.test(raw)) { el.classList.remove('bad'); setP(S, el.dataset.k, 'auto'); if (final) el.value = 'auto'; changed(false); return; }
  const v = parseNum(raw);
  const bad = v === null || (min !== null && v < min) || (max !== null && v > max);
  el.classList.toggle('bad', bad);
  if (bad) return;
  const k = el.dataset.k;
  if ((k === 'cont.cantL' || k === 'cont.cantR')) {
    const side = k.slice(-1), was = S.cont['cant' + side] > 0;
    if (was !== (v > 0)) { if (!final) return; cantShift(side, v > 0); }
  }
  setP(S, k, v);
  if (final) el.value = showNum(v);
  changed(final && !!el.dataset.re);
}
// lista rozwijana wartości typowych
let popFor = null;
function openList(btn) {
  const pop = $('#pop'); const inp = btn.previousElementSibling;
  if (popFor === inp && pop.style.display === 'block') { closeList(); return; }
  const list = JSON.parse(btn.dataset.list || '[]');
  pop.innerHTML = list.map(v => `<div data-v="${esc(String(v))}" class="${String(v) === String(parseNum(inp.value) ?? '') ? 'cur' : ''}">${v === '' ? esc(inp.placeholder || '—') : esc(showNum(v))}</div>`).join('');
  const r = inp.parentElement.getBoundingClientRect();
  pop.style.display = 'block'; pop.style.minWidth = r.width + 'px';
  const ph = Math.min(260, pop.scrollHeight);
  const below = window.innerHeight - r.bottom > ph + 6;
  pop.style.left = r.left + 'px'; pop.style.top = (below ? r.bottom + 2 : r.top - ph - 2) + 'px';
  popFor = inp;
  const cur = $('.cur', pop); if (cur) cur.scrollIntoView({ block: 'center' });
  $$('div', pop).forEach(d => d.addEventListener('mousedown', e => {
    e.preventDefault(); inp.value = showNum(d.dataset.v); numInput(inp, true); closeList(); inp.focus();
  }));
}
function closeList() { $('#pop').style.display = 'none'; popFor = null; }
document.addEventListener('mousedown', e => { if (!e.target.closest('#pop') && !e.target.closest('.combo button')) closeList(); });
window.addEventListener('resize', closeList);

/* -------------------------------------------- automatyczny dobór (pasek nad danymi) */
function renderAutoBar() {
  const el = $('#autobar'); if (!el) return;
  const eta = S.design.eta || 100, cat = catNow();
  el.innerHTML = `<div class="autobar"><button class="btn sm" id="adSec" title="Najmniejszy przekrój b×h z typowych wymiarów handlowych (${esc(cat.desc)}) przy obecnej klasie materiału – wszystkie warunki z Podsumowania spełnione przy wytężeniu ≤ η">⚙ Dobierz przekrój</button>
    <button class="btn sm" id="adCls" title="Najniższa klasa wytrzymałości tej samej rodziny materiału, przy której obecny przekrój spełnia wszystkie warunki">⚙ Dobierz klasę</button>
    <button class="btn sm pri" id="adAll" title="Przekrój i klasa: dla każdej klasy handlowej (${esc((E.TRADE[curFam()] || []).map(q => q[0]).join(', '))}) najmniejszy przekrój; wybór – najmniejszy koszt (objętość × współczynnik ceny klasy)">⚙ Dobierz wszystko</button>
    <label class="chk sm" title="Dobór tylko wysokości h przy obecnej szerokości b"><input type="checkbox" id="adFixB" ${S.design.fixB ? 'checked' : ''}> stała szerokość b</label>
    <label class="adeta" title="Wymagane wytężenie: E_d / R_d ≤ η we wszystkich warunkach (SGN, SGU, pożar)">wytężenie ≤ <input class="txt sm" id="adEta" value="${eta}" inputmode="numeric" autocomplete="off" spellcheck="false"> %</label></div>`;
  const inp = $('#adEta', el);
  inp.addEventListener('change', () => { const v = parseNum(inp.value); const ok = v !== null && v >= 50 && v <= 100; inp.classList.toggle('bad', !ok); if (ok) { S.design.eta = Math.round(v); inp.value = S.design.eta; changed(false); } else toast('Wytężenie docelowe: od 50 do 100%.'); });
  $('#adFixB', el).onchange = e => { S.design.fixB = e.target.checked; changed(false); };
  $('#adSec', el).onclick = () => runDesign('sec');
  $('#adCls', el).onclick = () => runDesign('cls');
  $('#adAll', el).onclick = () => runDesign('all');
}
function runDesign(kind, after) {
  toast('Trwa dobór…', 8000);
  setTimeout(() => {
    const t0 = Date.now();
    let r;
    try { r = kind === 'sec' ? E.designSection(S) : kind === 'cls' ? E.designClass(S) : E.designAll(S); }
    catch (e) { console.error(e); toast('Błąd doboru: ' + e.message); return; }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (!r.ok) {
      const why = kind === 'cls' ? (r.why || 'brak klasy spełniającej warunki') : `w katalogu (${catNow().desc}) brak przekroju spełniającego wszystkie warunki${S.design.fixB ? ' przy stałej szerokości b' : ''} – zmień materiał (np. drewno klejone), schemat lub zwiększ η`;
      showMsg('Dobór nie powiódł się', `<p>${esc(why)}.</p>`);
      return;
    }
    const before = `${fmt(S.geom.b, 0)}×${fmt(S.geom.h, 0)} mm, ${esc(S.mat.cls === 'U' ? 'materiał własny' : S.mat.cls)}`;
    if (r.b) { S.geom.b = r.b; S.geom.h = r.h; S.segGeo = {}; }
    if (r.cls && r.cls !== 'U') { S.mat.cls = r.cls; S.mat.user = null; }
    changed(true);
    const after = `${fmt(S.geom.b, 0)}×${fmt(S.geom.h, 0)} mm, ${esc(S.mat.cls === 'U' ? 'materiał własny' : S.mat.cls)}`;
    let msg = `Dobrano (${secs} s): <b>${after}</b> (było: ${before}); największe wytężenie η = <b>${fmt(r.eta * 100, 0)}%</b> ≤ ${S.design.eta}%.`;
    if (r.list && r.list.length > 1) msg += ` <br><span class="hint">Warianty: ${r.list.map(q => `${esc(q.cls)} ${q.b}×${q.h} (η = ${fmt(q.eta * 100, 0)}%)`).join(' · ')}</span>`;
    toast(msg.replace(/<[^>]+>/g, ''), 5200);
    if (after) after();
  }, 30);
}
function showMsg(title, body) {
  const m = $('#modal');
  m.innerHTML = `<div class="dlg sm"><h3>${esc(title)}</h3>${body}<div class="dbtn"><button class="btn pri" data-close>OK</button></div></div>`;
  m.style.display = 'flex'; $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
}

/* ----------------------------------------------------------- obliczenia */
let tmr = null, prevStat = null;
function changed(rerender) {
  dirty = true; updateTitle();
  if (rerender) renderInputs();
  clearTimeout(tmr); tmr = setTimeout(recalc, 60);
  autosave();
}
function recalc() {
  try { R = E.calc(S); } catch (e) { R = { errors: ['Błąd obliczeń: ' + e.message], checks: [], S }; console.error(e); }
  U.R = R; U.S = S;
  refreshHints();
  $$('[data-html]').forEach(el => { const [gid, i] = el.dataset.html.split('_'); const G = GROUPS.find(q => q.id === gid); const f = G && G.items[+i]; if (f && f.h && gid !== 'mat' && gid !== 'sls') { el.innerHTML = f.h(S); } });
  syncTicks();
  renderStatus();
  renderDsum();
  rendered = {};
  renderActive();
}
// warunek, który przestał być spełniony, jest odznaczany; spełniony ponownie – zaznaczany (jeśli był)
function syncTicks() {
  if (!R || !R.checks) return;
  const T = S.meta.ticks || (S.meta.ticks = {});
  const st = {}; R.checks.forEach(c => { st[c.id] = c.status; });
  if (prevStat) Object.keys(st).forEach(k => { if (prevStat[k] && prevStat[k] !== st[k]) { if (st[k] === 'fail') { if (T[k]) T['~' + k] = 1; delete T[k]; } else if (T['~' + k]) { T[k] = true; delete T['~' + k]; } } });
  prevStat = st;
}
function renderStatus() {
  const el = $('#status');
  const set = (cls, txt) => { el.className = cls; el.textContent = txt; };
  if (!R || (R.errors && R.errors.length)) { set('fail', '✖ Błąd danych'); return; }
  const fails = R.checks.filter(c => c.status === 'fail').length, warns = R.checks.filter(c => c.status === 'warn').length;
  if (fails) set('fail', `✖ Niespełnione warunki: ${fails}`);
  else if (warns) set('warn', `✔ Nośność OK · uwagi: ${warns} · η = ${fmt(R.maxEta * 100, 0)}%`);
  else set('ok', `✔ Wszystkie warunki spełnione · η = ${fmt(R.maxEta * 100, 0)}%`);
}
const DSUM = [['SGN', 'zginanie', x => /^SGN – zginanie/.test(x.grp)], ['SGN', 'ścinanie', x => /^SGN – ścinanie/.test(x.grp)], ['SGN', 'docisk', x => /^SGN – docisk/.test(x.grp)], ['SGN', 'stateczność', x => /^SGN – stateczność/.test(x.grp)], ['SGU', 'ugięcia', x => /ugięcia/.test(x.grp)], ['SGU', 'drgania', x => /drgania/.test(x.grp)], ['', 'pożar', x => /^Pożar/.test(x.grp)], ['', 'konstrukcja', x => /^Konstrukcja/.test(x.grp)]];
function dsumHTML() {
  if (!R || !R.checks) return '';
  if (R.errors && R.errors.length) return `<div class="dsum"><span class="dsb fail">✖ błąd danych – wyniki niedostępne</span></div>`;
  let h = '<div class="dsum">';
  DSUM.forEach(([a, l, pr], gi) => {
    const cs = R.checks.filter(pr).filter(x => x.status !== 'info'); if (!cs.length) return;
    const st = cs.some(x => x.status === 'fail') ? 'fail' : cs.some(x => x.status === 'warn') ? 'warn' : 'ok';
    const rv = x => isFinite(x.ratio) ? x.ratio : -1, w = cs.reduce((p, q) => (rv(q) > rv(p) ? q : p));
    const bad = cs.filter(x => x.status === 'fail').length;
    h += `<button class="dsb ${st}" data-dg="${gi}" title="${esc(w.name.replace(/_\{([^}]*)\}/g, '$1'))}${isFinite(w.ratio) ? ' – ' + fmt(w.ratio * 100, 0) + '%' : ''} · kliknij, aby przejść do Podsumowania"><span class="ic">${st === 'fail' ? '✖' : st === 'warn' ? '!' : '✔'}</span>${a ? `<b>${a}</b> ` : ''}${l}<span class="pc">${isFinite(w.ratio) ? fmt(w.ratio * 100, 0) + '%' : ''}</span>${bad ? `<span class="nb">${bad}</span>` : ''}</button>`;
  });
  return h + '</div>';
}
function bindDsum(el) {
  $$('[data-dg]', el).forEach(b => b.addEventListener('click', () => {
    const pr = DSUM[+b.dataset.dg][2], c = R.checks;
    let i = c.findIndex(x => pr(x) && x.status === 'fail'); if (i < 0) i = c.findIndex(x => pr(x) && x.status === 'warn');
    if (i < 0) { let best = -1; c.forEach((x, j) => { if (pr(x) && isFinite(x.ratio) && (best < 0 || x.ratio > c[best].ratio)) best = j; }); i = best; }
    U.selectTab('sum'); setTimeout(() => { const tr = $(`#p-sum tr[data-ci="${i}"]`); if (tr) { tr.scrollIntoView({ block: 'center' }); flash(tr); } }, 60);
  }));
}
function renderDsum() {
  const el = $('#dsum'); if (!el) return;
  el.innerHTML = dsumHTML(); bindDsum(el);
  $$('.dsumx').forEach(x => { x.innerHTML = dsumHTML(); bindDsum(x); });
}
function flash(el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2200); }
function errBox() { return `<div class="msgs">${((R && R.errors) || []).map(e => `<div class="msg err">${esc(e)}</div>`).join('')}</div>`; }
function renderActive() {
  const tab = ($('.tabs button.on') || {}).dataset ? $('.tabs button.on').dataset.tab : 'data';
  if (tab === 'data') { renderDataSide(); return; }
  if (rendered[tab]) return;
  rendered[tab] = true;
  const el = $('#p-' + tab);
  const ok = R && !(R.errors && R.errors.length);
  const dx = `<div class="dsumx">${dsumHTML()}</div>`;
  try {
    if (tab === 'sum') { if (ok) renderSummary(el); else el.innerHTML = errBox(); }
    else if (tab === 'sec') { el.innerHTML = dx + (ok ? '<div id="secBody"></div>' : errBox()); if (ok) renderSection($('#secBody', el)); }
    else if (tab === 'chart') { el.innerHTML = dx + (ok ? '<div id="chartBody"></div>' : errBox()); if (ok) renderCharts($('#chartBody', el)); }
    else if (tab === 'elev') { el.innerHTML = dx + (ok ? '<div id="elevBody"></div>' : errBox()); if (ok) renderElevation($('#elevBody', el)); }
    else if (tab === 'report') renderReport(el);
    $$('.dsumx', el).forEach(bindDsum);
  } catch (e) { console.error(e); el.innerHTML = `<div class="msg err">Błąd wyświetlania: ${esc(e.message)}</div>`; }
}
