/* -------------------------------------------------------------- raport */
const wrapPrint = html => `<table class="pwrap"><thead><tr><td><div class="psp"></div></td></tr></thead><tfoot><tr><td><div class="psp"></div></td></tr></tfoot><tbody><tr><td class="pbody">${html}</td></tr></tbody></table>`;
const repMode = () => (S.meta.repMode === 'static' ? 'static' : 'full');
const repView = () => (S.meta.repMode === 'own' ? 'own' : repMode());
const repBuild = () => { if (!window.BDR) return ''; return repMode() === 'static' ? window.BDR.buildStatic(R, S) : window.BDR.build(R, S); };
function renderReport(el) {
  const v = repView();
  const tools = `<div class="rtools"><div class="segsw">${[['full', 'Raport pełny'], ['static', 'Statyka'], ['own', 'Raport własny']].map(([k, l]) => `<button data-rm="${k}" class="${v === k ? 'on' : ''}">${l}</button>`).join('')}</div><span class="sp" style="flex:1"></span>
    <button class="btn" id="rHtml">Zapisz raport HTML…</button><button class="btn" id="rOdt">Zapisz .odt (edytowalny)…</button>${ART ? '' : '<button class="btn pri" id="rPrint">Drukuj / zapisz PDF</button>'}</div>`;
  if (v === 'own') { renderOwn(el, tools); }
  else {
    let body;
    if (!R || (R.errors && R.errors.length)) body = errBox();
    else { try { body = repBuild(); } catch (e) { console.error(e); body = `<div class="msg err">Błąd tworzenia raportu: ${esc(e.message)}</div>`; } }
    el.innerHTML = tools + `<div id="report">${wrapPrint(body)}</div>`;
  }
  $$('[data-rm]', el).forEach(b => b.addEventListener('click', () => { S.meta.repMode = b.dataset.rm; dirty = true; updateTitle(); autosave(); rendered.report = false; renderActive(); }));
  $('#rHtml', el).onclick = exportHTML; $('#rOdt', el).onclick = exportODT;
  const pr = $('#rPrint', el); if (pr) pr.onclick = doPrint;
}
/* raport własny – edytowalna kopia raportu zapisywana w projekcie */
function cleanHTML(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  d.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /^javascript:/i.test(a.value)) n.removeAttribute(a.name); }));
  return d.innerHTML;
}
function renderOwn(el, tools) {
  const html = S.meta.ownOn ? cleanHTML(S.meta.own || '') : '';
  el.innerHTML = tools + `<div class="owntools"><span class="grp"><button data-cmd="bold" title="Pogrubienie"><b>B</b></button><button data-cmd="italic" title="Kursywa"><i>I</i></button><button data-cmd="subscript" title="Indeks dolny">x₂</button><button data-cmd="superscript" title="Indeks górny">x²</button></span>
    <span class="grp"><button data-blk="h2">Nagłówek</button><button data-blk="p">Akapit</button><button data-cmd="insertUnorderedList">• Lista</button></span>
    <button class="btn sm" id="ownIns">Wstaw raport obliczeń</button><button class="btn sm" id="ownStat">Wstaw statykę</button><button class="btn sm dng" id="ownClr">Wyczyść</button><span class="ownstate" id="ownSt">${S.meta.ownOn ? 'zapisywany w projekcie' : 'pusty'}</span></div>
    <div id="ownrep" contenteditable="true" spellcheck="true">${html}</div>`;
  const ed = $('#ownrep', el);
  let t = null;
  ed.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.meta.own = cleanHTML(ed.innerHTML); S.meta.ownOn = true; dirty = true; updateTitle(); autosave(); $('#ownSt', el).textContent = 'zapisywany w projekcie'; }, 400); });
  $$('[data-cmd]', el).forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); document.execCommand(b.dataset.cmd); }));
  $$('[data-blk]', el).forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); document.execCommand('formatBlock', false, b.dataset.blk); }));
  const ins = h => { ed.focus(); document.execCommand('insertHTML', false, h); ed.dispatchEvent(new Event('input')); };
  $('#ownIns', el).onclick = () => { if (R && !(R.errors && R.errors.length)) ins(window.BDR.build(R, S)); };
  $('#ownStat', el).onclick = () => { if (R && !(R.errors && R.errors.length)) ins(window.BDR.buildStatic(R, S)); };
  $('#ownClr', el).onclick = async () => { if (await ask('Wyczyścić raport własny?', 'Wyczyść', true)) { S.meta.own = ''; S.meta.ownOn = false; ed.innerHTML = ''; dirty = true; autosave(); } };
}
function ownHTML() { const ed = $('#ownrep'); return ed ? ed.innerHTML : cleanHTML(S.meta.own || ''); }

