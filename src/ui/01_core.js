/* BelkaDR – interfejs użytkownika: narzędzia, definicje pól formularza, listy obciążeń */
const E = window.EC5;
const U = window.BD = {};               // współdzielone z report.js
let S = E.defaultState();
let R = null;
let filePath = '';
let dirty = false;
let rendered = {};

/* ------------------------------------------------------------ narzędzia */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, dp) => {
  if (dp === undefined) dp = 2;
  if (v === null || v === undefined || typeof v !== 'number' || !isFinite(v)) return '—';
  let s = (Math.abs(v) < 0.5 * Math.pow(10, -dp) ? 0 : v).toFixed(dp);
  const neg = s[0] === '-'; if (neg) s = s.slice(1);
  let [i, f] = s.split('.'); i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '−' : '') + i + (f !== undefined ? ',' + f : '');
};
const sym = s => esc(s).replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
  .replace(/_([0-9A-Za-ząćęłńóśźżθφ]+(?:,[0-9A-Za-ząćęłńóśźż]+)*)/g, '<sub>$1</sub>');
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] === undefined || a[ks[i]] === null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };
const parseNum = s => { if (typeof s === 'number') return s; const x = parseFloat(String(s).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : null; };
const showNum = v => (v === '' || v === null || v === undefined) ? '' : String(v).replace('.', ',');
const rng = (a, b, st) => { const r = []; for (let v = a; v <= b + 1e-9; v += st) r.push(+v.toFixed(3)); return r; };
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
Object.assign(U, { esc, fmt, sym, getP });

/* --------------------------------------------------------------- SVG */
const svgOpen = (w, h, extra) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${extra || ''}>`;
const tx = (x, y, s, o) => { o = o || {}; return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.fs || 11}" fill="${o.c || '#1b2230'}" text-anchor="${o.a || 'middle'}" ${o.w ? `font-weight="${o.w}"` : ''} ${o.rot ? `transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${s}</text>`; };
function dimH(x1, x2, y, label, o) { o = o || {};
  return `<g stroke="#5d6778" stroke-width="0.8"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}"/><line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}"/>` +
    `<line x1="${x1 - 3}" y1="${y + 3}" x2="${x1 + 3}" y2="${y - 3}"/><line x1="${x2 - 3}" y1="${y + 3}" x2="${x2 + 3}" y2="${y - 3}"/></g>` + tx((x1 + x2) / 2, y + (o.below ? 13 : -4), label, { fs: o.fs || 10.5, c: '#3d4656' }); }
function dimV(x, y1, y2, label, o) { o = o || {};
  return `<g stroke="#5d6778" stroke-width="0.8"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line x1="${x - 4}" y1="${y1}" x2="${x + 4}" y2="${y1}"/><line x1="${x - 4}" y1="${y2}" x2="${x + 4}" y2="${y2}"/>` +
    `<line x1="${x - 3}" y1="${y1 + 3}" x2="${x + 3}" y2="${y1 - 3}"/><line x1="${x - 3}" y1="${y2 + 3}" x2="${x + 3}" y2="${y2 - 3}"/></g>` + tx(x + (o.right ? 6 : -5), (y1 + y2) / 2, label, { fs: o.fs || 10.5, c: '#3d4656', a: o.right ? 'start' : 'middle', rot: o.right ? 0 : -90 }); }
// kolory drewna (w trybie ciemnym – zmienne --sv-*)
const WOOD = '#ead7b7', WOODG = '#c89b62', WOODE = '#8a5a2b';

/* ---------------------------------------------------------- definicja pól */
const CONT = s => s.scheme === 'cont';
const CANT = s => s.scheme === 'cant';
const famOfCls = id => id === 'U' ? (S.mat.user ? S.mat.user.fam : 'U') : (E.MATS[id] ? E.MATS[id].fam : 'C');
const curFam = () => S.mat.cls === 'U' ? 'U' : famOfCls(S.mat.cls);
const catNow = () => E.catOf(curFam() === 'U' ? (S.mat.user ? S.mat.user.fam : 'C') : curFam());
function mtNow() { try { return E.materials(E.normalize(S)); } catch (e) { return null; } }

const GROUPS = [
  { id: 'geo', title: 'Schemat statyczny i geometria', items: [
    { k: 'scheme', t: 'sel', l: 'Schemat statyczny', o: () => Object.entries(E.SCHEMES).map(([k, v]) => [k, v.name]), wide: true, re: true },
    { k: 'geom.L', t: 'num', l: 'Rozpiętość L (w osiach podpór)', u: 'm', list: [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 12, 15], min: 0.2, show: s => !CONT(s), re: true },
    { t: 'cont', show: CONT },
    { k: 'geom.t', t: 'num', l: 'Długość oparcia na podporach t', u: 'mm', list: [60, 80, 100, 120, 150, 180, 200, 250, 300], min: 0, re: true },
    { t: 'hint', h: () => 'Długość oparcia (szerokość podpory wzdłuż belki) – do docisku w podporach (6.1.5) i strefy redukcji siły poprzecznej (6.1.7(3)); osobno dla każdej podpory – kliknij podporę na schemacie.' },
    { k: 'geom.beta', t: 'num', l: 'Nachylenie osi belki β (krokiew)', u: '°', list: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50], min: -75, max: 75, re: true },
    { k: 'geom.alpha', t: 'num', l: 'Obrót przekroju α (płatew)', u: '°', list: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45], min: -75, max: 75, re: true },
    { t: 'hint', ex: true, exT: 'Belka nachylona i obrócona – jak liczone?', h: () => 'β – nachylenie osi belki do poziomu (krokiew, belka schodowa). Obciążenia grawitacyjne rozkładane są na składową prostopadłą do osi (zginanie) i równoległą (siła osiowa N – przekazywana na podporę nieprzesuwną). Obciążenia podane „na rzut poziomy” (śnieg, użytkowe) przeliczane są na długość osi (×cos β). Rozpiętość L to długość osi belki między podporami.<br>α – obrót przekroju wokół osi belki (płatew prostopadła do połaci): obciążenia pionowe rozkładane są na składowe w płaszczyźnie y (q·cos α) i z (q·sin α) – zginanie dwukierunkowe (6.1.6). Wiatr działa prostopadle do połaci – zadaj go w kierunku „⊥ do osi (y)”.' },
  ] },
  { id: 'mat', title: 'Materiał i przekrój', items: [
    { t: 'html', h: () => matHTML() },
    { k: 'geom.b', t: 'num', l: 'Szerokość b (jednego elementu)', u: 'mm', list: () => catNow().b, min: 10, re: true },
    { k: 'geom.h', t: 'num', l: 'Wysokość h', u: 'mm', list: () => catNow().h, min: 20, re: true },
    { k: 'geom.n', t: 'sel', l: 'Liczba elementów obok siebie n', o: [1, 2, 3, 4, 5, 6].map(v => [v, v === 1 ? '1 – przekrój pojedynczy' : `${v} – przekrój złożony (${v}×b)`]), num: true, wide: true },
    { t: 'hint', h: () => hintSec() },
    { k: 'loads.gamma', t: 'num', l: 'Ciężar objętościowy drewna γ', u: 'kN/m³', list: ['', 3.5, 4.0, 4.2, 4.5, 5.0, 6.0, 7.0], opt: true, ph: () => { const m = mtNow(); return m ? 'auto: ' + fmt(m.gamma, 1) : 'auto'; }, min: 0 },
  ] },
  { id: 'env', title: 'Klasa użytkowania i trwanie obciążeń', items: [
    { k: 'env.sc', t: 'sel', l: 'Klasa użytkowania', o: [[1, '1 – wnętrza ogrzewane (≤ 12%)'], [2, '2 – pod dachem, nieogrzewane (≤ 20%)'], [3, '3 – na zewnątrz, niezadaszone']], num: true, wide: true },
    { t: 'hint', h: s => esc(E.SC_DESC[s.env.sc]) + ' (2.3.1.3).' },
    { k: 'env.wet', t: 'chk', l: 'Drewno wbudowane w stanie mokrym (wysychające pod obciążeniem) – k_{def} + 1,0 (3.2(4))' },
    { t: 'html', h: () => kmodTabHTML() },
  ] },
  { id: 'load', title: 'Obciążenia', items: [
    { k: 'loads.sw', t: 'chk', l: 'Ciężar własny belki (γ·A) – obciążenie stałe' },
    { t: 'list', kind: 'perm' }, { t: 'list', kind: 'imp' }, { t: 'list', kind: 'snow' }, { t: 'list', kind: 'wind' }, { t: 'list', kind: 'other' }, { t: 'list', kind: 'acc' },
    { t: 'sub', l: 'Kombinacje (PN-EN 1990)' },
    { k: 'loads.comb', t: 'sel', l: 'Kombinacja SGN', o: [['610ab', 'wzory 6.10a i 6.10b'], ['610', 'wzór 6.10']], wide: true },
    { k: 'loads.gG', t: 'num', l: 'γ_{G,sup}', list: [1.0, 1.15, 1.35], min: 0 },
    { k: 'loads.gGi', t: 'num', l: 'γ_{G,inf}', list: [0.9, 1.0], min: 0 },
    { k: 'loads.gQ', t: 'num', l: 'γ_{Q}', list: [0, 1.0, 1.5], min: 0 },
    { k: 'loads.xi', t: 'num', l: 'ξ (redukcja obc. stałych w 6.10b)', list: [0.85, 0.9, 1.0], show: s => s.loads.comb === '610ab', min: 0, max: 1 },
    { k: 'loads.pattern', t: 'chk', l: 'Układ szachownicowy obciążeń użytkowych i innych zmiennych (każde przęsło osobno, tylko gdzie niekorzystne)' },
    { k: 'loads.accPsi', t: 'sel', l: 'Wiodące zmienne w 6.11b (wyjątkowa)', o: [['psi1', 'ψ₁ – wartość częsta'], ['psi2', 'ψ₂ – wartość quasi-stała']], wide: true, show: s => s.loads.acc.length },
    { t: 'hint', h: () => hintLoads() },
  ] },
  { id: 'stab', title: 'Stateczność (zwichrzenie, wyboczenie)', items: [
    { k: 'ltb.on', t: 'chk', l: 'Sprawdzaj zwichrzenie (6.3.3)', re: true },
    { k: 'ltb.pos', t: 'sel', l: 'Obciążenie przyłożone do', o: [['top', 'górnej krawędzi (na belce)'], ['center', 'środka ciężkości'], ['bottom', 'dolnej krawędzi (podwieszone)']], wide: true },
    { k: 'ltb.top', t: 'num', l: 'Rozstaw stężeń krawędzi górnej a_{g}', u: 'm', list: ['', 0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0], opt: true, ph: 'brak', min: 0, show: s => s.ltb.on },
    { k: 'ltb.bot', t: 'num', l: 'Rozstaw stężeń krawędzi dolnej a_{d}', u: 'm', list: ['', 0, 0.6, 1.0, 1.5, 2.0, 3.0], opt: true, ph: 'brak', min: 0, show: s => s.ltb.on },
    { t: 'hint', ex: true, exT: 'Stężenia i długość efektywna – jak przyjąć?', show: s => s.ltb.on, h: () => 'Stężenie – punkt, w którym krawędź belki jest zabezpieczona przed przesunięciem bocznym (belki stropowe/łaty/płatwie oparte i połączone z belką, tężnik, kontrafiks). <b>0</b> – krawędź stężona w sposób ciągły (np. poszyciem z płyt przybitych do belki) – zwichrzenie nie występuje; <b>puste</b> – brak stężeń pośrednich (l<sub>ef</sub> wg tab. 6.1 z rozpiętości). Krawędź górna jest ściskana przy M &gt; 0 (przęsła), dolna przy M &lt; 0 (nad podporami pośrednimi i we wspornikach). Obciążenie na krawędzi ściskanej: l<sub>ef</sub> + 2h, na rozciąganej: l<sub>ef</sub> − 0,5h (uwaga pod tab. 6.1).' },
    { k: 'ltb.lefTop', t: 'num', l: 'l_{ef} ręcznie – strefa M > 0', u: 'm', list: ['', 1, 2, 3, 4, 5, 6], opt: true, ph: 'auto', min: 0, show: s => s.ltb.on },
    { k: 'ltb.lefBot', t: 'num', l: 'l_{ef} ręcznie – strefa M < 0', u: 'm', list: ['', 1, 2, 3, 4, 5, 6], opt: true, ph: 'auto', min: 0, show: s => s.ltb.on },
    { t: 'hint', h: () => hintLtb() },
    { k: 'stab.ky', t: 'num', l: 'Wyboczenie: l_{c,y} = β_{y}·l (w płaszczyźnie y)', list: [0.5, 0.7, 1.0, 2.0], min: 0.3 },
    { k: 'stab.kz', t: 'num', l: 'Wyboczenie: l_{c,z} = β_{z}·a (z płaszczyzny)', list: [0.5, 0.7, 1.0, 2.0], min: 0.3 },
    { t: 'hint', h: () => 'Wyboczenie (6.3.2) sprawdzane, gdy w belce występuje ściskanie osiowe (belka nachylona, siła N w obciążeniu). l – długość przęsła (wspornika ×2), a – rozstaw stężeń krawędzi górnej (puste – l).' },
  ] },
  { id: 'sls', title: 'SGU – ugięcia i drgania', items: [
    { k: 'sls.lim', t: 'sel', l: 'Wartości graniczne ugięć', o: () => Object.entries(E.DEFL_PRESETS).map(([k, v]) => [k, v.name]), wide: true, re: true },
    { t: 'html', h: () => deflLimHTML() },
    { k: 'sls.camber', t: 'num', l: 'Podniesienie wykonawcze (odwrotna strzałka) w_{c}', u: 'mm', list: [0, 5, 10, 15, 20, 25, 30], min: 0 },
    { k: 'sls.shear', t: 'chk', l: 'Uwzględnij odkształcenia postaciowe (G_{mean}) w ugięciach i statyce' },
    { t: 'hint', ex: true, exT: 'Jak liczone są ugięcia?', h: () => 'Ugięcia od wartości charakterystycznych przy średnich modułach E<sub>0,mean</sub>, G<sub>mean</sub> (2.2.3(2)). w<sub>inst</sub> – kombinacja charakterystyczna (każde obciążenie zmienne kolejno wiodące). Ugięcie końcowe wg 2.2.3(5): w<sub>fin,G</sub> = w<sub>inst,G</sub>(1 + k<sub>def</sub>), w<sub>fin,Q1</sub> = w<sub>inst,Q1</sub>(1 + ψ<sub>2,1</sub>k<sub>def</sub>), w<sub>fin,Qi</sub> = w<sub>inst,Qi</sub>(ψ<sub>0,i</sub> + ψ<sub>2,i</sub>k<sub>def</sub>); w<sub>net,fin</sub> = w<sub>fin</sub> − w<sub>c</sub> (rys. 7.1). Ugięcia przęseł mierzone od cięciwy łączącej podpory, wsporników – od poziomu podpory.' },
    { k: 'sls.vib.on', t: 'chk', l: 'Drgania stropu mieszkalnego (7.3.3) – belka stropowa jednoprzęsłowa', re: true },
    { k: 'sls.vib.s', t: 'num', l: 'Rozstaw belek s', u: 'm', list: [0.4, 0.5, 0.6, 0.625, 0.8, 1.0], min: 0.1, show: s => s.sls.vib.on },
    { k: 'sls.vib.B', t: 'num', l: 'Szerokość stropu B', u: 'm', list: [3, 4, 5, 6, 8, 10], min: 0.3, show: s => s.sls.vib.on },
    { k: 'sls.vib.EIb', t: 'num', l: '(EI)_{b} – sztywność poprzeczna stropu', u: 'kNm²/m', list: ['', 2, 3.1, 5, 10, 20], opt: true, ph: '3,1 (OSB 22)', min: 0, show: s => s.sls.vib.on },
    { k: 'sls.vib.zeta', t: 'num', l: 'Współczynnik tłumienia ζ', list: [0.01, 0.015, 0.02], min: 0.001, show: s => s.sls.vib.on },
    { k: 'sls.vib.a', t: 'num', l: 'Graniczne ugięcie od 1 kN a', u: 'mm/kN', list: [0.5, 1.0, 1.5, 2.0, 4.0], min: 0.1, show: s => s.sls.vib.on },
    { k: 'sls.vib.b', t: 'num', l: 'Parametr b (rys. 7.2)', list: [50, 80, 100, 120, 150], min: 10, show: s => s.sls.vib.on },
    { k: 'sls.vib.kdist', t: 'num', l: 'Udział belki w przenoszeniu siły 1 kN k_{dist}', list: [0.3, 0.4, 0.5, 0.7, 1.0], min: 0.1, max: 1, show: s => s.sls.vib.on },
    { k: 'sls.vib.mQ', t: 'chk', l: 'Masa stropu z udziałem ψ₂·Q (poza obciążeniami stałymi)', show: s => s.sls.vib.on },
    { t: 'hint', h: () => R && R.vib ? `f<sub>1</sub> = <b>${fmt(R.vib.f1, 2)} Hz</b>, m = ${fmt(R.vib.m, 0)} kg/m², w/F = ${fmt(R.vib.wF, 2)} mm/kN, v = ${fmt(R.vib.v, 4)} ≤ ${fmt(R.vib.vlim, 4)} m/(Ns²)` : '', show: s => s.sls.vib.on },
  ] },
  { id: 'fire', title: 'Odporność ogniowa (PN-EN 1995-1-2)', items: [
    { k: 'fire.on', t: 'chk', l: 'Sprawdzaj nośność w warunkach pożaru (metoda zredukowanego przekroju)', re: true },
    { k: 'fire.R', t: 'sel', l: 'Wymagana klasa odporności', o: [15, 30, 45, 60, 90, 120].map(v => [v, 'R ' + v]), num: true, show: s => s.fire.on },
    { k: 'fire.sides', t: 'sel', l: 'Ogrzewanie', o: [[3, 'z 3 stron (góra osłonięta stropem)'], [4, 'z 4 stron']], num: true, wide: true, show: s => s.fire.on },
    { k: 'fire.prot', t: 'sel', l: 'Zabezpieczenie', o: [['none', 'brak – drewno odsłonięte'], ['gkf', 'płyta gipsowo-kartonowa (typ A/F/H, 1 warstwa)'], ['manual', 'okładzina – t_ch, t_f podane ręcznie']], wide: true, re: true, show: s => s.fire.on },
    { k: 'fire.hp', t: 'num', l: 'Grubość okładziny h_{p}', u: 'mm', list: [9.5, 12.5, 15, 18, 25], min: 9, show: s => s.fire.on && s.fire.prot !== 'none' },
    { k: 'fire.tch', t: 'num', l: 'Początek zwęglania t_{ch}', u: 'min', list: ['', 10, 15, 20, 25, 30], opt: true, ph: 'auto', min: 0, show: s => s.fire.on && s.fire.prot === 'manual' },
    { k: 'fire.tf', t: 'num', l: 'Czas zniszczenia okładziny t_{f}', u: 'min', list: ['', 15, 20, 30, 45, 60], opt: true, ph: '= t_ch', min: 0, show: s => s.fire.on && s.fire.prot !== 'none' },
    { k: 'fire.psi', t: 'sel', l: 'Wiodące zmienne w pożarze', o: [['psi2', 'ψ₂,₁ (zalecane, PN-EN 1991-1-2 4.3.1)'], ['psi1', 'ψ₁,₁']], wide: true, show: s => s.fire.on },
    { t: 'hint', h: () => hintFire(), show: s => s.fire.on },
  ] },
  { id: 'coef', title: 'Współczynniki (Załącznik krajowy PL)', closed: true, items: [
    { k: 'coef.gM', t: 'num', l: 'γ_{M} – sytuacja trwała i przejściowa', list: ['', 1.2, 1.25, 1.3], opt: true, ph: () => { const m = mtNow(); return m ? 'auto: ' + fmt(m.F.gM, 2) : 'auto'; }, min: 1 },
    { k: 'coef.gMA', t: 'num', l: 'γ_{M} – sytuacja wyjątkowa', list: [1.0], min: 0.5 },
    { k: 'coef.kcr', t: 'num', l: 'k_{cr} (ścinanie, 6.1.7(2))', list: ['', 0.67, 1.0], opt: true, ph: () => { const m = mtNow(); return m ? 'auto: ' + fmt(m.F.kcr, 2) : 'auto'; }, min: 0.3, max: 1 },
    { k: 'coef.ksys', t: 'num', l: 'k_{sys} – wytrzymałość systemu (6.6)', list: [1.0, 1.1], min: 1, max: 1.2 },
    { k: 'coef.km', t: 'num', l: 'k_{m} (zginanie dwukierunkowe, 6.1.6(2))', list: [0.7, 1.0], min: 0.5, max: 1 },
    { k: 'coef.kc90', t: 'num', l: 'k_{c,90} – docisk (6.1.5)', list: ['auto', 1.0, 1.25, 1.5, 1.75], auto: true, opt: true, ph: 'auto', min: 1, max: 1.75 },
    { k: 'coef.vRed', t: 'chk', l: 'Pomijanie obciążeń w odległości h od krawędzi podpory przy ścinaniu (6.1.7(3)) – podpora bezpośrednia, obciążenie górą' },
    { k: 'coef.kfi', t: 'num', l: 'k_{fi} (PN-EN 1995-1-2, tab. 2.1)', list: ['', 1.1, 1.15, 1.25], opt: true, ph: () => { const m = mtNow(); return m ? 'auto: ' + fmt(m.F.kfi, 2) : 'auto'; }, min: 1 },
    { t: 'hint', h: () => 'Wartości zalecane PN-EN 1995-1-1 przyjęte w Załączniku Krajowym PL: γ<sub>M</sub> = 1,3 (drewno lite), 1,25 (klejone), 1,2 (LVL), 1,0 (wyjątkowe); k<sub>cr</sub> = 0,67 (drewno lite i klejone), 1,0 (LVL). Puste pole – wartość automatyczna dla wybranego materiału.' },
  ] },
];

/* ---------------------------------------------- materiał: lista klas i tabela */
const LOCK_SVG = on => `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="${on ? 'M5.5 7V5a2.5 2.5 0 0 1 5 0v2' : 'M5.5 7V5a2.5 2.5 0 0 1 4.9-.7'}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
function matHTML() {
  const fam = curFam();
  const famOpts = E.FAM_ORDER.map(f => `<option value="${f}" ${f === fam ? 'selected' : ''}>${esc(E.FAM[f].name)}</option>`).join('');
  const clsOpts = fam === 'U' ? `<option value="U" selected>${esc(S.mat.user ? S.mat.user.name : 'Materiał własny')}</option>` : E.MAT_LIST.filter(m => m.fam === fam).map(m => `<option value="${m.id}" ${m.id === S.mat.cls ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
  const m = mtNow();
  let h = `<div class="row wide"><label for="mFam">Rodzaj materiału</label><select id="mFam">${famOpts}</select></div>`;
  h += `<div class="row wide"><label for="mCls">Klasa wytrzymałości</label><div class="concbox"><select id="mCls">${clsOpts}</select><button class="btn sm lockb ${S.mat.lock ? 'on' : ''}" id="mLock" title="${S.mat.lock ? 'Klasa zablokowana – „Dobierz wszystko” jej nie zmienia (kliknij, aby odblokować)' : 'Zablokuj klasę – „Dobierz wszystko” dobierze tylko przekrój'}">${LOCK_SVG(S.mat.lock)}</button></div></div>`;
  h += `<div class="rowbtn"><button class="btn sm" id="mTab">Parametry klas…</button>&nbsp;<button class="btn sm" id="mUser" title="Edycja wszystkich parametrów materiału (np. wg deklaracji właściwości użytkowych producenta)">Edytuj parametry…</button></div>`;
  if (m) h += `<div class="hint">f<sub>m,k</sub> = ${fmt(m.m.fmk, 1)} · f<sub>t,0,k</sub> = ${fmt(m.m.ft0k, 1)} · f<sub>c,0,k</sub> = ${fmt(m.m.fc0k, 1)} · f<sub>c,90,k</sub> = ${fmt(m.m.fc90k, 1)} · f<sub>v,k</sub> = ${fmt(m.m.fvk, 1)} MPa · E<sub>0,mean</sub> = ${fmt(m.m.E0m, 1)} GPa · E<sub>0,05</sub> = ${fmt(m.m.E005, 1)} GPa · G<sub>mean</sub> = ${fmt(m.m.Gm, 2)} GPa · ρ<sub>k</sub> = ${fmt(m.m.rhok, 0)} kg/m³ · γ<sub>M</sub> = ${fmt(m.gM, 2)}${m.m.fam === 'LVL' ? ' · <b>LVL – wartości przykładowe, sprawdź z DoP wyrobu</b>' : ''}</div>`;
  return h;
}
function bindMat(host) {
  const fam = $('#mFam', host); if (!fam) return;
  fam.addEventListener('change', () => {
    const f = fam.value;
    if (f === 'U') { const base = E.MATS[S.mat.cls] || E.MATS.C24; S.mat.user = Object.assign({}, base, { fam: 'U', base: base.id, name: 'Materiał własny (' + base.id + ')' }); S.mat.cls = 'U'; }
    else { S.mat.cls = E.FAM_COMMON[f] || E.MAT_LIST.find(m => m.fam === f).id; S.mat.user = null; }
    changed(true);
  });
  $('#mCls', host).addEventListener('change', e => { if (e.target.value !== 'U') { S.mat.cls = e.target.value; S.mat.user = null; } changed(true); });
  $('#mLock', host).onclick = () => { S.mat.lock = !S.mat.lock; changed(true); };
  $('#mTab', host).onclick = () => matTablePopup();
  $('#mUser', host).onclick = () => matUserPopup();
}
const MAT_COLS = [['fmk', 'f<sub>m,k</sub>', 1], ['ft0k', 'f<sub>t,0,k</sub>', 1], ['ft90k', 'f<sub>t,90,k</sub>', 1], ['fc0k', 'f<sub>c,0,k</sub>', 1], ['fc90k', 'f<sub>c,90,k</sub>', 1], ['fvk', 'f<sub>v,k</sub>', 1], ['E0m', 'E<sub>0,mean</sub>', 1], ['E005', 'E<sub>0,05</sub>', 1], ['E90m', 'E<sub>90,mean</sub>', 2], ['Gm', 'G<sub>mean</sub>', 2], ['rhok', 'ρ<sub>k</sub>', 0], ['rhom', 'ρ<sub>mean</sub>', 0]];
function matTablePopup() {
  const fam = curFam() === 'U' ? 'C' : curFam();
  const m = $('#modal');
  const tab = f => `<div class="tblwrap"><table class="ctabt"><tr><th>Klasa</th>${MAT_COLS.map(c => `<th>${c[1]}</th>`).join('')}</tr>${E.MAT_LIST.filter(q => q.fam === f).map(q => `<tr data-cls="${q.id}" class="${q.id === S.mat.cls ? 'on' : ''}"><td>${esc(q.name)}</td>${MAT_COLS.map(c => `<td>${fmt(q[c[0]], c[2])}</td>`).join('')}</tr>`).join('')}</table></div>`;
  m.innerHTML = `<div class="dlg ctab"><h3>Parametry klas – ${esc(E.FAM[fam].name)}</h3><p class="hint">Wytrzymałości [MPa], moduły [GPa = kN/mm²], gęstości [kg/m³]. ${fam === 'LVL' ? 'LVL – wartości przykładowe wg deklaracji właściwości użytkowych; przed zastosowaniem sprawdź z DoP konkretnego wyrobu (możesz je zmienić: „Edytuj parametry…”).' : fam === 'C' || fam === 'D' ? 'PN-EN 338:2016, tablice 1 i 2.' : 'PN-EN 14080:2013, tablica 5.'} Kliknij wiersz, aby wybrać klasę.</p>
    <div class="segsw sm" style="margin:6px 0">${E.FAM_ORDER.filter(f => f !== 'U').map(f => `<button data-tf="${f}" class="${f === fam ? 'on' : ''}">${esc(E.FAM[f].short)}${f === 'GLh' ? ' (h)' : f === 'GLc' ? ' (c)' : ''}</button>`).join('')}</div>
    <div id="ctabBody">${tab(fam)}</div><div class="dbtn"><button class="btn pri" data-close>Zamknij</button></div></div>`;
  m.style.display = 'flex';
  const bind = () => $$('tr[data-cls]', m).forEach(tr => tr.addEventListener('click', () => { S.mat.cls = tr.dataset.cls; S.mat.user = null; m.style.display = 'none'; changed(true); }));
  $$('[data-tf]', m).forEach(b => b.addEventListener('click', () => { $$('[data-tf]', m).forEach(x => x.classList.toggle('on', x === b)); $('#ctabBody', m).innerHTML = tab(b.dataset.tf); bind(); }));
  bind();
  $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
}
const USER_FIELDS = [['name', 'Nazwa materiału', 'txt'], ['fam', 'Zasady (γ_M, k_h, k_cr, β_n…) jak dla', 'fam'], ['fmk', 'f_{m,k} – zginanie', 'MPa'], ['ft0k', 'f_{t,0,k} – rozciąganie wzdłuż włókien', 'MPa'], ['ft90k', 'f_{t,90,k} – rozciąganie w poprzek włókien', 'MPa'], ['fc0k', 'f_{c,0,k} – ściskanie wzdłuż włókien', 'MPa'], ['fc90k', 'f_{c,90,k} – ściskanie w poprzek włókien', 'MPa'], ['fvk', 'f_{v,k} – ścinanie', 'MPa'], ['E0m', 'E_{0,mean}', 'GPa'], ['E005', 'E_{0,05}', 'GPa'], ['E90m', 'E_{90,mean}', 'GPa'], ['Gm', 'G_{mean}', 'GPa'], ['G05', 'G_{05}', 'GPa'], ['rhok', 'ρ_{k}', 'kg/m³'], ['rhom', 'ρ_{mean}', 'kg/m³'], ['fmflat', 'f_{m,k} płasko (LVL; puste – jak f_m,k)', 'MPa'], ['fvflat', 'f_{v,k} płasko (LVL)', 'MPa'], ['s', 's – wykładnik efektu skali (LVL)', '']];
function matUserPopup() {
  const base = S.mat.user ? S.mat.user : Object.assign({}, E.MATS[S.mat.cls] || E.MATS.C24, { base: S.mat.cls });
  const u = Object.assign({}, base);
  if (!S.mat.user) { u.name = 'Materiał własny (' + (base.id || 'C24') + ')'; }
  const m = $('#modal');
  m.innerHTML = `<div class="dlg"><h3>Parametry materiału</h3><p class="hint">Zmiana dowolnej wartości tworzy „materiał własny” (np. wg deklaracji właściwości użytkowych producenta lub ekspertyzy). Wartości charakterystyczne – dla wysokości odniesienia (150 mm drewno lite, 600 mm klejone, 300 mm LVL).</p>
    <div class="fields" style="padding:0">${USER_FIELDS.map(([k, l, unit]) => unit === 'txt' ? `<div class="row wide"><label>${sym(l)}</label><input class="txt" data-u="${k}" value="${esc(u[k] || '')}"></div>`
      : unit === 'fam' ? `<div class="row wide"><label>${sym(l)}</label><select data-u="fam">${['C', 'D', 'GLh', 'LVL'].map(f => `<option value="${f}" ${(u.fam === f || (u.fam === 'U' && f === 'C') || (u.fam === 'GLc' && f === 'GLh')) ? 'selected' : ''}>${esc(E.FAM[f].name)}</option>`).join('')}</select></div>`
      : `<div class="row"><label>${sym(l)}</label><input class="txt" data-u="${k}" value="${esc(showNum(u[k] === undefined ? '' : u[k]))}" style="text-align:right"><span class="unit">${unit}</span></div>`).join('')}</div>
    <div class="dbtn">${S.mat.user ? '<button class="btn dng" data-reset>Przywróć klasę normową</button>' : ''}<button class="btn" data-close>Anuluj</button><button class="btn pri" data-ok>Zastosuj</button></div></div>`;
  m.style.display = 'flex';
  $('[data-close]', m).onclick = () => { m.style.display = 'none'; };
  const rs = $('[data-reset]', m); if (rs) rs.onclick = () => { S.mat.cls = (S.mat.user && S.mat.user.base) || 'C24'; S.mat.user = null; m.style.display = 'none'; changed(true); };
  $('[data-ok]', m).onclick = () => {
    const o = Object.assign({}, u);
    let bad = false;
    $$('[data-u]', m).forEach(el => { const k = el.dataset.u; if (k === 'name' || k === 'fam') { o[k] = el.value; return; } const v = parseNum(el.value); if (el.value.trim() === '' && (k === 'fmflat' || k === 'fvflat' || k === 's')) { delete o[k]; return; } if (v === null || v < 0) { el.classList.add('bad'); bad = true; } else o[k] = v; });
    if (bad) { toast('Popraw zaznaczone wartości.'); return; }
    o.base = o.base || base.id || 'C24'; S.mat.user = o; S.mat.cls = 'U';
    m.style.display = 'none'; changed(true);
  };
}
// tablica k_mod i k_def dla klasy użytkowania
function kmodTabHTML() {
  const m = mtNow(); if (!m) return '';
  return `<table class="sttab"><tr><th>Klasa trwania</th>${E.DUR.map(d => `<th>${esc(E.DUR_NAME[d])}</th>`).join('')}</tr><tr><td>k<sub>mod</sub> (tab. 3.1)</td>${E.DUR.map(d => `<td style="text-align:center">${fmt(m.kmod[d], 2)}</td>`).join('')}</tr></table>
    <div class="hint">k<sub>def</sub> = ${fmt(m.kdef0, 2)} (tab. 3.2)${m.kdef !== m.kdef0 ? ` + 1,0 (drewno mokre) = <b>${fmt(m.kdef, 2)}</b>` : ''}. Klasę trwania każdego obciążenia zmiennego ustawisz w jego opisie (domyślnie wg tab. 2.2: użytkowe stropów – średniotrwałe, magazyny – długotrwałe, dachy kat. H, śnieg, wiatr – krótkotrwałe). W kombinacji przyjmuje się k<sub>mod</sub> obciążenia o najkrótszym czasie trwania (3.1.3(2)) – program sprawdza osobno kombinacje z obciążeniami o czasie trwania nie krótszym niż każda z klas.</div>`;
}
function hintSec() {
  if (!R || !R.md || !R.md.segs.length) return '';
  const s = R.md.segs[0].sec, mt = R.mt;
  return `A = ${fmt(s.A / 100, 1)} cm², I<sub>y</sub> = ${fmt(s.Iy / 1e4, 0)} cm⁴, W<sub>y</sub> = ${fmt(s.Wy / 1e3, 1)} cm³, I<sub>z</sub> = ${fmt(s.Iz / 1e4, 0)} cm⁴, h/b = ${fmt(s.h / s.b, 2)} · ciężar własny ${fmt(mt.gamma * s.A * 1e-6, 3)} kN/m` + (S.geom.n > 1 ? ` · przekrój ${S.geom.n}×${fmt(S.geom.b, 0)} = ${fmt(s.b, 0)} mm` : '') +
    (R.md.segs.some(q => q.own) ? '<br>Inne przekroje w odcinkach: ' + R.md.segs.filter(q => q.own).map(q => `${esc(q.label)} – ${fmt(q.b1, 0)}×${fmt(q.h, 0)}`).join('; ') : '');
}
function hintLtb() {
  if (!R || !R.segData) return '';
  return R.segData.map(sd => {
    const z = sd.ltb, nm = R.md.segs.length > 1 ? `<b>${esc(sd.seg.label)}</b>: ` : '';
    const one = (q, l) => q.kcrit >= 1 && !q.lef ? `${l}: ${esc(q.src)}` : `${l}: l<sub>ef</sub> = ${fmt(q.lef / 1000, 2)} m, λ<sub>rel,m</sub> = ${fmt(q.lam, 3)}, k<sub>crit</sub> = <b>${fmt(q.kcrit, 3)}</b>`;
    return nm + one(z.plus, 'M &gt; 0') + ' · ' + one(z.minus, 'M &lt; 0');
  }).join('<br>');
}
function hintFire() {
  if (!R || !R.fireData) return '';
  const c = R.fireData.ch;
  return `β<sub>n</sub> = ${fmt(c.bn, 2)} mm/min${c.prot !== 'none' ? `, t<sub>ch</sub> = ${fmt(c.tch, 1)} min, t<sub>f</sub> = ${fmt(c.tf, 1)} min` : ''} → d<sub>char,n</sub> = ${fmt(c.dchar, 1)} mm, k<sub>0</sub> = ${fmt(c.k0, 2)}, d<sub>ef</sub> = <b>${fmt(c.def, 1)} mm</b>; przekrój resztkowy: ` + R.fireData.segs.map(q => `${fmt(Math.max(0, q.bfi), 0)}×${fmt(Math.max(0, q.hfi), 0)} mm`).join(', ');
}
function deflLimHTML() {
  const man = S.sls.lim === 'manual';
  const row = (lab, key, j) => `<td>${man ? `<input class="txt sm" data-dl="${key}.${j}" value="${showNum(S.sls[key][j])}" style="width:56px;text-align:right">` : (S.sls[key][j] ? fmt(S.sls[key][j], 0) : '—')}</td>`;
  return `<table class="sttab"><tr><th></th><th>w<sub>inst</sub></th><th>w<sub>net,fin</sub></th><th>w<sub>fin</sub></th></tr>
    <tr><td>sprawdzaj</td>${[0, 1, 2].map(j => `<td style="text-align:center"><input type="checkbox" data-du="${j}" ${S.sls.use[j] ? 'checked' : ''}></td>`).join('')}</tr>
    <tr><td>przęsła L/…</td>${[0, 1, 2].map(j => row('', 'span', j)).join('')}</tr>
    <tr><td>wsporniki l<sub>w</sub>/…</td>${[0, 1, 2].map(j => row('', 'cant', j)).join('')}</tr></table>`;
}
function bindDefl(host) {
  $$('[data-du]', host).forEach(cb => cb.addEventListener('change', () => { S.sls.use[+cb.dataset.du] = cb.checked; changed(false); }));
  $$('[data-dl]', host).forEach(inp => inp.addEventListener('change', () => { const [k, j] = inp.dataset.dl.split('.'); const v = parseNum(inp.value); if (v === null || v < 0) { inp.classList.add('bad'); return; } inp.classList.remove('bad'); S.sls[k][+j] = v; changed(false); }));
}

/* ------------------------------------------------------------- listy obciążeń */
const LIST_TITLE = { perm: 'Obciążenia stałe G (PN-EN 1991-1-1)', imp: 'Obciążenia użytkowe (PN-EN 1991-1-1)', snow: 'Obciążenie śniegiem (PN-EN 1991-1-3)', wind: 'Oddziaływanie wiatru (PN-EN 1991-1-4)', other: 'Inne obciążenia zmienne (ψ podane ręcznie)', acc: 'Obciążenia wyjątkowe A_d' };
const LIST_DEF = {
  perm: n => ({ kind: 'perm', name: `Stałe ${n}`, q: 1 }),
  imp: n => ({ kind: 'imp', name: `Użytkowe ${n}`, cat: 'A', sub: 'A', bw: impBwDef(), qAuto: true, q: 0 }),
  snow: () => ({ kind: 'snow', name: 'Śnieg', alt: 'low', q: 1, proj: 'hor' }),
  wind: n => ({ kind: 'wind', name: n > 1 ? `Wiatr ${n}` : 'Wiatr', q: 0.5, dir: 'y' }),
  other: n => ({ kind: 'other', name: `Inne ${n}`, q: 1, p0: 0.7, p1: 0.5, p2: 0.3 }),
  acc: n => ({ kind: 'acc', name: `Wyjątkowe ${n}`, q: 0, pts: [{ P: 10, a: '', ref: 'L' }] }),
};
const KIND_COLOR = { G: '#4a5466', perm: '#4a5466', imp: '#1d5bb8', snow: '#0e8fa8', wind: '#1d7f3c', other: '#6a3fb5', acc: '#c0262d' };
const KIND_NAME = { perm: 'stałe', imp: 'użytkowe', snow: 'śnieg', wind: 'wiatr', other: 'inne zmienne', acc: 'wyjątkowe' };
const listArr = kind => kind === 'acc' ? S.loads.acc : kind === 'perm' ? S.loads.perm : S.loads.var;
const arrKey = kind => kind === 'acc' ? 'acc' : kind === 'perm' ? 'perm' : 'var';
const arrByKey = k => k === 'acc' ? S.loads.acc : k === 'perm' ? S.loads.perm : S.loads.var;
const REFS = [['L', 'od lewej [m]'], ['R', 'od prawej [m]'], ['rel', 'względnie (0–1)']];
const DIRS = [['g', 'pionowo (grawitacyjne)'], ['y', '⊥ do osi belki (y)'], ['z', 'poziomo, bocznie (z)']];
function model() { try { return E.beamModel(E.normalize(S)); } catch (e) { return { segs: [], sups: [], Ltot: S.geom.L }; } }
function impBwDef() { const last = S.loads.var.filter(it => it.kind === 'imp' && +it.bw > 0).pop(); return last ? +last.bw : (S.sls.vib.s || 0.6); }
// identyfikator obciążenia jak w kombinacjach (G1, Q1, A1…)
function idOf(arr, i) {
  if (arr === 'perm') return 'G' + (i + 1);
  if (arr === 'acc') return 'A' + (i + 1);
  let n = 0; for (let j = 0; j <= i; j++) if (!S.loads.var[j].off) n++;
  return S.loads.var[i] && S.loads.var[i].off ? '—' : 'Q' + n;
}
function spanOpts(it) {
  const md = model();
  let o = `<option value="0" ${!it.span && !(it.spans && it.spans.length) ? 'selected' : ''}>cała belka</option>`;
  md.segs.forEach((s, i) => { o += `<option value="${i + 1}" ${it.span === i + 1 && !(it.spans && it.spans.length) ? 'selected' : ''}>${esc(cap(s.label))}</option>`; });
  if (it.spans && it.spans.length) o += `<option value="m" selected>odcinki ${it.spans.join(', ')}</option>`;
  return o;
}
function itemHTML(arr, i, it) {
  const key = `${arr}.${i}`, col = KIND_COLOR[it.kind] || '#4a5466';
  const ps = arr === 'var' ? E.psiOf(it) : null, dur = E.durOf(it), durA = E.durAuto(it);
  let h = `<div class="litem${it.off ? ' off' : ''}" data-item="${key}" style="border-left-color:${col}">`;
  h += `<div class="lrow"><span class="lid">${idOf(arr, i)}</span><input class="txt lname" data-f="name" value="${esc(it.name)}" placeholder="nazwa" spellcheck="false"><label class="chk sm" title="Obciążenie aktywne (odznacz, aby chwilowo pominąć)"><input type="checkbox" data-f="on" ${it.off ? '' : 'checked'}></label><button class="del" data-del="${key}" title="Usuń obciążenie">×</button></div>`;
  if (it.kind === 'imp') {
    const L = E.IMP_EC1[it.cat] || E.IMP_EC1.B;
    h += `<div class="lrow"><select data-f="cat" title="Kategoria użytkowania (PN-EN 1991-1-1 tab. 6.1; ψ wg PN-EN 1990 tab. A1.1)">${Object.keys(E.IMP_EC1).map(c => `<option value="${c}" ${c === it.cat ? 'selected' : ''}>${esc(E.PSI[c].name)}</option>`).join('')}</select>${L.length > 1 ? `<select data-f="sub">${L.map(q => `<option value="${q.id}" ${q.id === it.sub ? 'selected' : ''}>${esc(q.n)}</option>`).join('')}</select>` : ''}</div>`;
    h += `<div class="lrow">pasmo b<input class="txt sm" data-f="bw" value="${esc(showNum(it.bw))}" placeholder="1,0" title="Szerokość pasma zbierania obciążenia (rozstaw belek) – przelicza kN/m² na kN/m"><span class="u">m</span>${ec1Txt(it)}</div>`;
  }
  if (it.kind === 'snow') h += `<div class="lrow"><select data-f="alt"><option value="low" ${it.alt !== 'high' ? 'selected' : ''}>H ≤ 1000 m n.p.m. (ψ₀ = 0,5; ψ₂ = 0)</option><option value="high" ${it.alt === 'high' ? 'selected' : ''}>H &gt; 1000 m n.p.m. (ψ₀ = 0,7; ψ₂ = 0,2)</option></select></div>`;
  h += `<div class="lrow">q<input class="txt" data-f="q" value="${esc(showNum(it.q))}"><span class="u">kN/m</span>→ q₂<input class="txt sm" data-f="q2" value="${esc(showNum(it.q2))}" placeholder="= q" title="Wartość na końcu zakresu – obciążenie trapezowe (puste – równomierne)"><span class="u">kN/m</span><select data-f="span" title="Zakres obciążenia">${spanOpts(it)}</select></div>`;
  h += `<div class="lrow">od x₁<input class="txt sm" data-f="x1" value="${esc(showNum(it.x1))}" placeholder="0">do x₂<input class="txt sm" data-f="x2" value="${esc(showNum(it.x2))}" placeholder="koniec"><span class="u">m (od początku zakresu)</span></div>`;
  (it.pts || []).forEach((p, j) => {
    h += `<div class="lrow pt">P<input class="txt" data-p="${j}.P" value="${esc(showNum(p.P))}"><span class="u">kN</span>w a =<input class="txt sm" data-p="${j}.a" value="${esc(showNum(p.a))}" placeholder="½"><select class="ref" data-p="${j}.ref">${REFS.map(([v, l]) => `<option value="${v}" ${p.ref === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="lx" title="Długość docisku pod siłą (do sprawdzenia 6.1.5)">l<sub>d</sub></span><input class="txt sm" data-p="${j}.lb" value="${esc(showNum(p.lb))}" placeholder="—" title="Długość docisku pod siłą skupioną [mm] – sprawdzenie σc,90 (puste – bez sprawdzenia)"><span class="u">mm</span><button class="del sm" data-pdel="${j}" title="Usuń siłę">×</button></div>`;
  });
  h += `<div class="lrow"><button class="addp" data-padd="1">+ siła skupiona</button></div>`;
  h += `<details class="lmore"${it.dir !== 'g' || it.proj === 'hor' || it.mt || it.N || it.dur || it.kind === 'other' ? ' open' : ''}><summary>kierunek, czas trwania${arr === 'var' ? ', ψ' : ''}, skręcanie, siła osiowa</summary>`;
  h += `<div class="lrow">kierunek<select data-f="dir">${DIRS.map(([v, l]) => `<option value="${v}" ${it.dir === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${it.dir === 'g' ? `<select data-f="proj" title="Wartość obciążenia podana na długość osi belki albo na rzut poziomy (ma znaczenie przy β ≠ 0)"><option value="len" ${it.proj !== 'hor' ? 'selected' : ''}>na długość osi</option><option value="hor" ${it.proj === 'hor' ? 'selected' : ''}>na rzut poziomy</option></select>` : ''}</div>`;
  if (arr !== 'perm') h += `<div class="lrow">trwanie<select data-f="dur">${arr === 'acc' ? '' : `<option value="" ${!it.dur ? 'selected' : ''}>auto – ${esc(E.DUR_NAME[durA])}</option>`}${E.DUR.map(d => `<option value="${d}" ${it.dur === d ? 'selected' : ''}>${esc(E.DUR_NAME[d])}</option>`).join('')}</select><span class="u">k<sub>mod</sub> = ${(() => { const m = mtNow(); return m ? fmt(m.kmod[dur], 2) : ''; })()}</span></div>`;
  if (it.kind === 'other') h += `<div class="lrow">ψ₀<input class="txt sm" data-f="p0" value="${esc(showNum(it.p0))}">ψ₁<input class="txt sm" data-f="p1" value="${esc(showNum(it.p1))}">ψ₂<input class="txt sm" data-f="p2" value="${esc(showNum(it.p2))}"></div>`;
  h += `<div class="lrow">m<sub>t</sub><input class="txt sm" data-f="mt" value="${esc(showNum(it.mt))}" title="Moment skręcający rozłożony na zakresie obciążenia (np. od mimośrodu oparcia belek stropowych)"><span class="u">kNm/m</span>N<input class="txt sm" data-f="N" value="${esc(showNum(it.N))}" title="Siła podłużna stała na całej długości belki (+ ściskanie), np. od stężeń"><span class="u">kN (+ ściskanie)</span></div>`;
  if (it.pts && it.pts.length) h += `<div class="lrow">T w siłach skupionych:${it.pts.map((p, j) => `<input class="txt sm" data-p="${j}.T" value="${esc(showNum(p.T))}" title="Moment skręcający skupiony w miejscu siły ${j + 1}">`).join('')}<span class="u">kNm</span></div>`;
  h += `</details>`;
  if (ps) h += `<div class="lpsi">ψ₀ = ${fmtPsi(ps.p0)}, ψ₁ = ${fmtPsi(ps.p1)}, ψ₂ = ${fmtPsi(ps.p2)} · ${esc(E.DUR_NAME[dur])}${it.kind === 'snow' && dur === 'S' ? ' (w rejonach o długo zalegającym śniegu część obciążenia – średniotrwała, tab. 2.2)' : ''}</div>`;
  else if (arr === 'acc') h += `<div class="lpsi">kombinacja wyjątkowa 6.11b, k<sub>mod</sub> – chwilowe, γ<sub>M</sub> = ${fmt(S.coef.gMA, 2)}</div>`;
  return h + '</div>';
}
const fmtPsi = v => fmt(v, Math.abs(v * 10 - Math.round(v * 10)) > 1e-6 ? 2 : 1);
function ec1Txt(it) {
  const L = E.IMP_EC1[it.cat] || E.IMP_EC1.B, q = L.find(z => z.id === it.sub) || L[0];
  const rgs = a => a[0] === a[1] ? fmt(a[0], 1) : `${fmt(a[0], 1)}–${fmt(a[1], 1)}`;
  const bw = +it.bw > 0 ? +it.bw : 1;
  return `<span class="ec1t" title="${esc(q.d)}">q<sub>k</sub> = ${rgs(q.q)} kN/m² (tab. ${q.t})${it.qAuto ? ` → <b>${fmt(q.q[1] * bw, 2)} kN/m</b> auto` : ` <button class="lnk" data-qauto="1" title="q = górna granica × pasmo b">przyjmij ${fmt(q.q[1] * bw, 2)}</button>`}</span>`;
}
function renderList(kind) {
  const arr = arrKey(kind), A = listArr(kind);
  let h = `<div class="lhead"><span>${esc(LIST_TITLE[kind])}</span><button class="addb" data-add="${kind}">+ dodaj</button></div>`;
  const idx = A.map((it, i) => i).filter(i => arr !== 'var' || A[i].kind === kind);
  if (!idx.length) return h + '';
  idx.forEach(i => { h += itemHTML(arr, i, A[i]); });
  return h;
}
function hintLoads() {
  if (!R || !R.cb) return '';
  const st = R.st, nU = R.cb.uls.length;
  let gsw = 0; st.items.forEach(o => { if (o.sw) gsw = Math.max(...o.qsw); });
  const fams = Array.from(new Set(R.cb.uls.map(c => c.fam))).map(d => `${E.DUR_NAME[d]} (k<sub>mod</sub> = ${fmt(R.mt.kmod[d], 2)})`);
  return `Ciężar własny ${fmt(gsw, 3)} kN/m · kombinacji SGN: <b>${nU}</b>${R.cb.acc.length ? `, wyjątkowych: ${R.cb.acc.length}` : ''} · grupy trwania: ${fams.join(', ')}`;
}
// edycja pól obciążeń (lista w Danych i okno obciążenia)
function bindItems(host) {
  $$('[data-add]', host).forEach(b => b.addEventListener('click', () => {
    const kind = b.dataset.add, A = listArr(kind);
    const n = A.filter(it => arrKey(kind) !== 'var' || it.kind === kind).length + 1;
    A.push(E.normItem(LIST_DEF[kind](n), kind === 'acc' || kind === 'perm' ? kind : undefined));
    changed(true);
  }));
  $$('.litem', host).forEach(el => {
    const [arr, i] = el.dataset.item.split('.'), it = arrByKey(arr)[+i];
    if (!it) return;
    const upd = (re) => { const n = E.normItem(it, arr === 'var' ? it.kind : arr); Object.assign(it, n); changed(re); };
    $$('[data-f]', el).forEach(inp => {
      const f = inp.dataset.f;
      const ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'change';
      inp.addEventListener(ev, () => {
        if (f === 'on') { it.off = !inp.checked; upd(true); return; }
        if (f === 'name') { it.name = inp.value; upd(false); return; }
        if (f === 'span') { if (inp.value !== 'm') { it.span = +inp.value; it.spans = []; it.x1 = ''; it.x2 = ''; } upd(true); return; }
        if (['cat', 'sub', 'alt', 'dir', 'proj', 'dur'].includes(f)) { it[f] = inp.value; if (f === 'cat') it.sub = ''; upd(true); return; }
        const raw = inp.value.trim();
        if (raw === '' && ['q2', 'x1', 'x2', 'bw'].includes(f)) { it[f] = ''; if (f === 'bw' && it.qAuto) { /* przelicz */ } upd(f === 'bw'); return; }
        const v = parseNum(raw);
        if (v === null) { inp.classList.add('bad'); return; }
        inp.classList.remove('bad');
        if (f === 'q' && it.kind === 'imp') it.qAuto = false;
        it[f] = v; upd(f === 'q' || f === 'bw');
      });
    });
    $$('[data-p]', el).forEach(inp => inp.addEventListener('change', () => {
      const [j, f] = inp.dataset.p.split('.'), p = it.pts[+j];
      if (f === 'ref') { p.ref = inp.value; upd(false); return; }
      const raw = inp.value.trim();
      if (raw === '' && (f === 'a' || f === 'lb')) { p[f] = ''; upd(false); return; }
      const v = parseNum(raw); if (v === null) { inp.classList.add('bad'); return; }
      inp.classList.remove('bad'); p[f] = v; upd(false);
    }));
    $$('[data-pdel]', el).forEach(b => b.addEventListener('click', () => { it.pts.splice(+b.dataset.pdel, 1); upd(true); }));
    const pa = $('[data-padd]', el); if (pa) pa.addEventListener('click', () => { it.pts.push({ P: 5, a: '', ref: 'L', lb: '' }); upd(true); });
    const qa = $('[data-qauto]', el); if (qa) qa.addEventListener('click', () => { it.qAuto = true; upd(true); });
  });
  $$('[data-del]', host).forEach(b => b.addEventListener('click', () => {
    const [arr, i] = b.dataset.del.split('.'); arrByKey(arr).splice(+i, 1); changed(true);
  }));
}