/* ------------------------------------------------- kolory rysunków (motyw) */
const SVCOL = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function themeSvgIn(root) {
  root.querySelectorAll('svg [fill], svg [stroke]').forEach(el => {
    ['fill', 'stroke'].forEach(a => {
      const v = el.getAttribute(a); if (!v || !SVCOL.test(v)) return;
      let h = v.slice(1).toLowerCase(); if (h.length === 3) h = h.replace(/./g, c => c + c);
      el.style.setProperty(a, `var(--sv-${h}, #${h})`);
    });
  });
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
  if (n.nodeType !== 1) return;
  if (n.tagName.toLowerCase() === 'svg') themeSvgIn(n.parentNode || n);
  else if (n.querySelector('svg')) themeSvgIn(n);
}))).observe(document.documentElement, { childList: true, subtree: true });

/* ------------------------------------------------------------- host / pliki */
const ART = !!window.__ARTIFACT;
const pending = {}; let reqId = 0;
window.__hostReply = (id, res) => { const p = pending[id]; if (p) { delete pending[id]; p(res); } };
function hostCall(op, args) {
  return new Promise(res => {
    const id = ++reqId; pending[id] = res;
    try { window.hostRequest(JSON.stringify(Object.assign({ id, op }, args))); } catch (e) { delete pending[id]; res({ ok: false, err: String(e) }); }
  });
}
const inHost = () => typeof window.hostRequest === 'function';
function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => t.style.display = 'none', ms || 2600); }
function baseName(p) { return (p || '').split(/[\\/]/).pop(); }
const safeName = ext => (S.meta.name || 'belka').replace(/[\\/:*?"<>|]+/g, '_').trim() + ext;
function updateTitle() {
  const fn = filePath ? baseName(filePath) : 'bez nazwy';
  $('#fileName').textContent = (dirty ? '● ' : '') + fn;
  const t = `BelkaDR – ${S.meta.name || 'belka'} [${fn}${dirty ? ' *' : ''}]`;
  document.title = t;
  if (typeof window.hostTitle === 'function') { try { window.hostTitle(t); } catch (e) { /* */ } }
}
// kilka belek w projekcie (zakładki nad schematem)
const beamsSync = () => { if (!BEAMS) BEAMS = [S]; BEAMS[curB] = S; };
const beamsOut = () => { beamsSync(); return BEAMS.length > 1 ? { beams: BEAMS.map(b => b), cur: curB } : {}; };
function beamsIn(o, st) {
  if (o && Array.isArray(o.beams) && o.beams.length > 1) { BEAMS = o.beams.slice(0, 20).map(b => E.normalize(b)); curB = Math.max(0, Math.min(BEAMS.length - 1, +o.cur || 0)); return BEAMS[curB]; }
  BEAMS = null; curB = 0; return st;
}
function switchBeam(i) {
  beamsSync(); if (i === curB || !BEAMS[i]) return;
  curB = i; S = BEAMS[i]; prevStat = null; $('#projName').value = S.meta.name || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave();
}
function addBeam() {
  beamsSync(); if (BEAMS.length >= 20) { toast('Maksymalnie 20 belek w projekcie.'); return; }
  const n = E.defaultState(); ['mat', 'env', 'coef', 'sls', 'fire', 'loads'].forEach(k => { n[k] = JSON.parse(JSON.stringify(S[k])); });
  n.meta.name = `Belka D-${BEAMS.length + 1}`;
  BEAMS.push(E.normalize(n)); dirty = true; switchBeam(BEAMS.length - 1);
}
function copyBeam() {
  beamsSync(); if (BEAMS.length >= 20) { toast('Maksymalnie 20 belek w projekcie.'); return; }
  const n = JSON.parse(JSON.stringify(S)); n.meta.name = (S.meta.name || 'Belka') + ' (kopia)';
  BEAMS.push(E.normalize(n)); dirty = true; switchBeam(BEAMS.length - 1);
}
function delBeam(i) {
  beamsSync(); if (BEAMS.length < 2) return;
  BEAMS.splice(i, 1); if (i < curB) curB--; curB = Math.min(curB, BEAMS.length - 1); S = BEAMS[curB]; dirty = true;
  $('#projName').value = S.meta.name || ''; prevStat = null; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave();
}
function beamTabsHTML() {
  beamsSync();
  return `<div class="beamtabs" role="tablist" aria-label="Belki w projekcie">${BEAMS.map((b, i) => `<button class="btab ${i === curB ? 'on' : ''}" data-btab="${i}" title="${esc(b.meta.name || 'Belka ' + (i + 1))} – kliknij, aby przełączyć; dwuklik – zmiana nazwy">${i + 1}<span>${esc((b.meta.name || '').slice(0, 16))}</span>${i === curB && BEAMS.length > 1 ? `<i data-bdel="${i}" title="Usuń tę belkę">×</i>` : ''}</button>`).join('')}<button class="btab add" data-badd="1" title="Dodaj belkę do projektu (te same materiały, obciążenia i ustawienia)">+</button><button class="btab add" data-bcopy="1" title="Kopiuj bieżącą belkę">⧉</button></div>`;
}
document.addEventListener('click', async e => {
  const d = e.target.closest && e.target.closest('[data-bdel]'); if (d) { e.stopPropagation(); const i = +d.dataset.bdel; if (await ask(`Usunąć belkę „${esc(BEAMS[i].meta.name || i + 1)}” z projektu?`, 'Usuń', true)) delBeam(i); return; }
  const t = e.target.closest && e.target.closest('[data-btab]'); if (t) { switchBeam(+t.dataset.btab); return; }
  if (e.target.closest && e.target.closest('[data-badd]')) addBeam();
  if (e.target.closest && e.target.closest('[data-bcopy]')) copyBeam();
});
document.addEventListener('dblclick', e => { const t = e.target.closest && e.target.closest('[data-btab]'); if (!t) return; const f = $('#projName'); if (f) { f.focus(); f.select(); } });
let asT = null;
function autosave() {
  clearTimeout(asT);
  asT = setTimeout(() => {
    const data = JSON.stringify(Object.assign({ state: S, filePath }, beamsOut()));
    if (typeof window.hostStore === 'function') { try { window.hostStore(data); } catch (e) { /* */ } }
    else { try { localStorage.setItem('belkadr-autosave', data); } catch (e) { /* */ } }
  }, 600);
}
function projectJSON() { return JSON.stringify(Object.assign({ app: 'BelkaDR', version: BEAMS && BEAMS.length > 1 ? 2 : 1, saved: new Date().toISOString(), state: S }, beamsOut()), null, 2); }
function ask(msg, okLabel, danger) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg sm"><p>${msg}</p><div class="dbtn"><button class="btn" data-a="0">Anuluj</button><button class="btn ${danger ? 'dng' : 'pri'}" data-a="1">${okLabel}</button></div></div>`;
    m.style.display = 'flex';
    const done = v => { m.style.display = 'none'; m.onclick = null; document.removeEventListener('keydown', kd, true); res(v); };
    const kd = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', kd, true);
    m.onclick = e => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1'); else if (e.target === m) done(false); };
    $('[data-a="1"]', m).focus();
  });
}
function download(name, content, mime) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type: mime + ';charset=utf-8' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
async function saveFile(as) {
  if (inHost()) {
    const r = await hostCall('save', { path: as ? '' : filePath, name: safeName('.belkadr'), content: projectJSON(), filter: 'project' });
    if (r && r.ok) { filePath = r.path; dirty = false; updateTitle(); autosave(); toast('Zapisano: ' + baseName(filePath)); }
    else if (r && r.err) toast('Błąd zapisu: ' + r.err);
  } else { download(safeName('.belkadr'), projectJSON(), 'application/json'); dirty = false; updateTitle(); }
}
function applyState(st, path, quiet) {
  S = E.normalize(st); if (BEAMS) BEAMS[curB] = S; filePath = path || ''; dirty = false; prevStat = null;
  $('#projName').value = S.meta.name || '';
  rendered = {}; renderInputs(); recalc(); updateTitle(); autosave();
  if (!quiet) toast('Wczytano: ' + (baseName(path) || S.meta.name || 'projekt'));
}
function loadProject(text, path) {
  let o; try { o = JSON.parse(text); } catch (e) { toast('To nie jest plik projektu BelkaDR (.belkadr / .json).'); return; }
  if (o && o.app && o.app !== 'BelkaDR') { toast(`To plik programu ${o.app} – nie belki drewnianej.`, 4000); return; }
  applyState(beamsIn(o, o.state || o), path);
}
async function openFile() {
  if (dirty && !(await ask('Niezapisane zmiany zostaną utracone. Otworzyć inny projekt?', 'Otwórz'))) return;
  if (inHost()) {
    const r = await hostCall('open', { filter: 'project' });
    if (r && r.ok) loadProject(r.content, r.path); else if (r && r.err) toast('Błąd odczytu: ' + r.err);
  } else {
    const inp = $('#fileIn'); inp.value = '';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => loadProject(t, f.name)); };
    inp.click();
  }
}
async function newProject() {
  if (dirty && !(await ask('Niezapisane zmiany zostaną utracone. Utworzyć nowy projekt?', 'Nowy projekt'))) return;
  S = E.normalize(E.defaultState()); BEAMS = null; curB = 0; filePath = ''; dirty = false; prevStat = null;
  $('#projName').value = S.meta.name; rendered = {}; renderInputs(); recalc(); updateTitle(); autosave();
}
function reportDoc(body, title) {
  const css = $('#appcss').textContent;
  return `<!doctype html><html lang="pl" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title || 'Raport – ' + S.meta.name)}</title><style>${css}\nhtml,body{height:auto}body{overflow:auto;padding:20px 16px}.rtools{margin-bottom:14px}@media print{body{padding:0}}</style></head><body>` +
    `<div class="rtools"><button class="btn pri" onclick="window.print()">Drukuj / zapisz PDF</button></div><div id="report">${wrapPrint(body !== undefined ? body : repBuild())}</div></body></html>`;
}
function curReportBody() { return repView() === 'own' ? ownHTML() : repBuild(); }
async function exportHTML() {
  if (!R || (R.errors && R.errors.length)) { toast('Usuń błędy danych przed eksportem raportu.'); return; }
  const name = safeName(repView() === 'static' ? ' – statyka.html' : repView() === 'own' ? ' – raport własny.html' : ' – raport.html');
  const doc = reportDoc(curReportBody());
  if (inHost()) { const r = await hostCall('save', { path: '', name, content: doc, filter: 'html' }); if (r && r.ok) toast('Zapisano raport: ' + baseName(r.path)); else if (r && r.err) toast('Błąd: ' + r.err); }
  else download(name, doc, 'text/html');
}
async function exportODT() {
  if (!R || (R.errors && R.errors.length)) { toast('Usuń błędy danych przed eksportem raportu.'); return; }
  const name = safeName(repView() === 'static' ? ' – statyka.odt' : ' – raport.odt');
  toast('Tworzenie pliku .odt…', 1500);
  let u; try { u = await window.BDR.odt(curReportBody(), (S.meta.name || 'Belka') + (repView() === 'static' ? ' – statyka' : ' – raport obliczeń')); } catch (e) { console.error(e); toast('Błąd tworzenia .odt: ' + e.message); return; }
  if (inHost()) { let b = ''; for (let i = 0; i < u.length; i += 0x8000) b += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); const r = await hostCall('save', { path: '', name, content: btoa(b), b64: true, filter: 'odt' }); if (r && r.ok) toast('Zapisano raport: ' + baseName(r.path)); else if (r && r.err) toast('Błąd: ' + r.err); return; }
  download(name, new Blob([u], { type: 'application/vnd.oasis.opendocument.text' }));
}
async function exportDXF() {
  if (!R || !R.md || (R.errors && R.errors.length)) { toast('Usuń błędy danych przed eksportem rysunku.'); return; }
  let txt; try { txt = window.BDD.build(R, S); } catch (e) { console.error(e); toast('Błąd tworzenia DXF: ' + e.message); return; }
  const name = safeName(' – belka.dxf');
  if (inHost()) { const r = await hostCall('save', { path: '', name, content: txt, filter: 'dxf' }); if (r && r.ok) toast('Zapisano rysunek: ' + baseName(r.path)); else if (r && r.err) toast('Błąd: ' + r.err); }
  else download(name, txt, 'application/dxf');
}
function doPrint() {
  if (!rendered.report) { rendered.report = true; renderReport($('#p-report')); }
  U.selectTab('report');
  setTimeout(() => window.print(), 80);
}
function about() {
  const m = $('#modal');
  m.innerHTML = `<div class="dlg"><h3>BelkaDR 1.1 – belki drewniane wg Eurokodu 5</h3>
  <p>Wymiarowanie i sprawdzanie belek z drewna litego, klejonego warstwowo i LVL wg PN-EN 1995-1-1 (parametry krajowe wg Załącznika Krajowego PL), kombinacje wg PN-EN 1990, obciążenia użytkowe wg PN-EN 1991-1-1, odporność ogniowa wg PN-EN 1995-1-2 (metoda zredukowanego przekroju), klasy drewna wg PN-EN 338:2016 i PN-EN 14080:2013.</p>
  <ul>
  <li><b>Statyka</b> – belki jednoprzęsłowe, wsporniki, belki ciągłe do 10 przęseł ze wspornikami, liczone w całości MES (elementy Timoshenki – z odkształceniami postaciowymi); podpory z blokadą przesuwu x, y, z i obrotu, podatne; węzły i przeguby (belki Gerbera); różne przekroje w odcinkach; belka nachylona (krokiew) i obrócona (płatew) – zginanie dwukierunkowe i siła osiowa; skręcanie; wykresy M, V, N, T, ugięć i wytężenia z odczytem pod kursorem; reakcje.</li>
  <li><b>Obciążenia i kombinacje</b> – stałe, użytkowe (kategorie PN-EN 1991-1-1), śnieg, wiatr, inne, wyjątkowe; równomierne, trapezowe, na odcinku, siły skupione; kierunek pionowy, prostopadły do osi lub poziomy; na długość osi lub rzut poziomy; klasy trwania obciążenia; kombinacje 6.10 / 6.10a,b z każdym obciążeniem wiodącym w grupach k<sub>mod</sub> (3.1.3(2)), układ szachownicowy, sytuacja wyjątkowa 6.11b, charakterystyczna i quasi-stała.</li>
  <li><b>SGN</b> – zginanie jedno- i dwukierunkowe (6.1.6), z rozciąganiem i ściskaniem (6.2.3, 6.2.4), ścinanie z k<sub>cr</sub> i redukcją przy podporach (6.1.7), skręcanie (6.1.8), docisk na podporach i pod siłami z k<sub>c,90</sub> (6.1.5), belki podcięte (6.5.2), zwichrzenie (6.3.3) z długością efektywną wg tab. 6.1 i stężeniami, wyboczenie (6.3.2), k<sub>h</sub>, k<sub>sys</sub>.</li>
  <li><b>SGU</b> – ugięcia w<sub>inst</sub>, w<sub>fin</sub>, w<sub>net,fin</sub> z pełzaniem k<sub>def</sub> (2.2.3, 7.2), podniesienie wykonawcze, drgania stropów (7.3.3).</li>
  <li><b>Pożar</b> – metoda zredukowanego przekroju, zabezpieczenie płytami (t<sub>ch</sub>, t<sub>f</sub>), nośność, ścinanie i zwichrzenie w pożarze.</li>
  <li><b>Słup i stopa</b> – słup drewniany pod dowolną podporą obciążony reakcjami belki z każdej kombinacji: ściskanie z wyboczeniem i mimośrodem (6.3.2), docisk czoła (6.1.4), stopa stalowa (blacha wpuszczana lub blachy zewnętrzne) ze sworzniami lub śrubami – nośność wg Johansena (8.2.3), n<sub>ef</sub> (8.34), rozstawy (tab. 8.5, 8.6), ścinanie blokowe (zał. A), docisk do blachy (EN 1993-1-8), docisk betonu i kotwy (EN 1992-4).</li>
  <li><b>Dobór</b> – przekroju z wymiarów handlowych, klasy drewna lub obu, przy zadanym wytężeniu.</li>
  <li><b>Widoki</b> – schemat z zaznaczaniem przęseł (LPM) i menu (PPM), wykres pod belką, wykresy ze znacznikami, widok podłużny 2D z przekrojem pod kursorem i widok przestrzenny 3D, eksport DXF.</li></ul>
  <p>Dane wprowadzasz w zakładce <b>Dane</b>; obok formularza jest schemat belki: lewy przycisk zaznacza przęsła, prawy otwiera menu (obciążenia, przekrój, węzeł, podpory); przyciski <b>Obciążenia / Przekrój / Węzeł / Wymiary</b> nad schematem; pola wyboru w legendzie pomijają obciążenia; kliknij podporę, aby zadać oparcie, podcięcie albo słup ze stopą. W <b>Podsumowaniu</b> kliknij numer punktu normy lub wartość – objaśnienie i tok obliczeń. Sprawdzenia można odhaczać – raport zawiera odhaczone.</p>
  <p>Skróty: F2 – raport, Ctrl+S – zapisz, Ctrl+O – otwórz, Ctrl+N – nowy, Ctrl+P – drukuj raport.</p>
  <p style="font-size:12px;color:var(--ink3)">Program jest narzędziem pomocniczym. Wyniki wymagają weryfikacji przez osobę z odpowiednimi uprawnieniami budowlanymi. Statyka: analiza liniowo-sprężysta I rzędu (MES). Parametry LVL – przykładowe, należy je sprawdzić z deklaracją właściwości użytkowych wyrobu.</p>
  <div class="dbtn"><button class="btn pri" id="abClose">Zamknij</button></div></div>`;
  m.style.display = 'flex';
  $('#abClose', m).onclick = () => { m.style.display = 'none'; };
}

/* -------------------------------------------------------------- start */
function initSplit() {
  const sp = $('#dsplit'), wrap = $('.datawrap'); if (!sp || !wrap) return;
  try { const v = localStorage.getItem('belkadr-split'); if (v) wrap.style.setProperty('--dsl', v); } catch (e) { /* */ }
  sp.addEventListener('pointerdown', e => {
    e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('drag'); document.body.classList.add('dsdrag');
    const r = wrap.getBoundingClientRect();
    const mv = ev => { const p = Math.max(25, Math.min(75, (ev.clientX - r.left) / r.width * 100)); wrap.style.setProperty('--dsl', p.toFixed(1) + '%'); };
    const up = () => { sp.removeEventListener('pointermove', mv); sp.classList.remove('drag'); document.body.classList.remove('dsdrag'); try { localStorage.setItem('belkadr-split', wrap.style.getPropertyValue('--dsl')); } catch (er) { /* */ } renderDataSide(); };
    sp.addEventListener('pointermove', mv); sp.addEventListener('pointerup', up, { once: true });
  });
  sp.addEventListener('dblclick', () => { wrap.style.setProperty('--dsl', '50%'); try { localStorage.removeItem('belkadr-split'); } catch (e) { /* */ } renderDataSide(); });
}
function init() {
  if (window.BDN && window.BDN.observe) window.BDN.observe(document.body);
  let saved = window.__AUTOSAVE || null;
  if (!saved) { try { saved = JSON.parse(localStorage.getItem('belkadr-autosave') || 'null'); } catch (e) { saved = null; } }
  if (saved && saved.state) {
    try { S = E.normalize(beamsIn(saved, saved.state)); filePath = saved.filePath || ''; }
    catch (e) { S = E.defaultState(); }
  }
  S = E.normalize(S); if (BEAMS) BEAMS[curB] = S;
  $('#projName').value = S.meta.name || '';
  $('#projName').addEventListener('input', e => { S.meta.name = e.target.value; dirty = true; updateTitle(); autosave(); rendered.report = false; const bt = $(`.btab[data-btab="${curB}"] span`); if (bt) bt.textContent = S.meta.name.slice(0, 16); });
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.tab));
    renderActive();
  }));
  $$('[data-act]').forEach(b => b.addEventListener('click', () => ({ new: newProject, open: openFile, save: () => saveFile(false), saveas: () => saveFile(true), print: doPrint, exporthtml: exportHTML, about })[b.dataset.act]()));
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (inHost() && (e.key === 'F5' || (e.ctrlKey && k === 'r'))) { e.preventDefault(); return; }
    if ($('#modal').style.display === 'flex' && e.key !== 'Escape') return;
    if (e.ctrlKey && k === 's') { e.preventDefault(); saveFile(e.shiftKey); }
    else if (e.ctrlKey && k === 'o') { e.preventDefault(); openFile(); }
    else if (e.ctrlKey && k === 'n') { e.preventDefault(); newProject(); }
    else if (e.ctrlKey && k === 'p') { e.preventDefault(); doPrint(); }
    else if (e.key === 'F2') { e.preventDefault(); U.selectTab('report'); }
    else if (e.key === 'Escape') { closeList(); $('#modal').style.display = 'none'; $('#nmodal').style.display = 'none'; }
  });
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal' && !$('[data-a]', e.currentTarget)) e.currentTarget.style.display = 'none'; });
  $('#nmodal').addEventListener('mousedown', e => { if (e.target.id === 'nmodal') e.currentTarget.style.display = 'none'; });
  let rz = null, lastW = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(() => { rendered = {}; renderActive(); }, 150); });
  window.addEventListener('beforeunload', e => { if (dirty && !inHost()) { e.preventDefault(); e.returnValue = ''; } });
  initSplit();
  renderInputs();
  recalc();
  renderInputs();
  updateTitle();
  // plik projektu przekazany przez program (dwuklik na pliku .belkadr)
  if (window.__OPENFILE && window.__OPENFILE.content) { try { loadProject(window.__OPENFILE.content, window.__OPENFILE.path); } catch (e) { console.error(e); } }
}
U.setState = s => { S = E.normalize(s); if (BEAMS) BEAMS[curB] = S; prevStat = null; $('#projName').value = S.meta.name || ''; rendered = {}; renderInputs(); recalc(); updateTitle(); };
U.getState = () => S;
U.selectTab = t => { const b = $(`.tabs button[data-tab="${t}"]`); if (b) b.click(); };
U.ckVal = ckVal; U.fmtPsi = fmtPsi; U.sectionSVG = sectionSVG; U.schemeSVG = schemeSVG; U.lineChart = lineChart; U.elevationSVG = elevationSVG; U.reactionsHTML = reactionsHTML; U.combosHTML = combosHTML; U.envSeries = envSeries; U.extremeMarks = extremeMarks; U.fdTableHTML = fdTableHTML; U.scheduleHTML = scheduleHTML; U.supTableHTML = supTableHTML; U.stressSVG = stressSVG; U.idOf = idOf; U.KIND_NAME = KIND_NAME; U.allItems = allItems;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
