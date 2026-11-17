/* =====================================================================
   BelkaDR – silnik obliczeń belek drewnianych wg PN-EN 1995-1-1
   (wartości parametrów krajowych wg Załącznika Krajowego PL tam, gdzie
   występują), PN-EN 1990 (kombinacje), PN-EN 1991-1-1 (obciążenia
   użytkowe), PN-EN 1995-1-2 (odporność ogniowa – metoda zredukowanego
   przekroju), PN-EN 338:2016, PN-EN 14080:2013.
   Jednostki: statyka – kN, m (EI w kNm²); przekroje – mm; naprężenia – MPa.
   ===================================================================== */
(function (root) {
'use strict';

/* ---------------------------------------------------------------- tabele */
// klasy trwania obciążenia (PN-EN 1995-1-1, tab. 2.1) – kolejność od najdłuższego
const DUR = ['P', 'L', 'M', 'S', 'I'];
const DUR_NAME = { P: 'stałe', L: 'długotrwałe', M: 'średniotrwałe', S: 'krótkotrwałe', I: 'chwilowe' };
const DUR_DESC = { P: 'powyżej 10 lat (ciężar własny)', L: '6 miesięcy – 10 lat (składowanie)', M: '1 tydzień – 6 miesięcy (obciążenia użytkowe stropów)', S: 'poniżej 1 tygodnia (śnieg, wiatr)', I: 'chwilowe (wiatr – wg EN, wyjątkowe)' };
// k_mod – tablica 3.1 (drewno lite, klejone warstwowo, LVL – jednakowe wartości)
const KMOD = {
  1: { P: 0.60, L: 0.70, M: 0.80, S: 0.90, I: 1.10 },
  2: { P: 0.60, L: 0.70, M: 0.80, S: 0.90, I: 1.10 },
  3: { P: 0.50, L: 0.55, M: 0.65, S: 0.70, I: 0.90 },
};
// k_def – tablica 3.2
const KDEF = { 1: 0.60, 2: 0.80, 3: 2.00 };
const SC_DESC = {
  1: 'wilgotność drewna odpowiadająca temp. 20°C i wilgotności powietrza przekraczającej 65% tylko przez kilka tygodni w roku (wnętrza ogrzewane); średnia wilgotność drewna iglastego ≤ 12%',
  2: 'wilgotność drewna odpowiadająca temp. 20°C i wilgotności powietrza przekraczającej 85% tylko przez kilka tygodni w roku (pomieszczenia nieogrzewane pod dachem, wiaty); średnia wilgotność drewna iglastego ≤ 20%',
  3: 'warunki klimatyczne prowadzące do wilgotności drewna większej niż w klasie 2 (elementy na zewnątrz, niezadaszone)',
};

// rodziny materiałów: γ_M (tab. 2.3, ZK PL), k_cr (6.1.7), k_fi (EN 1995-1-2, tab. 2.1), k_n (6.5.2), β_n/β_0 (EN 1995-1-2, tab. 3.1), β_c (6.3.2)
const FAM = {
  C: { name: 'Drewno lite iglaste (PN-EN 338)', short: 'drewno lite', kind: 'solid', gM: 1.3, kcr: 0.67, kfi: 1.25, kn: 5.0, betaN: 0.8, beta0: 0.65, kc90: 1.5, betaC: 0.2, khRef: 150, khMax: 1.3, khExp: 0.2 },
  D: { name: 'Drewno lite liściaste (PN-EN 338)', short: 'drewno lite liściaste', kind: 'solid', gM: 1.3, kcr: 0.67, kfi: 1.25, kn: 5.0, betaN: null, beta0: null, kc90: 1.0, betaC: 0.2, khRef: 150, khMax: 1.3, khExp: 0.2 },
  GLh: { name: 'Drewno klejone warstwowo jednorodne (PN-EN 14080)', short: 'drewno klejone', kind: 'glulam', gM: 1.25, kcr: 0.67, kfi: 1.15, kn: 6.5, betaN: 0.7, beta0: 0.65, kc90: 1.75, betaC: 0.1, khRef: 600, khMax: 1.1, khExp: 0.1 },
  GLc: { name: 'Drewno klejone warstwowo kombinowane (PN-EN 14080)', short: 'drewno klejone', kind: 'glulam', gM: 1.25, kcr: 0.67, kfi: 1.15, kn: 6.5, betaN: 0.7, beta0: 0.65, kc90: 1.75, betaC: 0.1, khRef: 600, khMax: 1.1, khExp: 0.1 },
  LVL: { name: 'Fornir klejony warstwowo LVL (PN-EN 14374)', short: 'LVL', kind: 'lvl', gM: 1.2, kcr: 1.0, kfi: 1.1, kn: 4.5, betaN: 0.7, beta0: 0.65, kc90: 1.0, betaC: 0.1, khRef: 300, khMax: 1.2, khExp: null },
  U: { name: 'Materiał własny (parametry podane ręcznie)', short: 'materiał własny', kind: 'solid', gM: 1.3, kcr: 0.67, kfi: 1.25, kn: 5.0, betaN: 0.8, beta0: 0.65, kc90: 1.0, betaC: 0.2, khRef: 150, khMax: 1.3, khExp: 0.2 },
};
// [nazwa, f_m,k, f_t,0,k, f_t,90,k, f_c,0,k, f_c,90,k, f_v,k, E_0,mean, E_0,05, E_90,mean, G_mean, ρ_k, ρ_mean]  (MPa, kN/mm², kg/m³)
const C_ROWS = [
  ['C14', 14, 7.2, 0.4, 16, 2.0, 3.0, 7.0, 4.7, 0.23, 0.44, 290, 350],
  ['C16', 16, 8.5, 0.4, 17, 2.2, 3.2, 8.0, 5.4, 0.27, 0.50, 310, 370],
  ['C18', 18, 10.0, 0.4, 18, 2.2, 3.4, 9.0, 6.0, 0.30, 0.56, 320, 380],
  ['C20', 20, 11.5, 0.4, 19, 2.3, 3.6, 9.5, 6.4, 0.32, 0.59, 330, 400],
  ['C22', 22, 13.0, 0.4, 20, 2.4, 3.8, 10.0, 6.7, 0.33, 0.63, 340, 410],
  ['C24', 24, 14.5, 0.4, 21, 2.5, 4.0, 11.0, 7.4, 0.37, 0.69, 350, 420],
  ['C27', 27, 16.5, 0.4, 22, 2.5, 4.0, 11.5, 7.7, 0.38, 0.72, 360, 430],
  ['C30', 30, 19.0, 0.4, 24, 2.7, 4.0, 12.0, 8.0, 0.40, 0.75, 380, 460],
  ['C35', 35, 22.5, 0.4, 25, 2.7, 4.0, 13.0, 8.7, 0.43, 0.81, 390, 470],
  ['C40', 40, 26.0, 0.4, 27, 2.7, 4.0, 14.0, 9.4, 0.47, 0.88, 400, 480],
  ['C45', 45, 30.0, 0.4, 29, 2.7, 4.0, 15.0, 10.1, 0.50, 0.94, 410, 490],
  ['C50', 50, 33.5, 0.4, 30, 2.7, 4.0, 16.0, 10.7, 0.53, 1.00, 430, 520],
];
const D_ROWS = [
  ['D18', 18, 11, 0.6, 18, 4.8, 3.5, 9.5, 8.0, 0.63, 0.59, 475, 570],
  ['D24', 24, 14, 0.6, 21, 4.9, 3.7, 10.0, 8.4, 0.67, 0.62, 485, 580],
  ['D27', 27, 16, 0.6, 22, 5.1, 3.8, 10.5, 8.8, 0.70, 0.66, 510, 610],
  ['D30', 30, 18, 0.6, 24, 5.3, 3.9, 11.0, 9.2, 0.73, 0.69, 530, 640],
  ['D35', 35, 21, 0.6, 25, 5.4, 4.1, 12.0, 10.1, 0.80, 0.75, 540, 650],
  ['D40', 40, 24, 0.6, 27, 5.5, 4.2, 13.0, 10.9, 0.87, 0.81, 550, 660],
  ['D45', 45, 27, 0.6, 29, 5.8, 4.4, 13.5, 11.3, 0.90, 0.84, 580, 700],
  ['D50', 50, 30, 0.6, 30, 6.2, 4.5, 14.0, 11.8, 0.93, 0.88, 620, 740],
  ['D55', 55, 33, 0.6, 32, 6.6, 4.7, 15.5, 13.0, 1.03, 0.97, 660, 790],
  ['D60', 60, 36, 0.6, 33, 10.5, 4.8, 17.0, 14.3, 1.13, 1.06, 700, 840],
  ['D65', 65, 39, 0.6, 35, 11.3, 5.0, 18.5, 15.5, 1.23, 1.16, 750, 900],
  ['D70', 70, 42, 0.6, 36, 12.0, 5.0, 20.0, 16.8, 1.33, 1.25, 800, 960],
  ['D75', 75, 45, 0.6, 37, 12.8, 5.0, 22.0, 18.5, 1.47, 1.38, 850, 1020],
  ['D80', 80, 48, 0.6, 38, 13.5, 5.0, 24.0, 20.2, 1.60, 1.50, 900, 1080],
];
// PN-EN 14080:2013, tab. 5: [nazwa, f_m,g,k, f_t,0,g,k, f_t,90,g,k, f_c,0,g,k, f_c,90,g,k, f_v,g,k, E_0,g,mean, E_0,g,05, E_90,g,mean, G_g,mean, ρ_g,k, ρ_g,mean] (+ G_g,05 = 0,54 kN/mm²)
const GL_ROWS = [
  ['GL20h', 20, 16.0, 0.5, 20.0, 2.5, 3.5, 8.4, 7.0, 0.30, 0.65, 340, 370],
  ['GL22h', 22, 17.6, 0.5, 22.0, 2.5, 3.5, 10.5, 8.8, 0.30, 0.65, 370, 410],
  ['GL24h', 24, 19.2, 0.5, 24.0, 2.5, 3.5, 11.5, 9.6, 0.30, 0.65, 385, 420],
  ['GL26h', 26, 20.8, 0.5, 26.0, 2.5, 3.5, 12.1, 10.1, 0.30, 0.65, 405, 445],
  ['GL28h', 28, 22.3, 0.5, 28.0, 2.5, 3.5, 12.6, 10.5, 0.30, 0.65, 425, 460],
  ['GL30h', 30, 24.0, 0.5, 30.0, 2.5, 3.5, 13.6, 11.3, 0.30, 0.65, 430, 480],
  ['GL32h', 32, 25.6, 0.5, 32.0, 2.5, 3.5, 14.2, 11.8, 0.30, 0.65, 440, 490],
  ['GL20c', 20, 15.0, 0.5, 18.5, 2.5, 3.5, 10.4, 8.6, 0.30, 0.65, 355, 390],
  ['GL22c', 22, 16.0, 0.5, 20.0, 2.5, 3.5, 10.4, 8.6, 0.30, 0.65, 355, 390],
  ['GL24c', 24, 17.0, 0.5, 21.5, 2.5, 3.5, 11.0, 9.1, 0.30, 0.65, 365, 400],
  ['GL26c', 26, 19.0, 0.5, 23.5, 2.5, 3.5, 12.0, 10.0, 0.30, 0.65, 385, 420],
  ['GL28c', 28, 19.5, 0.5, 24.0, 2.5, 3.5, 12.5, 10.4, 0.30, 0.65, 390, 420],
  ['GL30c', 30, 19.5, 0.5, 24.5, 2.5, 3.5, 13.0, 10.8, 0.30, 0.65, 390, 430],
  ['GL32c', 32, 19.5, 0.5, 24.5, 2.5, 3.5, 13.5, 11.2, 0.30, 0.65, 400, 440],
];
// LVL – wartości przykładowe wg deklaracji właściwości użytkowych producentów (sprawdzić z DoP konkretnego wyrobu!)
// f_m (krawędziowo, h = 300 mm), s – wykładnik efektu skali, f_m,flat (płasko), f_v (krawędziowo), f_v,flat, f_c,90 (krawędziowo)
const LVL_ROWS = [
  { id: 'LVL-S', name: 'LVL 48P / Kerto-S (przykład)', fmk: 44, s: 0.12, fmflat: 50, ft0k: 35, ft90k: 0.8, fc0k: 35, fc90k: 6.0, fvk: 4.1, fvflat: 2.3, E0m: 13.8, E005: 11.6, E90m: 0.43, Gm: 0.60, G05: 0.40, rhok: 480, rhom: 510 },
  { id: 'LVL-Q', name: 'LVL 36C / Kerto-Q (przykład)', fmk: 32, s: 0.12, fmflat: 36, ft0k: 26, ft90k: 6.0, fc0k: 26, fc90k: 9.0, fvk: 4.5, fvflat: 1.3, E0m: 10.5, E005: 8.8, E90m: 2.40, Gm: 0.60, G05: 0.40, rhok: 480, rhom: 510 },
];
const MATS = {}, MAT_LIST = [];
function addMat(fam, r) {
  const o = Array.isArray(r) ? { id: r[0], fmk: r[1], ft0k: r[2], ft90k: r[3], fc0k: r[4], fc90k: r[5], fvk: r[6], E0m: r[7], E005: r[8], E90m: r[9], Gm: r[10], rhok: r[11], rhom: r[12] } : Object.assign({}, r);
  o.fam = fam; o.name = o.name || o.id;
  if (fam === 'GLh' || fam === 'GLc') o.G05 = 0.54;
  if (!o.G05) o.G05 = Math.round(o.Gm * o.E005 / o.E0m * 1000) / 1000;
  MATS[o.id] = o; MAT_LIST.push(o);
}
C_ROWS.forEach(r => addMat('C', r)); D_ROWS.forEach(r => addMat('D', r));
GL_ROWS.forEach(r => addMat(r[0].endsWith('h') ? 'GLh' : 'GLc', r)); LVL_ROWS.forEach(r => addMat('LVL', r));
const FAM_ORDER = ['C', 'D', 'GLh', 'GLc', 'LVL', 'U'];
const FAM_COMMON = { C: 'C24', D: 'D30', GLh: 'GL24h', GLc: 'GL24c', LVL: 'LVL-S' };

// typowe wymiary handlowe (mm) – do doboru przekroju
const CATALOG = {
  C: { b: [38, 45, 50, 63, 75, 100, 120, 140, 160, 180, 200, 225, 250], h: [75, 100, 120, 125, 140, 150, 160, 175, 180, 200, 220, 225, 240, 250, 275, 300], hbMax: 6, Lmax: 6.0, desc: 'tarcica konstrukcyjna i KVH' },
  D: { b: [50, 63, 75, 100, 120, 140, 160, 180, 200, 250], h: [100, 120, 140, 160, 180, 200, 220, 240, 250, 280, 300], hbMax: 6, Lmax: 6.0, desc: 'tarcica z drewna liściastego' },
  GL: { b: [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280], h: [], hbMax: 10, Lmax: 30, desc: 'drewno klejone (lamele 40 mm)' },
  LVL: { b: [27, 33, 39, 45, 51, 57, 63, 69, 75, 90], h: [200, 225, 260, 300, 360, 400, 450, 500, 600, 700, 800, 900], hbMax: 15, Lmax: 25, desc: 'LVL (belki)' },
};
for (let h = 120; h <= 2000; h += 40) CATALOG.GL.h.push(h);
const catOf = fam => fam === 'GLh' || fam === 'GLc' ? CATALOG.GL : CATALOG[fam] || CATALOG.C;

// PN-EN 1990, tab. A1.1 – współczynniki ψ (budynki)
const PSI = {
  A: { name: 'Kat. A – powierzchnie mieszkalne', p0: 0.7, p1: 0.5, p2: 0.3 },
  B: { name: 'Kat. B – biura', p0: 0.7, p1: 0.5, p2: 0.3 },
  C: { name: 'Kat. C – miejsca zebrań', p0: 0.7, p1: 0.7, p2: 0.6 },
  D: { name: 'Kat. D – powierzchnie handlowe', p0: 0.7, p1: 0.7, p2: 0.6 },
  E: { name: 'Kat. E – magazyny', p0: 1.0, p1: 0.9, p2: 0.8 },
  F: { name: 'Kat. F – ruch pojazdów ≤ 30 kN', p0: 0.7, p1: 0.7, p2: 0.6 },
  G: { name: 'Kat. G – ruch pojazdów 30–160 kN', p0: 0.7, p1: 0.5, p2: 0.3 },
  H: { name: 'Kat. H – dachy', p0: 0.0, p1: 0.0, p2: 0.0 },
  S: { name: 'Śnieg (H ≤ 1000 m n.p.m.)', p0: 0.5, p1: 0.2, p2: 0.0 },
  W: { name: 'Wiatr', p0: 0.6, p1: 0.2, p2: 0.0 },
};
const SNOW_HIGH = { name: 'Śnieg (H > 1000 m n.p.m.)', p0: 0.7, p1: 0.5, p2: 0.2 };
// PN-EN 1991-1-1: zakresy q_k [kN/m²] i Q_k [kN] (tab. 6.2, 6.4, 6.8, 6.10); dur – klasa trwania wg PN-EN 1995-1-1 tab. 2.2
const IMP_EC1 = {
  A: [{ id: 'A', n: 'stropy', d: 'pomieszczenia mieszkalne, domy, pokoje w hotelach i szpitalach, toalety', q: [1.5, 2.0], Q: [2.0, 3.0], t: '6.2' },
    { id: 'As', n: 'schody', d: 'schody w budynkach kategorii A', q: [2.0, 4.0], Q: [2.0, 4.0], t: '6.2' },
    { id: 'Ab', n: 'balkony', d: 'balkony w budynkach kategorii A', q: [2.5, 4.0], Q: [2.0, 3.0], t: '6.2' }],
  B: [{ id: 'B', n: 'biura', d: 'powierzchnie biurowe', q: [2.0, 3.0], Q: [1.5, 4.5], t: '6.2' }],
  C: [{ id: 'C1', n: 'C1 – ze stołami', d: 'szkoły, kawiarnie, restauracje, stołówki, czytelnie, recepcje', q: [2.0, 3.0], Q: [3.0, 4.0], t: '6.2' },
    { id: 'C2', n: 'C2 – z zamocowanymi siedzeniami', d: 'kościoły, teatry, kina, sale konferencyjne i wykładowe, poczekalnie', q: [3.0, 4.0], Q: [2.5, 7.0], t: '6.2' },
    { id: 'C3', n: 'C3 – bez przeszkód dla ruchu ludzi', d: 'muzea, sale wystawowe, dostępy w budynkach publicznych', q: [3.0, 5.0], Q: [4.0, 7.0], t: '6.2' },
    { id: 'C4', n: 'C4 – z możliwą aktywnością fizyczną', d: 'sale taneczne, gimnastyczne, sceny', q: [4.5, 5.0], Q: [3.5, 7.0], t: '6.2' },
    { id: 'C5', n: 'C5 – dostępne dla tłumu', d: 'sale koncertowe, sportowe z trybunami, tarasy, wejścia', q: [5.0, 7.5], Q: [3.5, 4.5], t: '6.2' }],
  D: [{ id: 'D1', n: 'D1 – sklepy detaliczne', d: 'powierzchnie w sklepach detalicznych', q: [4.0, 5.0], Q: [3.5, 7.0], t: '6.2' },
    { id: 'D2', n: 'D2 – domy towarowe', d: 'powierzchnie w domach towarowych', q: [4.0, 5.0], Q: [3.5, 7.0], t: '6.2' }],
  E: [{ id: 'E1', n: 'E1 – składowanie', d: 'magazyny, archiwa, biblioteki – wartości minimalne', q: [7.5, 7.5], Q: [7.0, 7.0], t: '6.4' }],
  F: [{ id: 'F', n: 'F – pojazdy ≤ 30 kN', d: 'garaże, parkingi, drogi dla pojazdów lekkich', q: [1.5, 2.5], Q: [10, 20], t: '6.8' }],
  G: [{ id: 'G', n: 'G – pojazdy 30–160 kN', d: 'drogi dojazdowe, strefy dostaw', q: [5.0, 5.0], Q: [40, 90], t: '6.8' }],
  H: [{ id: 'H', n: 'H – dachy bez dostępu', d: 'dachy niedostępne, z wyjątkiem zwykłego utrzymania i napraw', q: [0.0, 1.0], Q: [0.9, 1.5], t: '6.10' }],
};
const IMP_DUR = { A: 'M', B: 'M', C: 'M', D: 'M', E: 'L', F: 'M', G: 'M', H: 'S' };
const KIND_DUR = { perm: 'P', snow: 'S', wind: 'S', other: 'M', acc: 'I' };
const VAR_KINDS = { imp: 'Obciążenia użytkowe', snow: 'Obciążenie śniegiem', wind: 'Oddziaływanie wiatru', other: 'Inne obciążenia zmienne' };

const SCHEMES = {
  ss: { name: 'Belka jednoprzęsłowa swobodnie podparta' },
  cant: { name: 'Wspornik (utwierdzenie z lewej)' },
  cont: { name: 'Belka ciągła / przęsła ze wspornikami' },
};
const SUP_DOF = { roller: { x: false, y: true, z: true, r: false }, pin: { x: true, y: true, z: true, r: false }, fix: { x: true, y: true, z: true, r: true } };
const SUP_NAME = { roller: 'przegubowa przesuwna', pin: 'przegubowa nieprzesuwna', fix: 'sztywna (utwierdzenie)' };

// granice ugięć (PN-EN 1995-1-1, tab. 7.2 i praktyka krajowa) – [w_inst, w_net,fin, w_fin] dla belek / wsporników (0 – nie sprawdzać)
const DEFL_PRESETS = {
  en1: { name: 'PN-EN 1995-1-1 tab. 7.2 – wartości dolne zakresu', span: [300, 250, 150], cant: [150, 125, 75] },
  en2: { name: 'PN-EN 1995-1-1 tab. 7.2 – wartości górne zakresu', span: [500, 350, 300], cant: [250, 175, 150] },
  floor: { name: 'belki stropowe – praktyka krajowa (u_net,fin ≤ L/250)', span: [300, 250, 150], cant: [150, 150, 75] },
  roof: { name: 'belki dachowe, płatwie, krokwie – praktyka krajowa (u_net,fin ≤ L/200)', span: [300, 200, 150], cant: [150, 150, 75] },
  manual: { name: 'podane ręcznie' },
};

/* --------------------------------------------------------------- pomocnicze */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, def) => {
  if (typeof v === 'number') return isFinite(v) ? v : def;
  if (v === null || v === undefined || v === '') return def;
  const x = parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
  return isFinite(x) ? x : def;
};
const optNum = v => (v === '' || v === null || v === undefined) ? '' : num(v, '');
const optPos = v => { const x = optNum(v); return x === '' || !(x >= 0) ? '' : x; };
const interp = (tab, x) => {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) {
    const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return tab[tab.length - 1][1];
};
const durIdx = d => Math.max(0, DUR.indexOf(d));
const r3 = v => Math.round(v * 1000) / 1000;

/* -------------------------------------------------------------- stan danych */
function defaultState() {
  return {
    meta: { name: 'Belka D-1', author: '', note: '', ticks: {}, repMode: 'full', own: '', ownOn: false },
    scheme: 'ss',
    geom: { L: 4.5, b: 100, h: 225, n: 1, beta: 0, alpha: 0, t: 120 },
    mat: { cls: 'C24', user: null, lock: false },
    env: { sc: 1, wet: false },
    loads: {
      sw: true, gamma: '', pattern: true, comb: '610ab', gG: 1.35, gGi: 1.0, gQ: 1.5, xi: 0.85, accPsi: 'psi1',
      perm: [{ kind: 'perm', name: 'Warstwy stropu', q: 0.9, dir: 'g', proj: 'len', span: 0, x1: '', x2: '', pts: [] }],
      var: [{ kind: 'imp', name: 'Użytkowe – mieszkanie', cat: 'A', sub: 'A', bw: 0.6, qAuto: true, q: 1.2, dir: 'g', proj: 'len', span: 0, x1: '', x2: '', pts: [] }],
      acc: [],
    },
    supCfg: [], nodes: [], segGeo: {},
    cont: { spans: [4.0, 4.0], cantL: 0, cantR: 0 },
    ltb: { on: true, top: '', bot: '', pos: 'top', lefTop: '', lefBot: '' },
    stab: { ky: 1.0, kz: 1.0 },
    sls: { lim: 'floor', span: [300, 250, 150], cant: [150, 150, 75], use: [true, true, true], camber: 0, shear: true,
      vib: { on: false, s: 0.6, B: 4.0, zeta: 0.01, a: 1.5, b: 100, kdist: 1.0, EIb: '', mQ: false } },
    fire: { on: false, R: 30, sides: 3, prot: 'none', hp: 12.5, tch: '', tf: '', psi: 'psi2' },
    coef: { gM: '', gMA: 1.0, kcr: '', ksys: 1.0, km: 0.7, kc90: 'auto', vRed: true, kfi: '' },
    design: { eta: 100, fixB: false, hbMax: '' },
  };
}

function psiOf(it) {
  if (it.kind === 'imp') return PSI[it.cat] || PSI.B;
  if (it.kind === 'snow') return it.alt === 'high' ? SNOW_HIGH : PSI.S;
  if (it.kind === 'wind') return PSI.W;
  return { name: 'Inne (ψ podane)', p0: clamp(num(it.p0, 0.7), 0, 1), p1: clamp(num(it.p1, 0.5), 0, 1), p2: clamp(num(it.p2, 0.3), 0, 1) };
}
function durAuto(it) {
  if (it.kind === 'imp') return IMP_DUR[it.cat] || 'M';
  return KIND_DUR[it.kind] || 'M';
}
function durOf(it) { return DUR.includes(it.dur) ? it.dur : durAuto(it); }

function normPt(p) {
  p = p || {};
  return { P: num(p.P, 0), T: num(p.T, 0), a: optNum(p.a), ref: ['L', 'R', 'rel'].includes(p.ref) ? p.ref : 'L', lb: optPos(p.lb) };
}
function normItem(it, kind) {
  const o = Object.assign({ kind: kind || 'imp', name: '', cat: 'B', sub: '', alt: 'low', dir: 'g', proj: 'len', span: 0, q: 0, q2: '', x1: '', x2: '', pts: [], mt: 0, N: 0, p0: 0.7, p1: 0.5, p2: 0.3, dur: '', off: false }, it || {});
  if (kind === 'acc' || kind === 'perm') o.kind = kind;
  else if (!VAR_KINDS[o.kind]) o.kind = 'imp';
  if (!['g', 'y', 'z'].includes(o.dir)) o.dir = 'g';
  o.proj = o.proj === 'hor' ? 'hor' : 'len';
  o.span = Math.max(0, Math.round(num(o.span, 0)));
  o.spans = Array.isArray(o.spans) ? Array.from(new Set(o.spans.map(v => Math.round(num(v, 0))).filter(v => v > 0))).sort((a, b) => a - b) : [];
  if (o.spans.length < 2) o.spans = []; else o.span = o.spans[0];
  o.name = String(o.name || '');
  o.q = num(o.q, 0); o.q2 = optNum(o.q2);
  o.x1 = optPos(o.x1); o.x2 = optPos(o.x2);
  o.pts = (Array.isArray(o.pts) ? o.pts : []).map(normPt).slice(0, 20);
  o.mt = num(o.mt, 0); o.N = num(o.N, 0);
  ['p0', 'p1', 'p2'].forEach(k => o[k] = clamp(num(o[k], 0), 0, 1));
  o.dur = DUR.includes(o.dur) ? o.dur : '';
  o.off = o.off === true;
  if (o.kind === 'imp') {
    if (!IMP_EC1[o.cat]) o.cat = 'B';
    const L = IMP_EC1[o.cat]; o.sub = L.some(q => q.id === o.sub) ? o.sub : L[0].id;
    o.bw = optPos(o.bw); if (o.bw !== '' && !(o.bw > 0)) o.bw = '';
    o.qAuto = o.qAuto === true;
    if (o.qAuto) { const q = L.find(z => z.id === o.sub) || L[0]; o.q = Math.round(q.q[1] * (+o.bw > 0 ? +o.bw : 1) * 100) / 100; }
  }
  if (o.kind === 'snow') o.alt = o.alt === 'high' ? 'high' : 'low';
  return o;
}

/* --------------------------------------------- słup pod podporą i stopa (połączenie z fundamentem) */
// gatunki stali łączników: f_u,k [MPa]; blachy: f_y, f_u [MPa]
const FAST_STEEL = { '4.6': { n: 'śruby 4.6', fu: 400 }, '5.6': { n: 'śruby 5.6', fu: 500 }, '8.8': { n: 'śruby 8.8', fu: 800 }, 'S235': { n: 'sworznie S235', fu: 360 }, 'S355': { n: 'sworznie S355', fu: 490 } };
const PLATE_STEEL = { S235: { fy: 235, fu: 360 }, S275: { fy: 275, fu: 430 }, S355: { fy: 355, fu: 490 } };
// beton fundamentu: f_ck [MPa]
const CONC_FCK = { 'C12/15': 12, 'C16/20': 16, 'C20/25': 20, 'C25/30': 25, 'C30/37': 30, 'C35/45': 35, 'C40/50': 40 };
const COL_DEF = { on: false, cls: '', b: 140, h: 140, L: 3.0, ky: 1.0, kz: 1.0, e: 0, Hadd: 0, Hreac: false,
  type: 'slot', fast: 'dowel', d: 12, grade: 'S235', n: 2, m: 2, a1: 84, a2: 60, a3: 100, a4: 40, ts: 8, steel: 'S235', e1p: 40,
  pa: 250, pb: 250, conc: 'C20/25', na: 2, NRd: 12, VRd: 9, gap: 30 };
function normCol(c0) {
  const c = Object.assign({}, COL_DEF, c0 && typeof c0 === 'object' ? c0 : {});
  c.on = c.on === true;
  c.cls = c.cls && (MATS[c.cls] || c.cls === 'U') ? c.cls : '';
  ['b', 'h'].forEach(k => { c[k] = clamp(num(c[k], COL_DEF[k]), 40, 1500); });
  c.L = clamp(num(c.L, 3), 0.3, 30); c.ky = clamp(num(c.ky, 1), 0.3, 5); c.kz = clamp(num(c.kz, 1), 0.3, 5);
  c.e = clamp(num(c.e, 0), 0, 1000); c.Hadd = Math.max(0, num(c.Hadd, 0)); c.Hreac = c.Hreac === true;
  c.type = c.type === 'side' ? 'side' : 'slot'; c.fast = c.fast === 'bolt' ? 'bolt' : 'dowel';
  c.d = [6, 8, 10, 12, 14, 16, 20, 24].includes(+c.d) ? +c.d : 12;
  c.grade = FAST_STEEL[c.grade] ? c.grade : (c.fast === 'bolt' ? '4.6' : 'S235');
  c.n = clamp(Math.round(num(c.n, 2)), 1, 12); c.m = clamp(Math.round(num(c.m, 2)), 1, 8);
  ['a1', 'a2', 'a3', 'a4', 'e1p'].forEach(k => { c[k] = clamp(num(c[k], COL_DEF[k]), 5, 1000); });
  c.ts = clamp(num(c.ts, 8), 2, 40); c.steel = PLATE_STEEL[c.steel] ? c.steel : 'S235';
  c.pa = clamp(num(c.pa, 250), 50, 2000); c.pb = clamp(num(c.pb, 250), 50, 2000);
  c.conc = CONC_FCK[c.conc] ? c.conc : 'C20/25';
  c.na = clamp(Math.round(num(c.na, 2)), 1, 12); c.NRd = Math.max(0, num(c.NRd, 12)); c.VRd = Math.max(0, num(c.VRd, 9)); c.gap = clamp(num(c.gap, 30), 0, 500);
  return c;
}

// uzupełnia brakujące pola wartościami domyślnymi i rzutuje liczby
function normalize(S0) {
  const D = defaultState();
  const S = JSON.parse(JSON.stringify(S0 || {}));
  for (const k of Object.keys(D)) {
    if (typeof D[k] !== 'object' || D[k] === null) { if (S[k] === undefined) S[k] = D[k]; continue; }
    if (typeof S[k] !== 'object' || S[k] === null || Array.isArray(S[k]) !== Array.isArray(D[k])) S[k] = Array.isArray(D[k]) ? [] : {};
    if (!Array.isArray(D[k])) for (const kk of Object.keys(D[k])) if (S[k][kk] === undefined) S[k][kk] = JSON.parse(JSON.stringify(D[k][kk]));
  }
  if (!SCHEMES[S.scheme]) S.scheme = 'ss';
  const G = S.geom;
  G.L = clamp(num(G.L, 4.5), 0.2, 60);
  G.b = clamp(num(G.b, 100), 10, 2000); G.h = clamp(num(G.h, 200), 20, 3000);
  G.n = clamp(Math.round(num(G.n, 1)), 1, 6);
  G.beta = clamp(num(G.beta, 0), -75, 75); G.alpha = clamp(num(G.alpha, 0), -75, 75);
  G.t = clamp(num(G.t, 120), 0, 2000);
  // materiał
  const M = S.mat;
  if (M.cls !== 'U' && !MATS[M.cls]) M.cls = 'C24';
  if (M.cls === 'U' || (M.user && typeof M.user === 'object')) {
    const base = MATS[M.user && M.user.base] || MATS.C24;
    const u = Object.assign({}, base, M.user || {});
    ['fmk', 'ft0k', 'ft90k', 'fc0k', 'fc90k', 'fvk', 'E0m', 'E005', 'E90m', 'Gm', 'G05', 'rhok', 'rhom', 'fmflat', 'fvflat', 's'].forEach(k => { if (u[k] !== undefined) u[k] = num(u[k], base[k] || 0); });
    u.fam = FAM[u.fam] ? u.fam : 'U'; u.base = base.id; u.name = String(u.name || 'Materiał własny');
    M.user = u;
  } else M.user = null;
  M.lock = M.lock === true;
  S.env.sc = [1, 2, 3].includes(+S.env.sc) ? +S.env.sc : 1; S.env.wet = S.env.wet === true;
  // obciążenia
  const Ld = S.loads;
  Ld.sw = Ld.sw !== false; Ld.gamma = optPos(Ld.gamma); Ld.pattern = Ld.pattern !== false;
  Ld.comb = Ld.comb === '610' ? '610' : '610ab';
  Ld.gG = Math.max(0, num(Ld.gG, 1.35)); Ld.gGi = Math.max(0, num(Ld.gGi, 1.0)); Ld.gQ = Math.max(0, num(Ld.gQ, 1.5)); Ld.xi = clamp(num(Ld.xi, 0.85), 0, 1);
  Ld.accPsi = Ld.accPsi === 'psi2' ? 'psi2' : 'psi1';
  Ld.perm = (Array.isArray(Ld.perm) ? Ld.perm : []).map(it => normItem(it, 'perm')).slice(0, 40);
  Ld.var = (Array.isArray(Ld.var) ? Ld.var : []).map(it => normItem(it, it && it.kind)).slice(0, 40);
  Ld.acc = (Array.isArray(Ld.acc) ? Ld.acc : []).map(it => normItem(it, 'acc')).slice(0, 10);
  // belka ciągła
  const C = S.cont;
  C.spans = (Array.isArray(C.spans) && C.spans.length ? C.spans : D.cont.spans).map(v => clamp(num(v, 4), 0.2, 40)).slice(0, 10);
  C.cantL = clamp(num(C.cantL, 0), 0, 20); C.cantR = clamp(num(C.cantR, 0), 0, 20);
  // podpory
  S.supCfg = (Array.isArray(S.supCfg) ? S.supCfg : []).slice(0, 12).map(c => {
    if (!c || typeof c !== 'object') c = {};
    const dof = c.dof && typeof c.dof === 'object' ? { x: !!c.dof.x, y: c.dof.y !== false, z: c.dof.z !== false, r: !!c.dof.r } : (SUP_DOF[c.type] ? Object.assign({}, SUP_DOF[c.type]) : null);
    const nt = c.notch && typeof c.notch === 'object' ? c.notch : {};
    return {
      dof, kv: optPos(c.kv), kr: optPos(c.kr), t: optPos(c.t), a: optPos(c.a), direct: c.direct !== false, kc90: optPos(c.kc90),
      notch: { on: nt.on === true, side: nt.side === 'top' ? 'top' : 'bot', hef: optPos(nt.hef), x: optPos(nt.x), i: optPos(nt.i) },
      col: normCol(c.col),
    };
  });
  S.nodes = (Array.isArray(S.nodes) ? S.nodes : []).filter(n => n && typeof n === 'object').slice(0, 40)
    .map(n => ({ seg: Math.max(0, Math.round(num(n.seg, 0))), a: Math.max(0, num(n.a, 0)), hinge: !!n.hinge })).filter(n => n.a > 0);
  { const g0 = S.segGeo && typeof S.segGeo === 'object' && !Array.isArray(S.segGeo) ? S.segGeo : {}, g1 = {};
    Object.keys(g0).forEach(k => { if (!/^\d+$/.test(k)) return; const v = g0[k] || {}; const b = optPos(v.b), h = optPos(v.h); if ((b !== '' && b >= 10) || (h !== '' && h >= 20)) g1[k] = { b: b >= 10 ? b : '', h: h >= 20 ? h : '' }; });
    S.segGeo = g1; }
  // stateczność
  const T = S.ltb;
  T.on = T.on !== false; T.top = optPos(T.top); T.bot = optPos(T.bot);
  T.pos = ['top', 'center', 'bottom'].includes(T.pos) ? T.pos : 'top';
  T.lefTop = optPos(T.lefTop); T.lefBot = optPos(T.lefBot);
  S.stab.ky = clamp(num(S.stab.ky, 1), 0.3, 5); S.stab.kz = clamp(num(S.stab.kz, 1), 0.3, 5);
  // SGU
  const Sl = S.sls;
  if (!DEFL_PRESETS[Sl.lim]) Sl.lim = 'floor';
  const fix3 = (a, d) => [0, 1, 2].map(i => Math.max(0, num(Array.isArray(a) ? a[i] : undefined, d[i])));
  if (Sl.lim !== 'manual') { Sl.span = DEFL_PRESETS[Sl.lim].span.slice(); Sl.cant = DEFL_PRESETS[Sl.lim].cant.slice(); }
  else { Sl.span = fix3(Sl.span, D.sls.span); Sl.cant = fix3(Sl.cant, D.sls.cant); }
  Sl.use = [0, 1, 2].map(i => !(Array.isArray(Sl.use) && Sl.use[i] === false));
  Sl.camber = Math.max(0, num(Sl.camber, 0));
  Sl.shear = Sl.shear !== false;
  const V = Sl.vib = Object.assign({}, D.sls.vib, Sl.vib && typeof Sl.vib === 'object' ? Sl.vib : {});
  V.on = V.on === true; V.s = clamp(num(V.s, 0.6), 0.1, 5); V.B = clamp(num(V.B, 4), 0.3, 50); V.zeta = clamp(num(V.zeta, 0.01), 0.001, 0.2);
  V.a = clamp(num(V.a, 1.5), 0.1, 10); V.b = clamp(num(V.b, 100), 10, 300); V.kdist = clamp(num(V.kdist, 1), 0.1, 1); V.EIb = optPos(V.EIb); V.mQ = V.mQ === true;
  // pożar
  const F = S.fire;
  F.on = F.on === true; F.R = [15, 30, 45, 60, 90, 120].includes(+F.R) ? +F.R : 30; F.sides = +F.sides === 4 ? 4 : 3;
  F.prot = ['none', 'gkf', 'manual'].includes(F.prot) ? F.prot : 'none';
  F.hp = clamp(num(F.hp, 12.5), 9, 40); F.tch = optPos(F.tch); F.tf = optPos(F.tf); F.psi = F.psi === 'psi1' ? 'psi1' : 'psi2';
  // współczynniki
  const K = S.coef;
  K.gM = optPos(K.gM); K.gMA = Math.max(0.5, num(K.gMA, 1.0)); K.kcr = optPos(K.kcr); if (K.kcr !== '') K.kcr = clamp(K.kcr, 0.3, 1);
  K.ksys = clamp(num(K.ksys, 1), 1, 1.2); K.km = clamp(num(K.km, 0.7), 0.5, 1); K.kc90 = K.kc90 === 'auto' || K.kc90 === '' ? 'auto' : clamp(num(K.kc90, 1), 1, 1.75);
  K.vRed = K.vRed !== false; K.kfi = optPos(K.kfi);
  S.design.eta = clamp(Math.round(num(S.design.eta, 100)), 50, 100); S.design.fixB = S.design.fixB === true; S.design.hbMax = optPos(S.design.hbMax);
  if (typeof S.meta.ticks !== 'object' || S.meta.ticks === null || Array.isArray(S.meta.ticks)) S.meta.ticks = {};
  S.meta.repMode = ['full', 'static', 'own'].includes(S.meta.repMode) ? S.meta.repMode : 'full';
  S.meta.own = typeof S.meta.own === 'string' ? S.meta.own : ''; S.meta.ownOn = S.meta.ownOn === true;
  if (typeof S.meta.tickMan !== 'object' || S.meta.tickMan === null || Array.isArray(S.meta.tickMan)) S.meta.tickMan = {};
  return S;
}

/* ------------------------------------------------------------- materiały */
function matOf(S) { return S.mat.cls === 'U' || S.mat.user ? S.mat.user : MATS[S.mat.cls] || MATS.C24; }
function famOf(S) { const m = matOf(S); return FAM[m.fam] || FAM.C; }
// współczynnik wysokości k_h (3.2(3), 3.3(3), 3.4(3)) dla wymiaru d [mm]
function khOf(fam, mat, d) {
  const F = FAM[fam] || FAM.C;
  if (F.kind === 'lvl') { const s = mat.s || 0.12; return d < 300 ? Math.min(Math.pow(300 / d, s), 1.2) : (d > 300 ? Math.pow(300 / d, s) : 1); }
  if (fam === 'D' && mat.rhok > 700) return 1;
  return d < F.khRef ? Math.min(Math.pow(F.khRef / d, F.khExp), F.khMax) : 1;
}
function materials(S) {
  const m = matOf(S), fam = m.fam, F = FAM[fam] || FAM.C, K = S.coef;
  const gM = K.gM !== '' && K.gM > 0 ? K.gM : F.gM;
  const kcr = K.kcr !== '' ? K.kcr : F.kcr;
  const sc = S.env.sc, kdef0 = KDEF[sc], kdef = kdef0 + (S.env.wet && F.kind === 'solid' ? 1.0 : 0);
  const kfi = K.kfi !== '' && K.kfi > 0 ? K.kfi : F.kfi;
  // ciężar objętościowy: ρ_mean/100 [kN/m³] (PN-EN 1991-1-1, zał. A, tab. A.3) albo podany ręcznie
  const gamma = S.loads.gamma !== '' && S.loads.gamma > 0 ? S.loads.gamma : Math.round(m.rhom / 10) / 10;
  return { m, fam, F, gM, gMA: K.gMA, kcr, sc, kmod: KMOD[sc], kdef, kdef0, kfi, gamma, ksys: K.ksys, km: K.km,
    E0m: m.E0m * 1000, E005: m.E005 * 1000, Gm: m.Gm * 1000, G05: m.G05 * 1000, E90m: m.E90m * 1000 };
}
// właściwości przekroju prostokątnego b×h [mm] (n elementów obok siebie)
function torsionCoef(h, b) {
  const r = Math.max(h, b) / Math.min(h, b);
  const tabB = [[1, 0.141], [1.5, 0.196], [2, 0.229], [2.5, 0.249], [3, 0.263], [4, 0.281], [5, 0.291], [6, 0.299], [10, 0.312], [1e9, 0.3333]];
  const tabA = [[1, 0.208], [1.5, 0.231], [2, 0.246], [2.5, 0.258], [3, 0.267], [4, 0.282], [5, 0.291], [6, 0.299], [10, 0.312], [1e9, 0.3333]];
  return { beta: interp(tabB, r), alpha: interp(tabA, r), r };
}
function secProps(b1, h, n) {
  const b = b1 * (n || 1);
  const A = b * h, Iy = b * h * h * h / 12, Iz = h * b * b * b / 12;
  const tc = torsionCoef(h, b), lo = Math.min(b, h), hi = Math.max(b, h);
  const It = tc.beta * hi * lo * lo * lo, Wt = tc.alpha * hi * lo * lo;
  return { b1, n: n || 1, b, h, A, Iy, Iz, Wy: b * h * h / 6, Wz: h * b * b / 6, iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A), It, Wt, tc,
    kshape: Math.min(1 + 0.15 * hi / lo, 2.0) };
}
// wartości obliczeniowe wytrzymałości dla przekroju (bez k_mod): f_k·k_h·k_sys/γ_M
function strengthBase(mt, sec) {
  const m = mt.m, fam = mt.fam, F = mt.F;
  const khy = khOf(fam, m, sec.h), khz = F.kind === 'lvl' ? 1 : khOf(fam, m, sec.b), kht = F.kind === 'lvl' ? 1 : khOf(fam, m, Math.max(sec.b, sec.h));
  const fmz = F.kind === 'lvl' && m.fmflat ? m.fmflat : m.fmk;
  const fvz = F.kind === 'lvl' && m.fvflat ? m.fvflat : m.fvk;
  return { khy, khz, kht,
    fmy: m.fmk * khy * mt.ksys, fmz: fmz * khz * mt.ksys, ft0: m.ft0k * kht, fc0: m.fc0k, fc90: m.fc90k, fv: m.fvk, fvz, ft90: m.ft90k };
}

/* ------------------------------------------------------------ model belki */
// odcinki (przęsła, wsporniki) i podpory; x w metrach od lewego końca belki
function beamModel(S) {
  const segs = [], sups = [];
  const cfg = i => S.supCfg[i] || {};
  const pushSup = (x, def) => {
    const i = sups.length, c = cfg(i);
    const dof = c.dof ? Object.assign({}, c.dof) : Object.assign({}, SUP_DOF[def]);
    sups.push({ i, x, def, dof, kv: c.kv || '', kr: c.kr || '', t: c.t !== '' && c.t !== undefined ? c.t : S.geom.t, a: c.a !== '' && c.a !== undefined ? c.a : 0,
      direct: c.direct !== false, kc90: c.kc90 || '', notch: c.notch || { on: false }, label: String.fromCharCode(65 + i) });
  };
  if (S.scheme === 'cant') {
    pushSup(0, 'fix');
    segs.push({ kind: 'cantR', x0: 0, x1: S.geom.L, L: S.geom.L });
  } else {
    const spans = S.scheme === 'cont' ? S.cont.spans : [S.geom.L];
    const cL = S.scheme === 'cont' ? S.cont.cantL : 0, cR = S.scheme === 'cont' ? S.cont.cantR : 0;
    let x = 0;
    if (cL > 0) { segs.push({ kind: 'cantL', x0: 0, x1: cL, L: cL }); x = cL; }
    pushSup(x, 'pin');
    spans.forEach(L => { segs.push({ kind: 'span', x0: x, x1: x + L, L }); x += L; pushSup(x, 'roller'); });
    if (cR > 0) { segs.push({ kind: 'cantR', x0: x, x1: x + cR, L: cR }); x += cR; }
  }
  const Ltot = segs.length ? segs[segs.length - 1].x1 : 0;
  let sn = 0;
  segs.forEach((s, i) => {
    s.i = i;
    const g = S.segGeo[i] || {};
    s.b1 = g.b > 0 ? g.b : S.geom.b; s.h = g.h > 0 ? g.h : S.geom.h; s.own = !!(g.b > 0 || g.h > 0);
    s.sec = secProps(s.b1, s.h, S.geom.n);
    if (s.kind === 'span') { sn++; s.label = `przęsło ${sn}`; s.short = `P${sn}`; }
    else { s.label = s.kind === 'cantL' ? 'wspornik lewy' : 'wspornik prawy'; s.short = s.kind === 'cantL' ? 'WL' : 'WP'; }
    s.supL = sups.find(p => Math.abs(p.x - s.x0) < 1e-9) || null;
    s.supR = sups.find(p => Math.abs(p.x - s.x1) < 1e-9) || null;
  });
  segs.forEach(s => { if (s.kind === 'span') s.label += ` (${s.supL.label}–${s.supR.label})`; });
  sups.forEach(p => {
    p.segL = segs.find(s => Math.abs(s.x1 - p.x) < 1e-9) || null;
    p.segR = segs.find(s => Math.abs(s.x0 - p.x) < 1e-9) || null;
    p.end = !p.segL || !p.segR;
    p.name = sups.length === 1 ? 'utwierdzenie' : p.i === 0 && !p.segL ? 'podpora lewa' : p.i === sups.length - 1 && !p.segR ? 'podpora prawa' : `podpora pośrednia ${p.label}`;
    if (p.end && p.segL && p.segR) p.end = false;
    if (!p.segL && p.i === 0) p.name = 'podpora lewa';
    const k = p.dof.r ? 'fix' : p.dof.x ? 'pin' : 'roller'; p.type = k; p.typeName = SUP_NAME[k];
  });
  // długości końców belki poza osią podpór skrajnych: t/2 + a (a – wysunięcie poza lico podpory)
  const s0 = sups[0], sN = sups[sups.length - 1];
  const extL = segs.length && segs[0].kind !== 'cantL' && s0 ? (s0.t / 2 + s0.a) / 1000 : 0;
  const extR = segs.length && segs[segs.length - 1].kind !== 'cantR' && sN ? (sN.t / 2 + sN.a) / 1000 : 0;
  return { segs, sups, Ltot, extL, extR, Lmember: Ltot + extL + extR, cont: S.scheme === 'cont', scheme: S.scheme };
}
function segAt(md, x) { for (const s of md.segs) if (x >= s.x0 - 1e-9 && x <= s.x1 + 1e-9) return s; return md.segs[md.segs.length - 1]; }

/* ------------------------------------------- obciążenia: zakres i składowe */
// zakres działania obciążenia [m] od lewego końca belki
function itemRange(it, md) {
  let a = 0, b = md.Ltot;
  if (it.spans && it.spans.length) { const s1 = md.segs[it.spans[0] - 1], s2 = md.segs[it.spans[it.spans.length - 1] - 1]; if (s1 && s2) { a = s1.x0; b = s2.x1; } }
  else if (it.span > 0 && md.segs[it.span - 1]) { const s = md.segs[it.span - 1]; a = s.x0; b = s.x1; }
  const L = b - a;
  const x1 = it.x1 !== '' ? clamp(it.x1, 0, L) : 0, x2 = it.x2 !== '' ? clamp(it.x2, 0, L) : L;
  return { a, b, L, xa: a + Math.min(x1, x2), xb: a + Math.max(x1, x2) };
}
function ptX(p, rg) {
  const a = p.a === '' ? rg.L / 2 : p.a;
  const x = p.ref === 'R' ? rg.b - a : p.ref === 'rel' ? rg.a + clamp(a, 0, 1) * rg.L : rg.a + a;
  return clamp(x, rg.a, rg.b);
}
// rozkład wektora obciążenia na składowe lokalne: [q_x (wzdłuż osi, +w prawo), q_y (⊥ w płaszczyźnie y, +w dół), q_z (bocznie)] na jednostkę długości osi
function loadComp(dir, proj, S) {
  const be = S.geom.beta * Math.PI / 180, al = S.geom.alpha * Math.PI / 180;
  if (dir === 'y') return [0, 1, 0];
  if (dir === 'z') return [0, 0, 1];
  const k = proj === 'hor' ? Math.cos(be) : 1;          // obciążenie na rzut poziomy → na długość osi
  const qp = k * Math.cos(be), qx = -k * Math.sin(be);
  return [qx, qp * Math.cos(al), qp * Math.sin(al)];
}
function ptComp(dir, S) {
  const be = S.geom.beta * Math.PI / 180, al = S.geom.alpha * Math.PI / 180;
  if (dir === 'y') return [0, 1, 0];
  if (dir === 'z') return [0, 0, 1];
  return [-Math.sin(be), Math.cos(be) * Math.cos(al), Math.cos(be) * Math.sin(al)];
}
// podział obciążenia na części (osobno w każdym odcinku) – układ szachownicowy obciążeń zmiennych
function splitItem(it, md, doSplit) {
  const rg = itemRange(it, md);
  const parts = [];
  const segsIn = md.segs.filter(s => s.x1 > rg.xa + 1e-9 && s.x0 < rg.xb - 1e-9);
  const pts = (it.pts || []).map(p => ({ x: ptX(p, rg), P: p.P, T: p.T, lb: p.lb })).filter(p => p.P || p.T);
  const hasQ = (it.q || (it.q2 !== '' && it.q2) || it.mt) && rg.xb > rg.xa + 1e-9;
  const q2 = it.q2 === '' ? it.q : it.q2;
  const qAt = x => rg.xb > rg.xa ? it.q + (q2 - it.q) * (x - rg.xa) / (rg.xb - rg.xa) : it.q;
  if (!doSplit) {
    parts.push({ seg: -1, dist: hasQ ? [{ x1: rg.xa, x2: rg.xb, q1: it.q, q2, mt: it.mt }] : [], pts });
    return { rg, parts };
  }
  const used = new Set();
  segsIn.forEach(s => {
    const xa = Math.max(s.x0, rg.xa), xb = Math.min(s.x1, rg.xb);
    const p = { seg: s.i, dist: hasQ && xb > xa + 1e-9 ? [{ x1: xa, x2: xb, q1: qAt(xa), q2: qAt(xb), mt: it.mt }] : [], pts: [] };
    pts.forEach((pt, k) => { if (!used.has(k) && pt.x >= s.x0 - 1e-9 && pt.x <= s.x1 + 1e-9) { p.pts.push(pt); used.add(k); } });
    if (p.dist.length || p.pts.length) parts.push(p);
  });
  pts.forEach((pt, k) => { if (!used.has(k)) parts.push({ seg: segAt(md, pt.x).i, dist: [], pts: [pt] }); });
  return { rg, parts };
}

/* ----------------------------------------------------------- statyka MES */
function makeMesh(md, cuts) {
  const L = md.Ltot, base = new Set([0, L]);
  md.segs.forEach(s => { base.add(s.x0); base.add(s.x1); });
  cuts.forEach(x => { if (x > 1e-9 && x < L - 1e-9) base.add(Math.round(x * 1e6) / 1e6); });
  const xs = Array.from(base).sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > 1e-6);
  const hmax = L / 240, X = [xs[0]];
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1], n = Math.max(1, Math.ceil(d / hmax - 1e-9));
    for (let k = 1; k <= n; k++) X.push(xs[i - 1] + d * k / n);
  }
  return X;
}
const nodeIdx = (X, x) => { let lo = 0, hi = X.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (X[m] < x) lo = m; else hi = m; } return Math.abs(X[lo] - x) <= Math.abs(X[hi] - x) ? lo : hi; };

// rozwiązanie układu pasmowego symetrycznego (Cholesky); zwraca null przy macierzy osobliwej (mechanizm)
function bandSolve(n, bw, Kb, F) {
  // Kb[i][j] – element (i, i+j), j = 0..bw
  const L = Kb.map(r => r.slice());
  for (let i = 0; i < n; i++) {
    for (let j = Math.max(0, i - bw); j < i; j++) {
      const lij = L[j][i - j];
      if (lij === 0) continue;
      for (let k = i; k <= Math.min(n - 1, j + bw); k++) L[i][k - i] -= lij * L[j][k - j];
    }
    const d = L[i][0];
    const ref = Math.abs(Kb[i][0]) || 1;
    if (!(d > 1e-10 * ref)) return null;
    const sd = Math.sqrt(d);
    for (let k = 0; k <= Math.min(bw, n - 1 - i); k++) L[i][k] /= sd;
  }
  const solve = Fv => {
    const y = Fv.slice();
    for (let i = 0; i < n; i++) { let s = y[i]; for (let j = Math.max(0, i - bw); j < i; j++) s -= L[j][i - j] * y[j]; y[i] = s / L[i][0]; }
    for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k <= Math.min(n - 1, i + bw); k++) s -= L[i][k - i] * y[k]; y[i] = s / L[i][0]; }
    return y;
  };
  return F ? solve(F) : solve;
}

// MES – zginanie w jednej płaszczyźnie (elementy Timoshenki). EIe, GAe – sztywności elementów [kNm², kN];
// sup: { node: { v: true|k, r: true|k } }; hinges: Set węzłów z przegubem; loads: { q: [[q1,q2] per element], P: [per node] }
function makeBendSolver(X, EIe, GAe, sup, hinges) {
  const nn = X.length, ne = nn - 1;
  // numeracja: v_i, θ_i (lewy), θ_i' (prawy przy przegubie)
  const dv = new Array(nn), dthL = new Array(nn), dthR = new Array(nn);
  let n = 0;
  for (let i = 0; i < nn; i++) { dv[i] = n++; dthL[i] = n++; dthR[i] = hinges.has(i) && i > 0 && i < nn - 1 ? n++ : dthL[i]; }
  const bw = 5;
  const Kb = Array.from({ length: n }, () => new Array(bw + 1).fill(0));
  const add = (i, j, v) => { if (j < i) [i, j] = [j, i]; Kb[i][j - i] += v; };
  const ke = [];
  for (let e = 0; e < ne; e++) {
    const L = X[e + 1] - X[e], EI = EIe[e], phi = GAe && GAe[e] > 0 ? 12 * EI / (GAe[e] * L * L) : 0;
    const c = EI / (L * L * L * (1 + phi));
    const k = [[12, 6 * L, -12, 6 * L], [6 * L, (4 + phi) * L * L, -6 * L, (2 - phi) * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, (2 - phi) * L * L, -6 * L, (4 + phi) * L * L]].map(r => r.map(v => v * c));
    const d = [dv[e], dthR[e], dv[e + 1], dthL[e + 1]];
    for (let a = 0; a < 4; a++) for (let b = a; b < 4; b++) add(d[a], d[b], k[a][b]);
    ke.push({ k, d, L });
  }
  // podpory: sztywne – duża sprężyna; podatne – sprężyna k
  const BIG = 1e12;
  const fixed = [];
  Object.keys(sup).forEach(key => {
    const i = +key, s = sup[key];
    if (s.v) { const kv = s.v === true ? BIG : s.v; Kb[dv[i]][0] += kv; fixed.push({ i, dof: dv[i], k: kv, kind: 'v' }); }
    if (s.r) { const kr = s.r === true ? BIG : s.r; [dthL[i], dthR[i]].filter((v, j, a) => a.indexOf(v) === j).forEach(d => { Kb[d][0] += kr; fixed.push({ i, dof: d, k: kr, kind: 'r' }); }); }
  });
  const solver = bandSolve(n, bw, Kb);
  if (!solver) return null;
  return { n, ne, nn, ke, dv, dthL, dthR, solver, fixed, X };
}
function bendRun(sv, qe, Pn) {
  // qe[e] = [q1, q2] (+ w dół, kN/m), Pn[i] (+ w dół, kN)
  const F = new Array(sv.n).fill(0), fe = [];
  for (let e = 0; e < sv.ne; e++) {
    const L = sv.ke[e].L, q = qe[e];
    let f = [0, 0, 0, 0];
    if (q && (q[0] || q[1])) {
      const [a, b] = q;
      f = [L * (7 * a + 3 * b) / 20, L * L * (3 * a + 2 * b) / 60, L * (3 * a + 7 * b) / 20, -L * L * (2 * a + 3 * b) / 60];
      const d = sv.ke[e].d; for (let j = 0; j < 4; j++) F[d[j]] += f[j];
    }
    fe.push(f);
  }
  for (let i = 0; i < sv.nn; i++) if (Pn[i]) F[sv.dv[i]] += Pn[i];
  const u = sv.solver(F);
  // siły w elementach: M (+ rozciąga dół), V = dM/dx
  const Ms = new Float64Array(2 * sv.ne), Vs = new Float64Array(2 * sv.ne);
  const endF = [];
  for (let e = 0; e < sv.ne; e++) {
    const { k, d } = sv.ke[e], ue = d.map(j => u[j]);
    const g = [0, 1, 2, 3].map(a => k[a][0] * ue[0] + k[a][1] * ue[1] + k[a][2] * ue[2] + k[a][3] * ue[3] - fe[e][a]);
    endF.push(g);
    Ms[2 * e] = g[1]; Vs[2 * e] = -g[0]; Ms[2 * e + 1] = -g[3]; Vs[2 * e + 1] = g[2];
  }
  const w = new Float64Array(sv.nn), th = new Float64Array(sv.nn);
  for (let i = 0; i < sv.nn; i++) { w[i] = u[sv.dv[i]]; th[i] = u[sv.dthL[i]]; }
  // reakcje (+ w górę) i momenty utwierdzenia z równowagi węzła
  const reac = {};
  sv.fixed.forEach(f => {
    const i = f.i, o = reac[i] || (reac[i] = { R: 0, M: 0 });
    if (f.kind === 'v') { let s = Pn[i] || 0; if (i > 0) s -= endF[i - 1][2]; if (i < sv.nn - 1) s -= endF[i][0]; o.R = s; }
    else { let s = 0; if (i > 0 && sv.ke[i - 1].d[3] === f.dof) s -= endF[i - 1][3]; if (i < sv.nn - 1 && sv.ke[i].d[1] === f.dof) s -= endF[i][1]; o.M += -s; }
  });
  return { Ms, Vs, w, th, reac };
}
// MES – pręt osiowy (u) lub skręcany (φ): sztywność EA lub GI_t; obciążenia rozłożone p [kN/m] i skupione w węzłach
function makeBarSolver(X, Ke, supNodes) {
  const nn = X.length, ne = nn - 1;
  const Kb = Array.from({ length: nn }, () => [0, 0]);
  for (let e = 0; e < ne; e++) { const k = Ke[e] / (X[e + 1] - X[e]); Kb[e][0] += k; Kb[e + 1][0] += k; Kb[e][1] -= k; }
  const BIG = 1e12; supNodes.forEach(i => { Kb[i][0] += BIG; });
  const solver = bandSolve(nn, 1, Kb);
  if (!solver) return null;
  return { nn, ne, X, Ke, solver, supNodes };
}
function barRun(sv, pe, Pn) {
  const F = new Array(sv.nn).fill(0), fe = [];
  for (let e = 0; e < sv.ne; e++) {
    const p = pe[e] || [0, 0], L = sv.X[e + 1] - sv.X[e];
    const a = L * (2 * p[0] + p[1]) / 6, b = L * (p[0] + 2 * p[1]) / 6;
    F[e] += a; F[e + 1] += b; fe.push([a, b]);
  }
  for (let i = 0; i < sv.nn; i++) if (Pn[i]) F[i] += Pn[i];
  const u = sv.solver(F);
  // siła wewnętrzna (+ rozciąganie / dodatni moment skręcający): N_lewy = −f₁, N_prawy = f₂
  const Ns = new Float64Array(2 * sv.ne);
  for (let e = 0; e < sv.ne; e++) {
    const k = sv.Ke[e] / (sv.X[e + 1] - sv.X[e]);
    Ns[2 * e] = -(k * (u[e] - u[e + 1]) - fe[e][0]);
    Ns[2 * e + 1] = k * (u[e + 1] - u[e]) - fe[e][1];
  }
  const reac = {};
  sv.supNodes.forEach(i => { reac[i] = (i > 0 ? Ns[2 * (i - 1) + 1] : 0) - (i < sv.nn - 1 ? Ns[2 * i] : 0) - (Pn[i] || 0); });
  return { Ns, u, reac };
}

/* ---------------------------------------- statyka: obciążenia i rozwiązanie */
const KAPPA = 5 / 6;
function statics(S, mt, md) {
  const errors = [], L = S.loads;
  // lista oddziaływań
  const items = [];
  if (L.sw) {
    const it = { kind: 'perm', name: 'Ciężar własny belki', dir: 'g', proj: 'len', q: 0, pts: [], sw: true };
    items.push({ key: 'G0', it, cls: 'G', dur: 'P', psi: null, sw: true });
  }
  L.perm.forEach((it, i) => { if (!it.off) items.push({ key: 'G' + (i + 1), it, cls: 'G', dur: 'P', idx: i }); });
  let qn = 0;
  L.var.forEach((it, i) => { if (!it.off) items.push({ key: 'Q' + (++qn), it, cls: 'Q', dur: durOf(it), psi: psiOf(it), idx: i }); });
  L.acc.forEach((it, i) => { if (!it.off) items.push({ key: 'A' + (i + 1), it, cls: 'A', dur: 'I', idx: i }); });
  // podział na części i miejsca podziału siatki
  const cuts = [];
  md.sups.forEach(p => { const t = p.t / 2000, hh = Math.max(...[p.segL, p.segR].filter(Boolean).map(s => s.sec.h)) / 1000; [p.x - t, p.x + t, p.x - t - hh, p.x + t + hh].forEach(x => cuts.push(x)); });
  md.segs.forEach(s => [0.25, 0.5, 0.75].forEach(f => cuts.push(s.x0 + f * s.L)));
  S.nodes.forEach(n => { const s = md.segs[n.seg]; if (s && n.a < s.L) cuts.push(s.x0 + n.a); });
  items.forEach(o => {
    if (o.sw) {
      o.parts = md.segs.map(s => ({ seg: s.i, dist: [{ x1: s.x0, x2: s.x1, q1: mt.gamma * s.sec.A * 1e-6, q2: mt.gamma * s.sec.A * 1e-6, mt: 0 }], pts: [] }));
      o.split = false; o.rg = { a: 0, b: md.Ltot, L: md.Ltot, xa: 0, xb: md.Ltot }; o.qsw = md.segs.map(s => mt.gamma * s.sec.A * 1e-6);
    } else {
      o.split = L.pattern && (o.it.kind === 'imp' || o.it.kind === 'other');
      const r = splitItem(o.it, md, o.split); o.parts = r.parts; o.rg = r.rg;
    }
    o.comp = loadComp(o.it.dir, o.it.proj, S); o.ptc = ptComp(o.it.dir, S);
    o.parts.forEach(p => { p.dist.forEach(d => cuts.push(d.x1, d.x2)); p.pts.forEach(q => cuts.push(q.x)); });
  });
  const X = makeMesh(md, cuts), nn = X.length, ne = nn - 1;
  const elSeg = new Int32Array(ne);
  for (let e = 0; e < ne; e++) elSeg[e] = segAt(md, (X[e] + X[e + 1]) / 2).i;
  const stX = new Float64Array(2 * ne), stSeg = new Int32Array(2 * ne);
  for (let e = 0; e < ne; e++) { stX[2 * e] = X[e]; stX[2 * e + 1] = X[e + 1]; stSeg[2 * e] = stSeg[2 * e + 1] = elSeg[e]; }
  // sztywności (wartości średnie: E_0,mean, G_mean – 2.2.2, 2.3.2.2)
  const EIy = [], EIz = [], GA = [], EA = [], GIt = [];
  for (let e = 0; e < ne; e++) {
    const sec = md.segs[elSeg[e]].sec;
    EIy.push(mt.E0m * sec.Iy * 1e-9); EIz.push(mt.E0m * sec.Iz * 1e-9);
    GA.push(S.sls.shear ? KAPPA * mt.Gm * sec.A * 1e-3 : 0); EA.push(mt.E0m * sec.A * 1e-3); GIt.push(mt.Gm * sec.It * 1e-9);
  }
  const supNode = md.sups.map(p => nodeIdx(X, p.x));
  const hinges = new Set();
  S.nodes.forEach(n => { const s = md.segs[n.seg]; if (s && n.hinge && n.a < s.L - 1e-6) hinges.add(nodeIdx(X, s.x0 + n.a)); });
  const supY = {}, supZ = {};
  md.sups.forEach((p, k) => {
    const i = supNode[k];
    const sy = {}; if (p.dof.y) sy.v = p.kv > 0 ? p.kv * 1000 : true; if (p.dof.r) sy.r = p.kr > 0 ? p.kr : true; if (sy.v || sy.r) supY[i] = sy;
    const sz = {}; if (p.dof.z) sz.v = true; if (p.dof.r) sz.r = true; if (sz.v || sz.r) supZ[i] = sz;
  });
  // które płaszczyzny są potrzebne
  const need = { y: false, z: false, x: false, t: false };
  items.forEach(o => {
    const c = o.comp, pc = o.ptc;
    o.parts.forEach(p => {
      if (p.dist.length) { if (Math.abs(c[1]) > 1e-12) need.y = true; if (Math.abs(c[2]) > 1e-12) need.z = true; if (Math.abs(c[0]) > 1e-12) need.x = true; if (p.dist.some(d => d.mt)) need.t = true; }
      p.pts.forEach(q => { if (q.P) { if (Math.abs(pc[1]) > 1e-12) need.y = true; if (Math.abs(pc[2]) > 1e-12) need.z = true; if (Math.abs(pc[0]) > 1e-12) need.x = true; } if (q.T) need.t = true; });
    });
  });
  const svY = makeBendSolver(X, EIy, GA, supY, hinges);
  if (!svY) { errors.push('Układ geometrycznie zmienny w płaszczyźnie pionowej (za mało podpór lub przeguby tworzą mechanizm) – zablokuj przesuw y / obrót podpór albo usuń przeguby.'); return { errors }; }
  let svZ = null, svX = null, svT = null;
  if (need.z) { svZ = makeBendSolver(X, EIz, GA.map(v => v), supZ, hinges); if (!svZ) errors.push('Obciążenia w płaszczyźnie Z (poziome) przy braku podparcia bocznego – zablokuj przesuw z w podporach.'); }
  if (need.x) { const sn = supNode.filter((i, k) => md.sups[k].dof.x); svX = sn.length ? makeBarSolver(X, EA, sn) : null; if (!svX) errors.push('Siły wzdłuż osi belki (belka nachylona) bez podpory nieprzesuwnej – zablokuj przesuw x w jednej z podpór.'); }
  if (need.t) { svT = makeBarSolver(X, GIt, supNode); if (!svT) errors.push('Brak podpór widełkowych dla momentów skręcających.'); }
  if (errors.length) return { errors };
  const zeros2 = new Float64Array(2 * ne), zerosN = new Float64Array(nn);
  const elIn = (e, d) => X[e] >= d.x1 - 1e-9 && X[e + 1] <= d.x2 + 1e-9;
  const qAt = (d, x) => d.x2 > d.x1 ? d.q1 + (d.q2 - d.q1) * (x - d.x1) / (d.x2 - d.x1) : d.q1;
  // rozwiązanie dla każdej części obciążenia (wartości charakterystyczne)
  function runPart(o, p) {
    const c = o.comp, pc = o.ptc;
    const qy = new Array(ne), qz = new Array(ne), qx = new Array(ne), qt = new Array(ne);
    const Py = new Array(nn).fill(0), Pz = new Array(nn).fill(0), Px = new Array(nn).fill(0), Pt = new Array(nn).fill(0);
    let any = { y: false, z: false, x: false, t: false };
    p.dist.forEach(d => {
      for (let e = 0; e < ne; e++) if (elIn(e, d)) {
        const a = qAt(d, X[e]), b = qAt(d, X[e + 1]);
        if (c[1]) { qy[e] = [(qy[e] ? qy[e][0] : 0) + a * c[1], (qy[e] ? qy[e][1] : 0) + b * c[1]]; any.y = true; }
        if (c[2]) { qz[e] = [(qz[e] ? qz[e][0] : 0) + a * c[2], (qz[e] ? qz[e][1] : 0) + b * c[2]]; any.z = true; }
        if (c[0]) { qx[e] = [(qx[e] ? qx[e][0] : 0) + a * c[0], (qx[e] ? qx[e][1] : 0) + b * c[0]]; any.x = true; }
        if (d.mt) { qt[e] = [(qt[e] ? qt[e][0] : 0) + d.mt, (qt[e] ? qt[e][1] : 0) + d.mt]; any.t = true; }
      }
    });
    p.pts.forEach(q => {
      const i = nodeIdx(X, q.x);
      if (q.P) { if (pc[1]) { Py[i] += q.P * pc[1]; any.y = true; } if (pc[2]) { Pz[i] += q.P * pc[2]; any.z = true; } if (pc[0]) { Px[i] += q.P * pc[0]; any.x = true; } }
      if (q.T) { Pt[i] += q.T; any.t = true; }
    });
    const r = { My: zeros2, Vy: zeros2, wy: zerosN, Mz: zeros2, Vz: zeros2, wz: zerosN, N: zeros2, T: zeros2, R: md.sups.map(() => ({ Ry: 0, My: 0, Rz: 0, Rx: 0 })) };
    if (any.y) { const a = bendRun(svY, qy, Py); r.My = a.Ms; r.Vy = a.Vs; r.wy = a.w; md.sups.forEach((s, k) => { const q = a.reac[supNode[k]]; if (q) { r.R[k].Ry = q.R; r.R[k].My = q.M; } }); }
    if (any.z && svZ) { const a = bendRun(svZ, qz, Pz); r.Mz = a.Ms; r.Vz = a.Vs; r.wz = a.w; md.sups.forEach((s, k) => { const q = a.reac[supNode[k]]; if (q) r.R[k].Rz = q.R; }); }
    if (any.x && svX) { const a = barRun(svX, qx, Px); r.N = a.Ns.map(v => -v); md.sups.forEach((s, k) => { const q = a.reac[supNode[k]]; if (q !== undefined) r.R[k].Rx = q; }); }
    if (any.t && svT) { const a = barRun(svT, qt, Pt); r.T = a.Ns; }
    return r;
  }
  items.forEach(o => {
    o.resp = o.parts.map(p => runPart(o, p));
    // siła podłużna stała podana w obciążeniu (+ ściskanie) – na całej długości belki
    if (o.it.N) o.resp.forEach((r, j) => { if (j === 0) r.N = Float64Array.from(r.N, v => v + o.it.N); });
    // obciążenie niedzielone: jedna jednostka = suma części
    o.units = o.split ? o.resp : [sumResp(o.resp, ne, nn, md.sups.length)];
  });
  // ugięcia względne w odcinkach (względem cięciwy podpór przęsła / podpory wspornika)
  const segRef = md.segs.map(s => {
    if (s.kind === 'span') return { i0: nodeIdx(X, s.x0), i1: nodeIdx(X, s.x1) };
    const sp = s.kind === 'cantL' ? s.x1 : s.x0; return { i0: nodeIdx(X, sp), i1: null };
  });
  const relDefl = w => {
    const o = new Float64Array(2 * ne);
    for (let e = 0; e < ne; e++) {
      const s = md.segs[elSeg[e]], ref = segRef[s.i];
      for (let k = 0; k < 2; k++) {
        const i = e + k, x = X[i];
        let base;
        if (ref.i1 === null) base = w[ref.i0];
        else { const xa = X[ref.i0], xb = X[ref.i1]; base = w[ref.i0] + (w[ref.i1] - w[ref.i0]) * (x - xa) / (xb - xa); }
        o[2 * e + k] = w[i] - base;
      }
    }
    return o;
  };
  items.forEach(o => o.units.forEach(u => { u.wr = relDefl(u.wy); u.wrz = relDefl(u.wz); u.wa = Float64Array.from({ length: 2 * ne }, (_, s) => u.wy[(s >> 1) + (s & 1)]); }));
  return { errors, items, X, ne, nn, stX, stSeg, elSeg, supNode, need, hinges };
}
function sumResp(list, ne, nn, ns) {
  if (list.length === 1) return list[0];
  const o = { R: Array.from({ length: ns }, () => ({ Ry: 0, My: 0, Rz: 0, Rx: 0 })) };
  ['My', 'Vy', 'Mz', 'Vz', 'N', 'T'].forEach(k => { const a = new Float64Array(2 * ne); list.forEach(r => { const b = r[k]; for (let i = 0; i < a.length; i++) a[i] += b[i]; }); o[k] = a; });
  ['wy', 'wz'].forEach(k => { const a = new Float64Array(nn); list.forEach(r => { const b = r[k]; for (let i = 0; i < a.length; i++) a[i] += b[i]; }); o[k] = a; });
  list.forEach(r => r.R.forEach((q, k) => { o.R[k].Ry += q.Ry; o.R[k].My += q.My; o.R[k].Rz += q.Rz; o.R[k].Rx += q.Rx; }));
  return o;
}

/* ------------------------------------------------------- kombinacje (PN-EN 1990) */
const fmtN = v => String(Math.round(v * 1000) / 1000).replace('.', ',');
function genCombos(S, st, mt) {
  const L = S.loads, items = st.items;
  const Q = items.filter(o => o.cls === 'Q'), A = items.filter(o => o.cls === 'A');
  const out = { uls: [], acc: [], fire: [], char: [], qp: [], freq: [] };
  const fams = ['P'].concat(DUR.filter(d => d !== 'P' && Q.some(o => o.dur === d)));
  const desc = (gs, f, pre) => {
    const t = [(pre || '') + `${fmtN(gs)}·G`];
    Object.keys(f).forEach(k => { if (f[k]) t.push(`${fmtN(f[k])}·${k}`); });
    return t.join(' + ');
  };
  let id = 0;
  fams.forEach(d => {
    const inc = Q.filter(o => durIdx(o.dur) <= durIdx(d));
    const kmod = mt.kmod[d];
    const push = (eq, gs, f, lead) => out.uls.push({ id: ++id, type: 'ULS', eq, fam: d, kmod, gM: mt.gM, gs, gi: L.gGi, f, lead, desc: desc(gs, f) });
    if (L.comb === '610') {
      if (!inc.length) push('6.10', L.gG, {}, null);
      inc.forEach(ld => { const f = {}; inc.forEach(o => { f[o.key] = o === ld ? L.gQ : L.gQ * o.psi.p0; }); push('6.10', L.gG, f, ld.key); });
    } else {
      const fa = {}; inc.forEach(o => { fa[o.key] = L.gQ * o.psi.p0; });
      push('6.10a', L.gG, fa, null);
      inc.forEach(ld => { const f = {}; inc.forEach(o => { f[o.key] = o === ld ? L.gQ : L.gQ * o.psi.p0; }); push('6.10b', L.xi * L.gG, f, ld.key); });
    }
  });
  // wyjątkowa (6.11b): A_d + G + ψ₁(ψ₂)·Q₁ + Σψ₂·Q_i; k_mod – chwilowe, γ_M,A
  A.forEach(a => {
    [null].concat(Q).forEach(ld => {
      const f = {}; f[a.key] = 1;
      Q.forEach(o => { f[o.key] = o === ld ? (L.accPsi === 'psi2' ? o.psi.p2 : o.psi.p1) : o.psi.p2; });
      out.acc.push({ id: ++id, type: 'ACC', eq: '6.11b', fam: 'I', kmod: mt.kmod.I, gM: mt.gMA, gs: 1, gi: 1, f, lead: ld ? ld.key : null, acc: a.key, desc: desc(1, f) });
    });
  });
  // pożar (PN-EN 1990 6.11b, PN-EN 1991-1-2 4.3.1): G + ψ₁/ψ₂·Q₁ + Σψ₂·Q_i
  [null].concat(Q).forEach(ld => {
    const f = {}; Q.forEach(o => { f[o.key] = o === ld ? (S.fire.psi === 'psi1' ? o.psi.p1 : o.psi.p2) : o.psi.p2; });
    if (ld && !f[ld.key] && Q.length) return;
    out.fire.push({ id: ++id, type: 'FIRE', eq: '6.11b', fam: 'fi', kmod: 1, gM: 1, gs: 1, gi: 1, f, lead: ld ? ld.key : null, desc: desc(1, f) });
  });
  // SGU: charakterystyczna (6.14b) – każde obciążenie zmienne wiodące; quasi-stała (6.16b)
  [null].concat(Q).forEach(ld => {
    if (!ld && Q.length) return;
    const f = {}; Q.forEach(o => { f[o.key] = o === ld ? 1 : o.psi.p0; });
    out.char.push({ id: ++id, type: 'CHAR', eq: '6.14b', gs: 1, gi: 1, f, lead: ld ? ld.key : null, desc: desc(1, f) });
  });
  { const f = {}; Q.forEach(o => { f[o.key] = o.psi.p2; }); out.qp.push({ id: ++id, type: 'QP', eq: '6.16b', gs: 1, gi: 1, f, lead: null, desc: desc(1, f) }); }
  return out;
}
// obwiednia wielkości key w kombinacji c: obciążenia stałe jednym współczynnikiem (γ_G,sup gdy niekorzystne, γ_G,inf gdy korzystne),
// obciążenia zmienne i wyjątkowe tylko tam, gdzie działają niekorzystnie (każda część osobno – układ szachownicowy)
function combEnv(st, c, key) {
  const n = st.items[0] ? st.items[0].units[0][key].length : 0;
  const mx = new Float64Array(n), mn = new Float64Array(n), G = new Float64Array(n);
  st.items.forEach(o => { if (o.cls !== 'G') return; o.units.forEach(u => { const a = u[key]; for (let i = 0; i < n; i++) G[i] += a[i]; }); });
  for (let i = 0; i < n; i++) { const g = G[i]; mx[i] = (g >= 0 ? c.gs : c.gi) * g; mn[i] = (g <= 0 ? c.gs : c.gi) * g; }
  st.items.forEach(o => {
    const f = c.f[o.key]; if (!f || o.cls === 'G') return;
    o.units.forEach(u => { const a = u[key]; for (let i = 0; i < n; i++) { const v = a[i] * f; if (v > 0) mx[i] += v; else mn[i] += v; } });
  });
  return { mx, mn };
}
function combReac(st, c, k, key) {
  let G = 0; st.items.forEach(o => { if (o.cls === 'G') o.units.forEach(u => { G += u.R[k][key]; }); });
  let mx = (G >= 0 ? c.gs : c.gi) * G, mn = (G <= 0 ? c.gs : c.gi) * G;
  st.items.forEach(o => { const f = c.f[o.key]; if (!f || o.cls === 'G') return; o.units.forEach(u => { const v = u.R[k][key] * f; if (v > 0) mx += v; else mn += v; }); });
  return { mx, mn };
}
// ugięcia SGU wg PN-EN 1995-1-1 2.2.3: w_inst = w_G + w_Q1 + Σψ0·w_Qi; w_fin = w_G(1+k_def) + w_Q1(1+ψ2,1·k_def) + Σw_Qi(ψ0,i + ψ2,i·k_def)
function deflEnv(st, kdef, key) {
  key = key || 'wr';
  const n = 2 * st.ne, Q = st.items.filter(o => o.cls === 'Q');
  const G = new Float64Array(n);
  st.items.forEach(o => { if (o.cls === 'G') o.units.forEach(u => { const a = u[key]; for (let i = 0; i < n; i++) G[i] += a[i]; }); });
  const res = { instMx: new Float64Array(n).fill(-Infinity), instMn: new Float64Array(n).fill(Infinity), finMx: new Float64Array(n).fill(-Infinity), finMn: new Float64Array(n).fill(Infinity), G, qp: new Float64Array(n) };
  const leads = Q.length ? Q : [null];
  leads.forEach(ld => {
    const iMx = Float64Array.from(G), iMn = Float64Array.from(G), fMx = Float64Array.from(G, v => v * (1 + kdef)), fMn = Float64Array.from(fMx);
    Q.forEach(o => {
      const fi = o === ld ? 1 : o.psi.p0, ff = o === ld ? 1 + o.psi.p2 * kdef : o.psi.p0 + o.psi.p2 * kdef;
      o.units.forEach(u => { const a = u[key]; for (let i = 0; i < n; i++) { const v = a[i]; if (v > 0) { iMx[i] += fi * v; fMx[i] += ff * v; } else { iMn[i] += fi * v; fMn[i] += ff * v; } } });
    });
    for (let i = 0; i < n; i++) { res.instMx[i] = Math.max(res.instMx[i], iMx[i]); res.instMn[i] = Math.min(res.instMn[i], iMn[i]); res.finMx[i] = Math.max(res.finMx[i], fMx[i]); res.finMn[i] = Math.min(res.finMn[i], fMn[i]); }
  });
  // quasi-stała (do drgań / informacyjnie)
  for (let i = 0; i < n; i++) res.qp[i] = G[i];
  Q.forEach(o => o.units.forEach(u => { const a = u[key]; for (let i = 0; i < n; i++) res.qp[i] += o.psi.p2 * a[i]; }));
  return res;
}

/* ------------------------------------------------ zwichrzenie i wyboczenie */
// kształt obciążenia w odcinku (do l_ef wg tab. 6.1): 'q' – rozłożone, 'P' – siła skupiona w środku przęsła / na końcu wspornika, '' – inne
function loadShape(st, seg) {
  let Pq = 0, Pp = 0, Pmid = 0;
  st.items.forEach(o => {
    if (o.cls === 'A') return;
    o.parts.forEach(p => {
      p.dist.forEach(d => { const a = Math.max(d.x1, seg.x0), b = Math.min(d.x2, seg.x1); if (b > a) Pq += Math.abs((d.q1 + d.q2) / 2 * o.comp[1]) * (b - a); });
      p.pts.forEach(q => { if (q.x >= seg.x0 - 1e-9 && q.x <= seg.x1 + 1e-9) { const v = Math.abs(q.P * o.ptc[1]); Pp += v; const rel = (q.x - seg.x0) / seg.L; if (seg.kind === 'span' ? Math.abs(rel - 0.5) < 0.1 : (seg.kind === 'cantR' ? rel > 0.9 : rel < 0.1)) Pmid += v; } });
    });
  });
  if (Pp <= 0.25 * Pq) return 'q';
  if (Pmid >= 0.75 * (Pp + Pq)) return 'P';
  return '';
}
function ltbOf(S, mt, md, st, seg) {
  const T = S.ltb, sec = seg.sec, h = sec.h;
  const shape = loadShape(st, seg);
  const zone = sgn => {
    const z = { sgn, on: T.on };
    const a = sgn > 0 ? T.top : T.bot, man = sgn > 0 ? T.lefTop : T.lefBot;
    const cant = seg.kind !== 'span';
    if (!T.on) { z.kcrit = 1; z.src = 'zwichrzenie pominięte (stateczność boczna zapewniona konstrukcyjnie – decyzja projektanta)'; return z; }
    if (a === 0) { z.kcrit = 1; z.src = `krawędź ${sgn > 0 ? 'górna' : 'dolna'} stężona w sposób ciągły (np. poszyciem) – zwichrzenie nie występuje`; z.cont = true; return z; }
    let l, f, src;
    if (a !== '' && a > 0 && a < seg.L) { l = a; f = 1.0; src = `rozstaw stężeń krawędzi ${sgn > 0 ? 'górnej' : 'dolnej'} a = ${fmtN(a)} m; l_ef/l = 1,0 (bezpiecznie – stały moment)`; }
    else if (!cant && sgn > 0) { l = seg.L; f = shape === 'q' ? 0.9 : shape === 'P' ? 0.8 : 1.0; src = `belka swobodnie podparta, ${shape === 'q' ? 'obciążenie równomiernie rozłożone – l_ef/l = 0,9' : shape === 'P' ? 'siła skupiona w środku rozpiętości – l_ef/l = 0,8' : 'obciążenie mieszane – l_ef/l = 1,0 (bezpiecznie)'} (tab. 6.1)`; }
    else if (!cant) { l = seg.L; f = 1.0; src = 'strefa momentów ujemnych bez stężeń krawędzi dolnej – l_ef = l przęsła (bezpiecznie)'; }
    else { l = seg.L; f = shape === 'P' ? 0.8 : shape === 'q' ? 0.5 : 0.8; src = `wspornik, ${shape === 'P' ? 'siła skupiona na końcu – l_ef/l = 0,8' : shape === 'q' ? 'obciążenie równomiernie rozłożone – l_ef/l = 0,5' : 'obciążenie mieszane – l_ef/l = 0,8 (bezpiecznie)'} (tab. 6.1)`; }
    let lef = l * f * 1000, corr = 0;
    if (man !== '' && man > 0) { lef = man * 1000; src = `l_ef = ${fmtN(man)} m – podana ręcznie`; z.man = true; }
    else {
      const atComp = (T.pos === 'top' && sgn > 0) || (T.pos === 'bottom' && sgn < 0);
      const atTens = (T.pos === 'top' && sgn < 0) || (T.pos === 'bottom' && sgn > 0);
      corr = atComp ? 2 * h : atTens ? -0.5 * h : 0;
      lef = Math.max(lef + corr, 0.1 * lef);
    }
    Object.assign(z, { l, f, lef, corr, src });
    const E005 = mt.E005, G05 = mt.G05;
    z.sigcrit = Math.PI * Math.sqrt(E005 * sec.Iz * G05 * sec.It) / (lef * sec.Wy);
    z.sig632 = 0.78 * sec.b * sec.b * E005 / (h * lef);
    z.lam = Math.sqrt(mt.m.fmk / z.sigcrit);
    z.kcrit = z.lam <= 0.75 ? 1 : z.lam <= 1.4 ? 1.56 - 0.75 * z.lam : 1 / (z.lam * z.lam);
    return z;
  };
  return { plus: zone(1), minus: zone(-1), shape };
}
function bucklOf(S, mt, seg) {
  const sec = seg.sec, cant = seg.kind !== 'span';
  const ly = S.stab.ky * seg.L * (cant ? 2 : 1) * 1000;
  const aT = S.ltb.top;
  const lzBase = aT !== '' && aT > 0 && aT < seg.L ? aT : seg.L * (cant ? 2 : 1);
  const lz = S.stab.kz * lzBase * 1000;
  const bc = mt.F.betaC;
  const one = (lc, i, contR) => {
    const lam = lc / i, lr = lam / Math.PI * Math.sqrt(mt.m.fc0k / mt.E005);
    if (contR) return { lc, lam, lr: 0, k: 0, kc: 1, cont: true };
    const k = 0.5 * (1 + bc * (lr - 0.3) + lr * lr);
    return { lc, lam, lr, k, kc: lr <= 0.3 ? 1 : 1 / (k + Math.sqrt(k * k - lr * lr)) };
  };
  return { y: one(ly, sec.iy), z: one(lz, sec.iz, aT === 0), betaC: bc };
}

/* ------------------------------------------------------------- odporność ogniowa */
function charDepth(S, mt) {
  const F = S.fire, t = F.R, fam = mt.F, m = mt.m;
  let bn = fam.betaN, b0 = fam.beta0;
  if (bn === null) { const r = m.rhok; bn = r >= 450 ? 0.55 : r <= 290 ? 0.7 : 0.7 - 0.15 * (r - 290) / 160; b0 = r >= 450 ? 0.50 : r <= 290 ? 0.65 : 0.65 - 0.15 * (r - 290) / 160; }
  const o = { t, bn, b0, d0: 7, prot: F.prot };
  if (F.prot === 'none') { o.dchar = bn * t; o.k0 = Math.min(1, t / 20); o.tch = 0; }
  else {
    const hp = F.hp;
    const tch = F.prot === 'manual' && F.tch !== '' ? F.tch : Math.max(0, 2.8 * hp - 14);
    const tf = F.tf !== '' && F.tf >= tch ? F.tf : tch;
    const k2 = Math.max(0, 1 - 0.018 * hp), k3 = 2;
    const ta = tch >= tf - 1e-9 ? Math.min(2 * tf, 25 / (k3 * bn) + tf) : (25 - (tf - tch) * k2 * bn) / (k3 * bn) + tf;
    const d = tt => {
      if (tt <= tch) return 0;
      let v = k2 * bn * (Math.min(tt, tf) - tch);
      if (tt > tf) v += k3 * bn * (Math.min(tt, ta) - tf);
      if (tt > ta) v += bn * (tt - ta);
      return v;
    };
    Object.assign(o, { hp, tch, tf, k2, k3, ta, dchar: d(t), k0: tch > 20 ? Math.min(1, t / tch) : Math.min(1, t / 20) });
  }
  o.def = o.dchar + o.k0 * o.d0;
  return o;
}

/* ------------------------------------------------------------ sprawdzenia */
const STL = { ok: 'OK', fail: 'NIE', warn: 'UWAGA', info: 'INFO' };
function mkCheck(o) {
  const c = Object.assign({ status: 'ok', unit: '', fmt: 2 }, o);
  if (c.status !== 'info' && c.status !== 'warn') c.status = c.ratio > 1 + 1e-9 ? 'fail' : 'ok';
  return c;
}
function calc(S0) {
  const S = normalize(S0);
  const R = { S, errors: [], warns: [], checks: [] };
  try {
    const mt = R.mt = materials(S);
    const md = R.md = beamModel(S);
    if (!md.segs.length || md.Ltot <= 0) { R.errors.push('Brak geometrii belki.'); return R; }
    md.segs.forEach(s => { if (s.sec.h / s.sec.b > 12) R.warns.push(`${s.label}: bardzo smukły przekrój h/b = ${fmtN(Math.round(s.sec.h / s.sec.b * 10) / 10)} – sprawdź stateczność i dostępność elementu.`); });
    const st = R.st = statics(S, mt, md);
    if (st.errors.length) { R.errors = st.errors; return R; }
    const cb = R.cb = genCombos(S, st, mt);
    // obwiednie
    const keys = ['My', 'Vy', 'N', 'Mz', 'Vz', 'T'];
    const envOf = list => { const o = {}; keys.forEach(k => { const mx = new Float64Array(2 * st.ne).fill(-Infinity), mn = new Float64Array(2 * st.ne).fill(Infinity); list.forEach(c => { const e = c.env[k]; for (let i = 0; i < mx.length; i++) { if (e.mx[i] > mx[i]) mx[i] = e.mx[i]; if (e.mn[i] < mn[i]) mn[i] = e.mn[i]; } }); if (!list.length) { mx.fill(0); mn.fill(0); } o[k] = { mx, mn }; }); return o; };
    const zeroEnv = { mx: new Float64Array(2 * st.ne), mn: new Float64Array(2 * st.ne) };
    const needKey = k => k === 'My' || k === 'Vy' || (k === 'N' && (st.need.x || st.items.some(o => o.it.N))) || ((k === 'Mz' || k === 'Vz') && st.need.z) || (k === 'T' && st.need.t);
    [cb.uls, cb.acc, cb.fire, cb.char, cb.qp].forEach(list => list.forEach(c => { c.env = {}; keys.forEach(k => { c.env[k] = needKey(k) ? combEnv(st, c, k) : zeroEnv; }); }));
    R.env = { uls: envOf(cb.uls), acc: cb.acc.length ? envOf(cb.acc) : null, fire: S.fire.on ? envOf(cb.fire) : null, char: envOf(cb.char), qp: envOf(cb.qp) };
    R.defl = deflEnv(st, mt.kdef, 'wr');
    R.deflA = deflEnv(st, mt.kdef, 'wa');
    if (st.need.z) R.deflZ = deflEnv(st, mt.kdef, 'wrz');
    // reakcje
    R.reac = md.sups.map((p, k) => {
      const o = { ULS: { mx: -Infinity, mn: Infinity }, CHAR: { mx: -Infinity, mn: Infinity }, G: 0, items: {} };
      st.items.forEach(it => { let v = 0, h = 0, z = 0, m = 0; it.units.forEach(u => { v += u.R[k].Ry; h += u.R[k].Rx; z += u.R[k].Rz; m += u.R[k].My; }); o.items[it.key] = { Ry: v, Rx: h, Rz: z, My: m }; if (it.cls === 'G') o.G += v; });
      cb.uls.concat(cb.acc).forEach(c => { const r = combReac(st, c, k, 'Ry'); c.reac = c.reac || []; c.reac[k] = r; if (c.type === 'ULS') { o.ULS.mx = Math.max(o.ULS.mx, r.mx); o.ULS.mn = Math.min(o.ULS.mn, r.mn); } });
      cb.char.forEach(c => { const r = combReac(st, c, k, 'Ry'); o.CHAR.mx = Math.max(o.CHAR.mx, r.mx); o.CHAR.mn = Math.min(o.CHAR.mn, r.mn); });
      const H = cb.uls.map(c => combReac(st, c, k, 'Rx')), Z = cb.uls.map(c => combReac(st, c, k, 'Rz')), M = cb.uls.map(c => combReac(st, c, k, 'My'));
      o.H = { mx: Math.max(...H.map(r => r.mx)), mn: Math.min(...H.map(r => r.mn)) };
      o.Z = { mx: Math.max(...Z.map(r => r.mx)), mn: Math.min(...Z.map(r => r.mn)) };
      o.M = { mx: Math.max(...M.map(r => r.mx)), mn: Math.min(...M.map(r => r.mn)) };
      return o;
    });
    runChecks(R);
  } catch (e) {
    R.errors.push('Błąd obliczeń: ' + (e && e.message ? e.message : e));
    if (typeof console !== 'undefined') console.error(e);
  }
  return R;
}

function runChecks(R) {
  const { S, mt, md, st, cb } = R, C = R.checks, km = mt.km;
  const ne = st.ne, ns = 2 * ne;
  const eta = { bend: new Float64Array(ns), shear: new Float64Array(ns), stab: new Float64Array(ns) };
  R.eta = eta;
  const ulsAll = cb.uls.concat(cb.acc);
  const hasZ = st.need.z, hasN = st.need.x || st.items.some(o => o.it.N), hasT = st.need.t;
  R.segData = md.segs.map(seg => {
    const sec = seg.sec, sb = strengthBase(mt, sec);
    const ltb = ltbOf(S, mt, md, st, seg), buck = bucklOf(S, mt, seg);
    const idx = []; for (let i = 0; i < ns; i++) if (st.stSeg[i] === seg.i) idx.push(i);
    // strefy redukcji siły poprzecznej (6.1.7(3)): odległość h od krawędzi podpory bezpośredniej, obciążenie na górnej powierzchni
    const redOn = S.coef.vRed && S.ltb.pos === 'top';
    const red = i => redOn && md.sups.some(p => p.direct && Math.abs(st.stX[i] - p.x) < (p.t / 2 + sec.h) / 1000 - 1e-9);
    let vIdx = idx.filter(i => !red(i));
    if (!vIdx.length) { let best = null, bd = Infinity; idx.forEach(i => { const d = Math.min(...md.sups.map(p => Math.abs(Math.abs(st.stX[i] - p.x) - (p.t / 2 + sec.h) / 1000))); if (d < bd) { bd = d; best = i; } }); vIdx = best !== null ? [best] : idx; }
    const G = {};
    const upd = (key, r, d) => { if (!G[key] || r > G[key].ratio) G[key] = Object.assign({ ratio: r }, d); };
    ulsAll.forEach(c => {
      const kmod = c.kmod, gM = c.gM, E = c.env;
      const f = { my: kmod * sb.fmy / gM, mz: kmod * sb.fmz / gM, c0: kmod * sb.fc0 / gM, t0: kmod * sb.ft0 / gM, v: kmod * sb.fv / gM, vz: kmod * sb.fvz / gM };
      const vSet = new Set(vIdx);
      idx.forEach(i => {
        const My = Math.max(Math.abs(E.My.mx[i]), Math.abs(E.My.mn[i])), Mz = Math.max(Math.abs(E.Mz.mx[i]), Math.abs(E.Mz.mn[i]));
        const Nc = Math.max(0, E.N.mx[i]), Nt = Math.max(0, -E.N.mn[i]);
        const smy = My * 1e6 / sec.Wy, smz = Mz * 1e6 / sec.Wz, sc = Nc * 1e3 / sec.A, stt = Nt * 1e3 / sec.A;
        const bm = Math.max(smy / f.my + km * smz / f.mz, km * smy / f.my + smz / f.mz);
        const base = { i, x: st.stX[i], c, kmod, gM, f, My, Mz, Nc, Nt, smy, smz, sc, st: stt };
        upd('bend', bm, base);
        let eb = bm;
        if (Nt > 1e-9) { const r = stt / f.t0 + bm; upd('tens', r, base); eb = Math.max(eb, r); }
        if (Nc > 1e-9) {
          const r = (sc / f.c0) ** 2 + bm; upd('compS', r, base); eb = Math.max(eb, r);
          const r1 = sc / (buck.y.kc * f.c0) + smy / f.my + km * smz / f.mz, r2 = sc / (buck.z.kc * f.c0) + km * smy / f.my + smz / f.mz;
          upd('buck', Math.max(r1, r2), Object.assign({ r1, r2 }, base)); eta.stab[i] = Math.max(eta.stab[i], r1, r2);
        }
        if (eb > eta.bend[i]) eta.bend[i] = eb;
        // zwichrzenie
        [['plus', Math.max(0, E.My.mx[i])], ['minus', Math.max(0, -E.My.mn[i])]].forEach(([zk, M]) => {
          const z = ltb[zk]; if (!(M > 1e-9) || z.kcrit >= 1) return;
          const sm = M * 1e6 / sec.Wy;
          let r = sm / (z.kcrit * f.my); const r0 = r;
          if (Nc > 1e-9) r = (sm / (z.kcrit * f.my)) ** 2 + sc / (buck.z.kc * f.c0);
          if (smz > 1e-9) r += smz / f.mz;
          upd('ltb' + zk, r, Object.assign({ sm, r0, M }, base)); if (r > eta.stab[i]) eta.stab[i] = r;
        });
        // ścinanie i skręcanie
        const Vy = Math.max(Math.abs(E.Vy.mx[i]), Math.abs(E.Vy.mn[i])), Vz = Math.max(Math.abs(E.Vz.mx[i]), Math.abs(E.Vz.mn[i])), Tt = Math.max(Math.abs(E.T.mx[i]), Math.abs(E.T.mn[i]));
        const ty = 1.5 * Vy * 1e3 / (mt.kcr * sec.b * sec.h), tz = 1.5 * Vz * 1e3 / (mt.kcr * sec.b * sec.h), tt = Tt * 1e6 / sec.Wt;
        const sb2 = Object.assign({}, base, { Vy, Vz, T: Tt, ty, tz, tt });
        let es = 0;
        if (vSet.has(i)) { upd('shear', ty / f.v, sb2); es = ty / f.v; if (Vz > 1e-9) { const r = (ty / f.v) ** 2 + (tz / f.vz) ** 2; upd('shear2', r, sb2); upd('shearz', tz / f.vz, sb2); es = Math.max(es, r); } }
        if (Tt > 1e-9) { const r = tt / (sec.kshape * f.v); upd('tor', r, sb2); const r2 = r + (ty / f.v) ** 2 + (tz / f.vz) ** 2; upd('torv', r2, sb2); es = Math.max(es, r, r2); }
        if (es > eta.shear[i]) eta.shear[i] = es;
      });
    });
    return { seg, sec, sb, ltb, buck, idx, vIdx, G, redOn };
  });
  const segName = s => md.segs.length > 1 ? ` – ${s.label}` : '';
  const cmb = c => c ? `${c.eq}${c.type === 'ACC' ? ' (wyjątkowa)' : ''}, k_mod = ${fmtN(c.kmod)} (${c.fam === 'I' && c.type === 'ACC' ? 'chwilowe' : DUR_NAME[c.fam] || ''})` : '';
  R.segData.forEach(sd => {
    const s = sd.seg, G = sd.G;
    if (G.bend) C.push(mkCheck({ id: `bend${s.i}`, grp: 'SGN – zginanie', name: (hasZ ? 'Zginanie dwukierunkowe σ_{m,y,d}/f_{m,y,d} + k_{m}·σ_{m,z,d}/f_{m,z,d} ≤ 1' : 'Zginanie σ_{m,y,d} ≤ f_{m,y,d}') + segName(s), ref: '6.1.6', seg: s.i, ratio: G.bend.ratio, Ed: hasZ ? G.bend.ratio : G.bend.smy, Rd: hasZ ? 1 : G.bend.f.my, unit: hasZ ? '' : 'MPa', d: G.bend, combo: cmb(G.bend.c) }));
    if (G.tens) C.push(mkCheck({ id: `tens${s.i}`, grp: 'SGN – zginanie', name: 'Zginanie z rozciąganiem osiowym (6.17), (6.18)' + segName(s), ref: '6.2.3', seg: s.i, ratio: G.tens.ratio, Ed: G.tens.ratio, Rd: 1, d: G.tens, combo: cmb(G.tens.c) }));
    if (G.compS) C.push(mkCheck({ id: `comp${s.i}`, grp: 'SGN – zginanie', name: 'Zginanie ze ściskaniem osiowym – przekrój (6.19), (6.20)' + segName(s), ref: '6.2.4', seg: s.i, ratio: G.compS.ratio, Ed: G.compS.ratio, Rd: 1, d: G.compS, combo: cmb(G.compS.c) }));
    if (G.shear) C.push(mkCheck({ id: `shear${s.i}`, grp: 'SGN – ścinanie i skręcanie', name: 'Ścinanie τ_{d} ≤ f_{v,d}' + (sd.redOn ? ' (V_{Ed} poza strefą h od lica podpór)' : '') + segName(s), ref: '6.1.7', seg: s.i, ratio: G.shear.ratio, Ed: G.shear.ty, Rd: G.shear.f.v, unit: 'MPa', d: G.shear, combo: cmb(G.shear.c) }));
    if (G.shear2) C.push(mkCheck({ id: `shear2${s.i}`, grp: 'SGN – ścinanie i skręcanie', name: 'Ścinanie dwukierunkowe (τ_{y}/f_{v,d})² + (τ_{z}/f_{v,d})² ≤ 1' + segName(s), ref: '6.1.7', seg: s.i, ratio: G.shear2.ratio, Ed: G.shear2.ratio, Rd: 1, d: G.shear2, combo: cmb(G.shear2.c), note: 'interakcja wg praktyki (DIN EN 1995-1-1/NA, NCI)' }));
    if (G.tor) C.push(mkCheck({ id: `tor${s.i}`, grp: 'SGN – ścinanie i skręcanie', name: 'Skręcanie τ_{tor,d} ≤ k_{shape}·f_{v,d}' + segName(s), ref: '6.1.8', seg: s.i, ratio: G.tor.ratio, Ed: G.tor.tt, Rd: sd.sec.kshape * G.tor.f.v, unit: 'MPa', d: G.tor, combo: cmb(G.tor.c) }));
    if (G.torv) C.push(mkCheck({ id: `torv${s.i}`, grp: 'SGN – ścinanie i skręcanie', name: 'Skręcanie ze ścinaniem τ_{tor}/(k_{shape}f_{v,d}) + (τ_{y}/f_{v,d})² + (τ_{z}/f_{v,d})² ≤ 1' + segName(s), ref: '6.1.8', seg: s.i, ratio: G.torv.ratio, Ed: G.torv.ratio, Rd: 1, d: G.torv, combo: cmb(G.torv.c), note: 'interakcja wg DIN EN 1995-1-1/NA (NCI)' }));
    ['plus', 'minus'].forEach(zk => { const g = G['ltb' + zk]; if (!g) return; const z = sd.ltb[zk];
      C.push(mkCheck({ id: `ltb${zk}${s.i}`, grp: 'SGN – stateczność', name: `Zwichrzenie ${zk === 'plus' ? '(M > 0, ściskana krawędź górna)' : '(M < 0, ściskana krawędź dolna)'} σ_{m,d} ≤ k_{crit}·f_{m,d}` + segName(s), ref: '6.3.3', seg: s.i, ratio: g.ratio, Ed: g.ratio, Rd: 1, d: Object.assign({ z }, g), combo: cmb(g.c), note: `l_ef = ${fmtN(Math.round(z.lef) / 1000)} m, λ_rel,m = ${fmtN(Math.round(z.lam * 1000) / 1000)}, k_crit = ${fmtN(Math.round(z.kcrit * 1000) / 1000)}` })); });
    if (G.buck) C.push(mkCheck({ id: `buck${s.i}`, grp: 'SGN – stateczność', name: 'Wyboczenie przy ściskaniu ze zginaniem (6.23), (6.24)' + segName(s), ref: '6.3.2', seg: s.i, ratio: G.buck.ratio, Ed: G.buck.ratio, Rd: 1, d: Object.assign({ b: sd.buck }, G.buck), combo: cmb(G.buck.c), note: `k_c,y = ${fmtN(Math.round(sd.buck.y.kc * 1000) / 1000)}, k_c,z = ${fmtN(Math.round(sd.buck.z.kc * 1000) / 1000)}` }));
  });
  supChecks(R);
  colChecks(R);
  slsChecks(R);
  if (S.fire.on) fireChecks(R);
  infoChecks(R);
  // kolejność: grupy sprawdzeń (w grupie – kolejność odcinków / podpór)
  const GO = ['SGN – zginanie', 'SGN – ścinanie i skręcanie', 'SGN – docisk i podcięcia', 'SGN – stateczność', 'Słup', 'SGU – ugięcia', 'SGU – drgania', 'Pożar', 'Konstrukcja i wykonanie'];
  const gr = c => { const i = GO.findIndex(g => c.grp.startsWith(g)); return i < 0 ? GO.length : i; };
  C.forEach((c, i) => { c._o = i; });
  C.sort((a, b) => gr(a) - gr(b) || a._o - b._o);
  C.forEach(c => { delete c._o; });
  const real = C.filter(c => c.status !== 'info' && c.status !== 'warn' && isFinite(c.ratio));
  R.maxEta = real.length ? Math.max(...real.map(c => c.ratio)) : 0;
  R.fails = C.filter(c => c.status === 'fail').length;
}

// docisk na podporach (6.1.5), belki podcięte (6.5.2), odrywanie
function bearingLen(R, p, sec) {
  const { md } = R, l = p.t;
  const near = side => {
    // wolna długość po stronie side (−1 lewo, +1 prawo) do sąsiedniej podpory albo końca belki
    const seg = side < 0 ? p.segL : p.segR;
    if (!seg) return { end: true, a: p.a, l1: Infinity };
    const other = side < 0 ? seg.supL : seg.supR;
    const l1 = other ? (seg.L * 1000 - l / 2 - other.t / 2) : Infinity;
    return { end: false, l1 };
  };
  const L = near(-1), Rr = near(1);
  const ext = s => s.end ? Math.min(30, s.a) : Math.min(30, s.l1 / 2);
  const eL = ext(L), eR = ext(Rr);
  const l1 = Math.min(L.end ? Infinity : L.l1, Rr.end ? Infinity : Rr.l1);
  return { l, eL, eR, lef: l + eL + eR, l1, endL: L.end, endR: Rr.end };
}
function kc90Of(R, p, bl, h) {
  const { S, mt } = R;
  if (p.kc90 > 0) return { k: p.kc90, src: 'podany ręcznie' };
  if (S.coef.kc90 !== 'auto') return { k: S.coef.kc90, src: 'podany ręcznie (ogólnie)' };
  const fam = mt.m.fam;
  if (!(bl.l1 >= 2 * h)) return { k: 1.0, src: `l₁ = ${isFinite(bl.l1) ? Math.round(bl.l1) : '∞'} mm < 2h = ${Math.round(2 * h)} mm → k_c,90 = 1,0` };
  if (fam === 'C' || (fam === 'U' && mt.F.kind === 'solid')) return { k: 1.5, src: `podpora punktowa, drewno lite iglaste, l₁ ≥ 2h → k_c,90 = 1,5 (6.1.5(4))` };
  if (fam === 'GLh' || fam === 'GLc') return bl.l <= 400 ? { k: 1.75, src: `podpora punktowa, drewno klejone, l₁ ≥ 2h, l ≤ 400 mm → k_c,90 = 1,75 (6.1.5(4))` } : { k: 1.0, src: 'l > 400 mm → k_c,90 = 1,0' };
  return { k: 1.0, src: 'dla tego materiału k_c,90 = 1,0 (6.1.5(2))' };
}
function supChecks(R) {
  const { S, mt, md, st, cb } = R, C = R.checks;
  const ulsAll = cb.uls.concat(cb.acc);
  R.supData = md.sups.map((p, k) => {
    const segs = [p.segL, p.segR].filter(Boolean), sec = segs.reduce((a, s) => (!a || s.sec.b < a.b ? s.sec : a), null);
    const h = Math.max(...segs.map(s => s.sec.h));
    const bl = bearingLen(R, p, sec), kc = kc90Of(R, p, bl, h);
    const o = { p, sec, h, bl, kc, bear: null, notch: null, uplift: null };
    if (p.dof.y && p.t > 0) {
      let best = null;
      ulsAll.forEach(c => {
        const F = Math.max(0, c.reac[k].mx);
        const s = F * 1e3 / (sec.b * bl.lef), fd = c.kmod * mt.m.fc90k / c.gM, r = s / (kc.k * fd);
        if (!best || r > best.ratio) best = { ratio: r, F, s, fd, c };
      });
      o.bear = best;
      C.push(mkCheck({ id: `bear${k}`, grp: 'SGN – docisk i podcięcia', name: `Docisk w podporze ${p.label} σ_{c,90,d} ≤ k_{c,90}·f_{c,90,d}`, ref: '6.1.5', sup: k, ratio: best.ratio, Ed: best.s, Rd: kc.k * best.fd, unit: 'MPa', d: Object.assign({ bl, kc }, best), combo: `${best.c.eq}, k_mod = ${fmtN(best.c.kmod)}`,
        note: `l_ef = ${Math.round(bl.lef)} mm, F = ${fmtN(Math.round(best.F * 10) / 10)} kN; t_min z docisku = ${Math.max(0, Math.ceil(best.F * 1e3 / (sec.b * kc.k * best.fd) - bl.eL - bl.eR))} mm` }));
      const up = Math.min(...ulsAll.map(c => c.reac[k].mn));
      if (up < -0.05) { o.uplift = up; C.push(mkCheck({ id: `upl${k}`, grp: 'SGN – docisk i podcięcia', name: `Reakcja odrywająca w podporze ${p.label}: R_{Ed,min} = ${fmtN(Math.round(up * 10) / 10)} kN – wymagane zakotwienie belki (łącznik)`, ref: '6.1.5', sup: k, ratio: NaN, status: 'warn', Ed: up, unit: 'kN' })); }
    }
    if (p.notch && p.notch.on) {
      const n = p.notch, hef = n.hef > 0 ? Math.min(n.hef, h) : h, al = hef / h, x = n.x !== '' ? n.x : 0, ii = n.i !== '' ? n.i : 0;
      let kv = 1, kvf = null;
      if (n.side === 'bot' && al < 1) {
        kvf = mt.F.kn * (1 + 1.1 * Math.pow(ii, 1.5) / Math.sqrt(h)) / (Math.sqrt(h) * (Math.sqrt(al * (1 - al)) + 0.8 * x / h * Math.sqrt(1 / al - al * al)));
        kv = Math.min(1, kvf);
      }
      const nodeI = st.supNode[k];
      const stIdx = []; if (nodeI > 0) stIdx.push(2 * (nodeI - 1) + 1); if (nodeI < st.nn - 1) stIdx.push(2 * nodeI);
      let best = null;
      ulsAll.forEach(c => {
        const V = Math.max(...stIdx.map(i => Math.max(Math.abs(c.env.Vy.mx[i]), Math.abs(c.env.Vy.mn[i]))));
        const tau = 1.5 * V * 1e3 / (mt.kcr * sec.b * hef), fv = c.kmod * mt.m.fvk / c.gM, r = tau / (kv * fv);
        if (!best || r > best.ratio) best = { ratio: r, V, tau, fv, c };
      });
      o.notch = Object.assign({ hef, al, x, i: ii, kv, kvf, side: n.side }, best);
      C.push(mkCheck({ id: `notch${k}`, grp: 'SGN – docisk i podcięcia', name: `Belka podcięta ${n.side === 'bot' ? 'od strony podpory' : 'od strony przeciwnej'} w podporze ${p.label} τ_{d} ≤ k_{v}·f_{v,d}`, ref: '6.5.2', sup: k, ratio: best.ratio, Ed: best.tau, Rd: kv * best.fv, unit: 'MPa', d: o.notch, combo: `${best.c.eq}, k_mod = ${fmtN(best.c.kmod)}`, note: `h_ef = ${Math.round(hef)} mm, α = ${fmtN(Math.round(al * 1000) / 1000)}, k_v = ${fmtN(Math.round(kv * 1000) / 1000)}` }));
    }
    return o;
  });
  // docisk pod siłami skupionymi z podaną długością docisku
  R.ptBear = [];
  st.items.forEach(o => {
    if (o.sw) return;
    o.parts.forEach(pp => pp.pts.forEach(q => {
      if (!(q.lb > 0) || !(q.P * o.ptc[1] > 0)) return;
      const seg = segAt(md, q.x), sec = seg.sec;
      const gam = o.cls === 'G' ? S.loads.gG : o.cls === 'Q' ? S.loads.gQ : 1, kmod = mt.kmod[o.dur] || mt.kmod.I, gM = o.cls === 'A' ? mt.gMA : mt.gM;
      const F = gam * q.P * o.ptc[1];
      const dEnd = Math.min(q.x, md.Ltot - q.x) * 1000 - q.lb / 2;
      const ext = Math.max(0, Math.min(30, dEnd)) + 30;
      const lef = q.lb + ext;
      const dSup = Math.min(...md.sups.map(p => Math.abs(p.x - q.x) * 1000 - p.t / 2 - q.lb / 2));
      const kc = dSup >= 2 * sec.h ? (mt.m.fam === 'C' ? 1.5 : (mt.m.fam === 'GLh' || mt.m.fam === 'GLc') && q.lb <= 400 ? 1.75 : 1.0) : 1.0;
      const s = F * 1e3 / (sec.b * lef), fd = kmod * mt.m.fc90k / gM, r = s / (kc * fd);
      const rec = { o, q, F, lef, kc, s, fd, kmod, gM, gam };
      R.ptBear.push(rec);
      C.push(mkCheck({ id: `ptb${o.key}_${Math.round(q.x * 1000)}`, grp: 'SGN – docisk i podcięcia', name: `Docisk pod siłą skupioną ${o.key} (x = ${fmtN(Math.round(q.x * 100) / 100)} m) σ_{c,90,d} ≤ k_{c,90}·f_{c,90,d}`, ref: '6.1.5', ratio: r, Ed: s, Rd: kc * fd, unit: 'MPa', d: rec, combo: `${fmtN(gam)}·${o.key}, k_mod = ${fmtN(kmod)}`, note: `l_ef = ${Math.round(lef)} mm` }));
    }));
  });
}

// SGU – ugięcia (7.2, 2.2.3) i drgania (7.3)
function slsChecks(R) {
  const { S, mt, md, st } = R, C = R.checks, Dl = R.defl;
  R.slsData = md.segs.map(seg => {
    const cant = seg.kind !== 'span', lim = cant ? S.sls.cant : S.sls.span, Lmm = seg.L * 1000;
    let wi = 0, wf = 0, wn = 0, xi = 0, xf = 0, xn = 0;
    const w0 = S.sls.camber;
    for (let i = 0; i < 2 * st.ne; i++) {
      if (st.stSeg[i] !== seg.i) continue;
      const x = st.stX[i];
      const a = Math.max(Math.abs(Dl.instMx[i]), Math.abs(Dl.instMn[i])) * 1000;
      const f = Math.max(Math.abs(Dl.finMx[i]), Math.abs(Dl.finMn[i])) * 1000;
      const c0 = !cant && w0 > 0 ? 4 * w0 * ((x - seg.x0) / seg.L) * (1 - (x - seg.x0) / seg.L) : 0;
      const n = Math.max(Math.abs(Dl.finMx[i] * 1000 - c0), Math.abs(Dl.finMn[i] * 1000 - c0));
      if (a > wi) { wi = a; xi = x; } if (f > wf) { wf = f; xf = x; } if (n > wn) { wn = n; xn = x; }
    }
    const o = { seg, cant, lim, Lmm, wi, wf, wn, xi, xf, xn, w0: cant ? 0 : w0 };
    const nm = md.segs.length > 1 ? ` – ${seg.label}` : '';
    const Ltxt = cant ? 'l_{w}' : 'L';
    [['inst', wi, 0, 'Ugięcie chwilowe w_{inst}'], ['netfin', wn, 1, 'Ugięcie końcowe netto w_{net,fin}'], ['fin', wf, 2, 'Ugięcie końcowe w_{fin}']].forEach(([k, w, j, nmT]) => {
      if (!S.sls.use[j] || !(lim[j] > 0)) return;
      const wl = Lmm / lim[j];
      C.push(mkCheck({ id: `w${k}${seg.i}`, grp: 'SGU – ugięcia', name: `${nmT} ≤ ${Ltxt}/${lim[j]}${nm}`, ref: '7.2', seg: seg.i, ratio: w / wl, Ed: w, Rd: wl, unit: 'mm', fmt: 1, d: o }));
    });
    return o;
  });
  // drgania stropu (7.3.3) – tylko belka jednoprzęsłowa
  const V = S.sls.vib;
  if (V.on) {
    if (S.scheme !== 'ss') { C.push(mkCheck({ id: 'vibna', grp: 'SGU – drgania', name: 'Drgania stropu (7.3.3) – procedura dotyczy stropów jednoprzęsłowych; dla tego schematu nie wykonano', ref: '7.3.3', ratio: NaN, status: 'info' })); return; }
    const seg = md.segs[0], sec = seg.sec, Lm = seg.L;
    const EIl = mt.E0m * sec.Iy * 1e-6 / V.s;                    // N·m²/m
    let gperm = 0; st.items.forEach(o => { if (o.cls !== 'G') return; o.parts.forEach(p => p.dist.forEach(d => { gperm += (d.q1 + d.q2) / 2 * o.comp[1] * (Math.min(d.x2, seg.x1) - Math.max(d.x1, seg.x0)); })); });
    let gq = 0; if (V.mQ) st.items.forEach(o => { if (o.cls !== 'Q') return; o.parts.forEach(p => p.dist.forEach(d => { gq += o.psi.p2 * (d.q1 + d.q2) / 2 * o.comp[1] * (Math.min(d.x2, seg.x1) - Math.max(d.x1, seg.x0)); })); });
    const gl = (gperm + gq) / Lm;                                  // kN/m na belkę
    const m = gl / V.s * 1000 / 9.81;                              // kg/m²
    const f1 = Math.PI / (2 * Lm * Lm) * Math.sqrt(EIl / Math.max(m, 1e-6));
    const EI = mt.E0m * sec.Iy, GAk = KAPPA * mt.Gm * sec.A;
    const wF = V.kdist * (1000 * Math.pow(Lm * 1000, 3) / (48 * EI) + (S.sls.shear ? 1000 * Lm * 1000 / (4 * GAk) : 0));     // mm/kN
    const EIb = V.EIb !== '' && V.EIb > 0 ? V.EIb * 1000 : 3100;   // N·m²/m (domyślnie płyta OSB 22 mm)
    const n40 = Math.pow(Math.max(0, ((40 / f1) ** 2 - 1) * Math.pow(V.B / Lm, 4) * EIl / EIb), 0.25);
    const v = 4 * (0.4 + 0.6 * n40) / (m * V.B * Lm + 200);
    const vlim = Math.pow(V.b, f1 * V.zeta - 1);
    R.vib = { f1, m, EIl, wF, n40, v, vlim, EIb, gl, B: V.B, s: V.s, L: Lm, zeta: V.zeta, a: V.a, b: V.b, kdist: V.kdist };
    C.push(mkCheck({ id: 'vibf', grp: 'SGU – drgania', name: 'Częstotliwość drgań własnych stropu f_{1} > 8 Hz', ref: '7.3.3', ratio: 8 / f1, Ed: f1, Rd: 8, unit: 'Hz', fmt: 2, cond: `${fmtN(Math.round(f1 * 100) / 100)} > 8 Hz`, d: R.vib }));
    C.push(mkCheck({ id: 'viba', grp: 'SGU – drgania', name: 'Ugięcie od siły 1 kN w/F ≤ a', ref: '7.3.3', ratio: wF / V.a, Ed: wF, Rd: V.a, unit: 'mm/kN', fmt: 2, d: R.vib }));
    C.push(mkCheck({ id: 'vibv', grp: 'SGU – drgania', name: 'Prędkość od impulsu jednostkowego v ≤ b^{(f₁ζ−1)}', ref: '7.3.3', ratio: v / vlim, Ed: v, Rd: vlim, unit: 'm/(Ns²)', fmt: 4, d: R.vib }));
  }
}

// odporność ogniowa – metoda zredukowanego przekroju (PN-EN 1995-1-2, 4.2.2)
function fireChecks(R) {
  const { S, mt, md, st, cb } = R, C = R.checks;
  const ch = charDepth(S, mt), F = S.fire, kfi = mt.kfi, km = mt.km;
  R.fireData = { ch, segs: [] };
  md.segs.forEach(seg => {
    const s0 = seg.sec, bfi = s0.b - 2 * ch.def, hfi = s0.h - (F.sides === 4 ? 2 : 1) * ch.def;
    const nm = md.segs.length > 1 ? ` – ${seg.label}` : '';
    const rec = { seg, bfi, hfi };
    R.fireData.segs.push(rec);
    if (!(bfi > 5 && hfi > 5)) { C.push(mkCheck({ id: `fir${seg.i}`, grp: `Pożar – R ${F.R}`, name: `Przekrój zwęglony całkowicie (d_ef = ${fmtN(Math.round(ch.def * 10) / 10)} mm)${nm}`, ref: '4.2.2', seg: seg.i, ratio: 9.99, Ed: ch.def, Rd: 0, unit: 'mm' })); return; }
    const sec = secProps(bfi, hfi, 1); rec.sec = sec;
    const f = { my: kfi * mt.m.fmk, mz: kfi * (mt.F.kind === 'lvl' && mt.m.fmflat ? mt.m.fmflat : mt.m.fmk), v: kfi * mt.m.fvk, c0: kfi * mt.m.fc0k, t0: kfi * mt.m.ft0k };
    rec.f = f;
    const mtFi = Object.assign({}, mt, { E005: kfi * mt.E005, G05: kfi * mt.G05 });
    const segFi = Object.assign({}, seg, { sec });
    const ltb = ltbOf(S, mtFi, md, st, segFi), buck = bucklOf(S, mtFi, segFi);
    rec.ltb = ltb; rec.buck = buck;
    const G = {}; const upd = (k, r, d) => { if (!G[k] || r > G[k].ratio) G[k] = Object.assign({ ratio: r }, d); };
    cb.fire.forEach(c => {
      const E = c.env;
      for (let i = 0; i < 2 * st.ne; i++) {
        if (st.stSeg[i] !== seg.i) continue;
        const My = Math.max(Math.abs(E.My.mx[i]), Math.abs(E.My.mn[i])), Mz = Math.max(Math.abs(E.Mz.mx[i]), Math.abs(E.Mz.mn[i]));
        const Nc = Math.max(0, E.N.mx[i]), Nt = Math.max(0, -E.N.mn[i]);
        const smy = My * 1e6 / sec.Wy, smz = Mz * 1e6 / sec.Wz, sc = Nc * 1e3 / sec.A, stt = Nt * 1e3 / sec.A;
        let bm = Math.max(smy / f.my + km * smz / f.mz, km * smy / f.my + smz / f.mz);
        if (Nt > 1e-9) bm += stt / f.t0;
        if (Nc > 1e-9) bm = Math.max(bm + (sc / f.c0) ** 2, sc / (buck.y.kc * f.c0) + smy / f.my + km * smz / f.mz, sc / (buck.z.kc * f.c0) + km * smy / f.my + smz / f.mz);
        const base = { i, x: st.stX[i], c, My, Mz, smy, smz, Nc, sc };
        upd('bend', bm, base);
        const Vy = Math.max(Math.abs(E.Vy.mx[i]), Math.abs(E.Vy.mn[i])), ty = 1.5 * Vy * 1e3 / (mt.kcr * sec.b * sec.h);
        upd('shear', ty / f.v, Object.assign({ Vy, ty }, base));
        [['plus', Math.max(0, E.My.mx[i])], ['minus', Math.max(0, -E.My.mn[i])]].forEach(([zk, M]) => {
          const z = ltb[zk]; if (!(M > 1e-9) || z.kcrit >= 1) return;
          const sm = M * 1e6 / sec.Wy; let r = sm / (z.kcrit * f.my); if (Nc > 1e-9) r = r * r + sc / (buck.z.kc * f.c0); if (smz > 1e-9) r += smz / f.mz;
          upd('ltb', r, Object.assign({ sm, z, zk }, base));
        });
      }
    });
    rec.G = G;
    const grp = `Pożar – R ${F.R}`;
    if (G.bend) C.push(mkCheck({ id: `fib${seg.i}`, grp, name: `Zginanie${hasAx(R) ? ' z siłą osiową' : ''} – przekrój zredukowany ${Math.round(bfi)}×${Math.round(hfi)} mm${nm}`, ref: '4.2.2', seg: seg.i, ratio: G.bend.ratio, Ed: G.bend.smy, Rd: f.my, unit: 'MPa', d: Object.assign({ rec }, G.bend), combo: `6.11b (pożar), ψ${S.fire.psi === 'psi1' ? '₁' : '₂'}` }));
    if (G.shear) C.push(mkCheck({ id: `fis${seg.i}`, grp, name: `Ścinanie – przekrój zredukowany${nm}`, ref: '4.2.2', seg: seg.i, ratio: G.shear.ratio, Ed: G.shear.ty, Rd: f.v, unit: 'MPa', d: Object.assign({ rec }, G.shear), combo: '6.11b (pożar)' }));
    if (G.ltb) C.push(mkCheck({ id: `fil${seg.i}`, grp, name: `Zwichrzenie – przekrój zredukowany${nm}`, ref: '4.2.2', seg: seg.i, ratio: G.ltb.ratio, Ed: G.ltb.ratio, Rd: 1, d: Object.assign({ rec }, G.ltb), combo: '6.11b (pożar)', note: `k_crit,fi = ${fmtN(Math.round(G.ltb.z.kcrit * 1000) / 1000)}` }));
  });
}
const hasAx = R => R.st.need.x || R.st.items.some(o => o.it.N);
function infoChecks(R) {
  const { S, mt, md } = R, C = R.checks;
  const cat = catOf(mt.m.fam);
  if (cat && md.Lmember > cat.Lmax + 1e-6) C.push(mkCheck({ id: 'len', grp: 'Konstrukcja i wykonanie', name: `Długość elementu ${fmtN(Math.round(md.Lmember * 100) / 100)} m > typowa długość handlowa ${fmtN(cat.Lmax)} m (${cat.desc}) – przewidź łączenie (styk) albo element na zamówienie`, ref: '', ratio: NaN, status: 'warn' }));
  md.segs.forEach(s => {
    const hb = s.sec.h / s.sec.b;
    if (hb > 4 && S.ltb.top === '' && S.ltb.on && s.kind === 'span') C.push(mkCheck({ id: `hb${s.i}`, grp: 'Konstrukcja i wykonanie', name: `Przekrój wysoki h/b = ${fmtN(Math.round(hb * 10) / 10)} bez stężeń bocznych${md.segs.length > 1 ? ' – ' + s.label : ''} – zalecane stężenie krawędzi ściskanej (zwichrzenie, 6.3.3)`, ref: '6.3.3', ratio: NaN, status: 'info' }));
  });
  if (S.geom.n > 1) C.push(mkCheck({ id: 'nply', grp: 'Konstrukcja i wykonanie', name: `Przekrój złożony z ${S.geom.n} elementów ${Math.round(S.geom.b)}×${Math.round(S.geom.h)} mm – przyjęto współpracę jak przekroju litego; wymagane połączenie elementów (gwoździe, śruby, wkręty) zapewniające współpracę`, ref: '6.6', ratio: NaN, status: 'info' }));
}

/* ------------------------------------------- słup drewniany i połączenie z fundamentem */
// nośność łącznika trzpieniowego (sworzeń / śruba) w połączeniu stal–drewno, na jedną płaszczyznę ścinania (8.2.3)
// alpha – kąt siły do włókien [°]; zwraca { Fv, modes, fh, My, Fax, t }
function colFastener(c, m, alpha, bTot) {
  const d = c.d, fu = FAST_STEEL[c.grade].fu, rho = m.rhok, a = alpha * Math.PI / 180;
  const fh0 = 0.082 * (1 - 0.01 * d) * rho;                                                     // (8.32)
  const k90 = m.fam === 'LVL' ? 1.30 + 0.015 * d : m.fam === 'D' ? 0.90 + 0.015 * d : 1.35 + 0.015 * d;   // (8.33)
  const fh = fh0 / (k90 * Math.sin(a) ** 2 + Math.cos(a) ** 2);
  const My = 0.3 * fu * Math.pow(d, 2.6);                                                       // (8.30) [Nmm]
  // efekt liny: sworznie – 0; śruby – nośność podkładki 3·f_c,90,k·A_w (Ø_w = 3d) lub nośność śruby na rozciąganie
  let Fax = 0;
  if (c.fast === 'bolt') { const Aw = Math.PI / 4 * ((3 * d) ** 2 - (d + 1) ** 2), As = 0.78 * Math.PI * d * d / 4; Fax = Math.min(3 * m.fc90k * Aw, 0.9 * fu * As); }
  const lim = (j, ax) => j + Math.min(ax / 4, c.fast === 'bolt' ? 0.25 * j : 0);              // 8.2.2(2): efekt liny ≤ 25% części Johansena
  let modes, t;
  if (c.type === 'slot') {
    // blacha wpuszczana (element środkowy), dwie płaszczyzny ścinania (8.11)
    t = Math.max(1, (bTot - c.ts - 2) / 2);
    const f = fh * t * d, g0 = fh * t * d * (Math.sqrt(2 + 4 * My / (fh * d * t * t)) - 1), h0 = 2.3 * Math.sqrt(My * fh * d);
    modes = { f, g: lim(g0, Fax), h: lim(h0, Fax) };
  } else {
    // dwie blachy zewnętrzne, drewno w środku (8.12 – blachy cienkie, 8.13 – grube; interpolacja dla 0,5d < t_s < d)
    t = bTot;
    const j = 0.5 * fh * t * d, k0 = 1.15 * Math.sqrt(2 * My * fh * d), m0 = 2.3 * Math.sqrt(My * fh * d);
    const thin = Math.min(j, lim(k0, Fax)), thick = Math.min(j, lim(m0, Fax));
    const r = clamp((c.ts - 0.5 * d) / (0.5 * d), 0, 1);
    modes = { j, k: lim(k0, Fax), m: lim(m0, Fax), thinThick: r };
    modes.mix = thin + (thick - thin) * r;
  }
  const Fv = c.type === 'slot' ? Math.min(modes.f, modes.g, modes.h) : modes.mix;
  return { Fv, modes, fh, fh0, k90, My, Fax, t, d, fu };
}
function colChecks(R) {
  const { S, md, cb, mt } = R, C = R.checks;
  const ulsAll = cb.uls.concat(cb.acc);
  R.colData = [];
  md.sups.forEach((p, k) => {
    const c = (S.supCfg[k] && S.supCfg[k].col) || null;
    if (!c || !c.on) return;
    const m = c.cls === 'U' || !c.cls ? mt.m : MATS[c.cls] || mt.m, F = FAM[m.fam] || FAM.C;
    const gMt = S.coef.gM !== '' && S.coef.gM > 0 ? S.coef.gM : F.gM, gMc = 1.3;
    const sec = secProps(c.b, c.h, 1);
    // smukłość: płaszczyzna y – wymiar h (moment od mimośrodu), płaszczyzna z – wymiar b
    const E005 = m.E005 * 1000, bc = F.betaC;
    const buck = (lc, i) => { const lam = lc / i, lr = lam / Math.PI * Math.sqrt(m.fc0k / E005), kk = 0.5 * (1 + bc * (lr - 0.3) + lr * lr); return { lc, lam, lr, k: kk, kc: lr <= 0.3 ? 1 : 1 / (kk + Math.sqrt(kk * kk - lr * lr)) }; };
    const by = buck(c.ky * c.L * 1000, sec.h / Math.sqrt(12)), bz = buck(c.kz * c.L * 1000, sec.b / Math.sqrt(12));
    const gam = Math.round(m.rhom / 10) / 10, Gcol = gam * sec.A * 1e-6 * c.L;                   // ciężar słupa [kN]
    const khy = khOf(m.fam, m, sec.h);
    const fst = FAST_STEEL[c.grade], pl = PLATE_STEEL[c.steel];
    const F0 = colFastener(c, m, 0, c.b), F90 = colFastener(c, m, 90, c.b);
    const nsp = 2, nef0 = Math.min(c.n, Math.pow(c.n, 0.9) * Math.pow(c.a1 / (13 * c.d), 0.25));   // (8.34)
    const nTot = c.n * c.m;
    const Anet = c.type === 'slot' ? sec.A - (c.ts + 2) * c.h : sec.A;
    const fck = CONC_FCK[c.conc], fcd = fck / 1.4, fjd = 2 / 3 * fcd;                              // EN 1993-1-8 6.2.5 (β_j = 2/3, k_j = 1)
    const d0 = c.fast === 'bolt' ? c.d + 1 : c.d;
    const alphaB = Math.min(c.e1p / (3 * d0), fst.fu / pl.fu, 1), Fb1 = 2.5 * alphaB * pl.fu * c.d * c.ts / 1.25;   // EN 1993-1-8 tab. 3.4 [N] na blachę
    const nPl = c.type === 'slot' ? 1 : 2;
    // ścinanie blokowe (zał. A) przy wyrywaniu: dla każdej z dwóch warstw drewna (blacha wpuszczana) lub całego przekroju
    const Lt = Math.max(0, (c.m - 1) * (c.a2 - c.d)), Lv = 2 * Math.max(0, (c.n - 1) * (c.a1 - c.d) + c.a3 - c.d / 2);
    const o = { k, p, c, m, F, sec, by, bz, Gcol, gam, khy, F0, F90, nef0, nTot, Anet, fck, fcd, fjd, alphaB, Fb1, nPl, gMt, gMc, Lt, Lv, worst: {} };
    const W = sec.b * sec.h * sec.h / 6;
    const upd = (key, r, d) => { if (!o.worst[key] || r > o.worst[key].ratio) o.worst[key] = Object.assign({ ratio: r }, d); };
    ulsAll.forEach(cmb => {
      const rr = cmb.reac[k];
      const Rmx = Math.max(0, rr.mx), Rmn = rr.mn;
      const Nc = Rmx + cmb.gs * Gcol, Ntop = Rmx, Nt = Math.max(0, -Rmn - cmb.gi * Gcol);
      let H = c.Hadd;
      if (c.Hreac) { const hx = combReac(R.st, cmb, k, 'Rx'), hz = combReac(R.st, cmb, k, 'Rz'); H += Math.hypot(Math.max(Math.abs(hx.mx), Math.abs(hx.mn)), Math.max(Math.abs(hz.mx), Math.abs(hz.mn))); }
      const kmod = cmb.kmod, gM = cmb.type === 'ACC' ? cmb.gM : gMt, gMconn = cmb.type === 'ACC' ? cmb.gM : gMc;
      const fc0d = kmod * m.fc0k / gM, fmd = kmod * m.fmk * khy * mt.ksys / gM;
      // słup: ściskanie z wyboczeniem i mimośrodem (6.23, 6.24)
      const sc = Nc * 1e3 / sec.A, M = Ntop * c.e / 1000, sm = M * 1e6 / W;
      const r1 = sc / (by.kc * fc0d) + sm / fmd, r2 = sc / (bz.kc * fc0d) + mt.km * sm / fmd;
      upd('buck', Math.max(r1, r2), { cmb, Nc, Ntop, M, sc, sm, fc0d, fmd, r1, r2, kmod, gM });
      // docisk czoła słupa na blachę podstawy (6.1.4)
      const sce = Nc * 1e3 / Anet; upd('end', sce / fc0d, { cmb, Nc, sce, fc0d, kmod, gM });
      // łączniki: wyrywanie (wzdłuż włókien) i siła pozioma (w poprzek włókien)
      const RN = kmod * F0.Fv / gMconn * nsp * nef0 * c.m / 1e3, RH = kmod * F90.Fv / gMconn * nsp * nTot / 1e3;
      const rc = (Nt > 0 ? (Nt / RN) ** 2 : 0) + (H > 0 ? (H / RH) ** 2 : 0);
      upd('conn', rc, { cmb, Nt, H, RN, RH, kmod, gMconn });
      // ścinanie blokowe (zał. A) – tylko przy wyrywaniu
      if (Nt > 0) {
        const t1 = F0.t, mo = F0.modes, tef = c.type === 'slot' ? (mo.f <= Math.min(mo.g, mo.h) ? t1 : mo.g <= mo.h ? t1 * (Math.sqrt(2 + 4 * F0.My / (F0.fh * c.d * t1 * t1)) - 1) : 2 * Math.sqrt(F0.My / (F0.fh * c.d))) : 0.4 * t1;
        const nLay = c.type === 'slot' ? 2 : 1, Anet_t = Lt * t1, Anet_v = c.type === 'slot' && mo.f <= Math.min(mo.g, mo.h) ? Lv * t1 : Lv / 2 * (Lt + 2 * tef);
        const Fbs = nLay * Math.max(1.5 * Anet_t * m.ft0k, 0.7 * Anet_v * m.fvk) * kmod / gMconn / 1e3;
        upd('block', Nt / Fbs, { cmb, Nt, Fbs, Anet_t, Anet_v, tef, kmod, gMconn });
      }
      // docisk łącznika na blachę (EN 1993-1-8, tab. 3.4)
      const F1 = Math.hypot(Nt, H) / nTot / nPl;
      upd('pbear', F1 / (Fb1 / 1e3), { cmb, F1 });
      // fundament: docisk betonu pod blachą podstawy i kotwy
      upd('conc', Nc * 1e3 / (c.pa * c.pb) / fjd, { cmb, Nc, s: Nc * 1e3 / (c.pa * c.pb) });
      const bN = c.NRd > 0 ? Nt / (c.na * c.NRd) : (Nt > 0 ? 9.99 : 0), bV = c.VRd > 0 ? H / (c.na * c.VRd) : (H > 0 ? 9.99 : 0);
      upd('anch', Math.pow(bN, 1.5) + Math.pow(bV, 1.5), { cmb, Nt, H, bN, bV });
    });
    // odstępy łączników (tab. 8.5 śruby, 8.6 sworznie); α = 0° (wyrywanie) i 90° (siła pozioma)
    const dd = c.d, bolt = c.fast === 'bolt', hasH = Object.values(o.worst).some(w => w.H > 0) || c.Hadd > 0;
    const req = {
      a1: Math.max(bolt ? 5 * dd : 5 * dd, hasH ? (bolt ? 4 : 3) * dd : 0),
      a2: bolt ? 4 * dd : 3 * dd,
      a3: Math.max(7 * dd, 80),
      a4: hasH ? Math.max(4 * dd, 3 * dd) : 3 * dd,
    };
    const act = { a1: c.n > 1 ? c.a1 : Infinity, a2: c.m > 1 ? c.a2 : Infinity, a3: c.a3, a4: c.a4 };
    const fit = (c.m - 1) * c.a2 + 2 * c.a4 <= c.h + 1e-6;
    o.req = req; o.act = act; o.fit = fit;
    const spR = Math.max(...Object.keys(req).map(q => req[q] / act[q]), fit ? 0 : 1.01 * ((c.m - 1) * c.a2 + 2 * c.a4) / c.h);
    R.colData.push(o);
    const nm = `słup pod podporą ${p.label} (${Math.round(c.b)}×${Math.round(c.h)}, ${m.id || m.name})`;
    const grp = `Słup i stopa – podpora ${p.label}`;
    const cm = w => w && w.cmb ? `${w.cmb.eq}, k_mod = ${fmtN(w.cmb.kmod)}` : '';
    const W0 = o.worst;
    if (W0.buck) C.push(mkCheck({ id: `colbk${k}`, grp, name: `Słup – ściskanie z wyboczeniem${c.e ? ' i mimośrodem' : ''} (6.23), (6.24) – ${nm}`, ref: '6.3.2', sup: k, col: k, ratio: W0.buck.ratio, Ed: W0.buck.ratio, Rd: 1, d: o, combo: cm(W0.buck), note: `N_Ed = ${fmtN(Math.round(W0.buck.Nc * 10) / 10)} kN, k_c,y = ${fmtN(Math.round(by.kc * 1000) / 1000)}, k_c,z = ${fmtN(Math.round(bz.kc * 1000) / 1000)}` }));
    if (W0.end) C.push(mkCheck({ id: `colend${k}`, grp, name: `Słup – docisk czoła do blachy podstawy σ_{c,0,d} ≤ f_{c,0,d}`, ref: '6.1.4', sup: k, col: k, ratio: W0.end.ratio, Ed: W0.end.sce, Rd: W0.end.fc0d, unit: 'MPa', d: o, combo: cm(W0.end) }));
    if (W0.conn) C.push(mkCheck({ id: `colcn${k}`, grp, name: `Stopa – łączniki ${bolt ? 'śruby' : 'sworznie'} ${c.n * c.m}×⌀${c.d}: wyrywanie i siła pozioma (F_t/R_t)² + (F_v/R_v)² ≤ 1`, ref: '8.2.3', sup: k, col: k, ratio: W0.conn.ratio, Ed: W0.conn.ratio, Rd: 1, d: o, combo: cm(W0.conn), note: `N_t = ${fmtN(Math.round(W0.conn.Nt * 10) / 10)} kN, H = ${fmtN(Math.round(W0.conn.H * 10) / 10)} kN` }));
    if (W0.block) C.push(mkCheck({ id: `colbs${k}`, grp, name: 'Stopa – ścinanie blokowe drewna przy wyrywaniu (zał. A)', ref: 'A.1', sup: k, col: k, ratio: W0.block.ratio, Ed: W0.block.Nt, Rd: W0.block.Fbs, unit: 'kN', d: o, combo: cm(W0.block) }));
    C.push(mkCheck({ id: `colsp${k}`, grp, name: `Stopa – rozstaw łączników (tab. ${bolt ? '8.5' : '8.6'}): a₁ ≥ ${Math.round(req.a1)}, a₂ ≥ ${Math.round(req.a2)}, a₃,t ≥ ${Math.round(req.a3)}, a₄ ≥ ${Math.round(req.a4)} mm${fit ? '' : '; łączniki nie mieszczą się w przekroju'}`, ref: '8.6', sup: k, col: k, ratio: spR, Ed: spR, Rd: 1, d: o }));
    if (W0.pbear) C.push(mkCheck({ id: `colpb${k}`, grp, name: `Stopa – docisk łącznika do blachy t = ${c.ts} mm (EN 1993-1-8, tab. 3.4)`, ref: 'EN 1993-1-8', sup: k, col: k, ratio: W0.pbear.ratio, Ed: W0.pbear.F1, Rd: Fb1 / 1e3, unit: 'kN', d: o, combo: cm(W0.pbear) }));
    if (W0.conc) C.push(mkCheck({ id: `colcc${k}`, grp, name: `Fundament – docisk betonu ${c.conc} pod blachą ${Math.round(c.pa)}×${Math.round(c.pb)} mm σ ≤ f_{jd}`, ref: 'EN 1993-1-8', sup: k, col: k, ratio: W0.conc.ratio, Ed: W0.conc.s, Rd: fjd, unit: 'MPa', d: o, combo: cm(W0.conc) }));
    if (W0.anch) C.push(mkCheck({ id: `colan${k}`, grp, name: `Fundament – kotwy ${c.na} szt.: (N_{Ed}/N_{Rd})^{1,5} + (V_{Ed}/V_{Rd})^{1,5} ≤ 1`, ref: 'EN 1992-4', sup: k, col: k, ratio: W0.anch.ratio, Ed: W0.anch.ratio, Rd: 1, d: o, combo: cm(W0.anch), note: 'N_Rd, V_Rd kotwy – z ETA producenta' }));
    if (c.gap < 20 || S.env.sc === 3) C.push(mkCheck({ id: `colgp${k}`, grp, name: `Trwałość – odstęp czoła słupa od betonu ${Math.round(c.gap)} mm${c.gap < 20 ? ' < 20 mm' : ''}: zalecana szczelina ≥ 20–30 mm, a na zewnątrz (klasa użytk. 3) słup ≥ 150 mm nad terenem, zabezpieczenie przed wodą`, ref: '', sup: k, col: k, ratio: NaN, status: 'warn' }));
  });
}

/* ------------------------------------------------------- dobór automatyczny */
const realChecks = R => (R && R.checks ? R.checks : []).filter(c => c.status !== 'info' && c.status !== 'warn' && isFinite(c.ratio));
function passes(R, eta) { return R && !R.errors.length && realChecks(R).every(c => c.ratio <= eta + 1e-9); }
function govRatio(R) { const r = realChecks(R); return r.length ? Math.max(...r.map(c => c.ratio)) : 0; }
// lista kandydatów b×h z katalogu rodziny materiału
function candidates(S, opts) {
  const m = matOf(S), cat = catOf(m.fam), hbMax = S.design.hbMax !== '' && S.design.hbMax > 0 ? S.design.hbMax : cat.hbMax;
  const bs = opts && opts.fixB ? [S.geom.b] : cat.b, out = [];
  bs.forEach(b => cat.h.forEach(h => { if (h >= b * 0.9 && h / b <= hbMax + 1e-9) out.push({ b, h, A: b * h }); }));
  out.sort((p, q) => p.A - q.A || q.h - p.h);
  return out;
}
// dobór przekroju b×h (najmniejsze pole spełniające wszystkie warunki przy wytężeniu ≤ η)
function designSection(S0, opts) {
  opts = opts || {};
  const S = normalize(S0), eta = (opts.eta || S.design.eta) / 100;
  const cands = candidates(S, { fixB: opts.fixB !== undefined ? opts.fixB : S.design.fixB });
  const S1 = JSON.parse(JSON.stringify(S)); S1.segGeo = {};
  // filtr wstępny z rozwiązania dla obecnego przekroju: nośność na zginanie ~ W, ugięcie ~ I, ścinanie ~ A, docisk ~ b
  const R0 = calc(S1), need = { W: 0, I: 0, A: 0, b: 0 };
  if (!R0.errors.length) {
    const s0 = R0.md.segs[0].sec, k = 0.8 / eta;
    realChecks(R0).forEach(c => {
      const r = c.ratio * k;
      if (/^bend/.test(c.id)) need.W = Math.max(need.W, r * s0.Wy);
      else if (/^w(inst|netfin|fin)/.test(c.id)) need.I = Math.max(need.I, r * s0.Iy);
      else if (/^shear\d/.test(c.id)) need.A = Math.max(need.A, r * s0.A);
      else if (/^bear/.test(c.id)) need.b = Math.max(need.b, r * s0.b);
    });
  }
  const nn = S.geom.n;
  let tried = 0, best = null;
  for (const c of cands) {
    const bt = c.b * nn;
    if (bt * c.h * c.h / 6 < need.W || bt * c.h ** 3 / 12 < need.I || bt * c.h < need.A || bt < need.b) continue;
    const S2 = JSON.parse(JSON.stringify(S1)); S2.geom.b = c.b; S2.geom.h = c.h;
    const R = calc(S2); tried++;
    if (passes(R, eta)) { best = { b: c.b, h: c.h, R, eta: govRatio(R) }; break; }
    if (tried > 300) break;
  }
  return best ? Object.assign({ ok: true, tried }, best) : { ok: false, tried };
}
// dobór klasy materiału (ta sama rodzina) dla obecnego przekroju – od najsłabszej
function designClass(S0, opts) {
  opts = opts || {};
  const S = normalize(S0), eta = (opts.eta || S.design.eta) / 100, m = matOf(S);
  if (m.fam === 'U') return { ok: false, why: 'Materiał własny – dobór klasy niedostępny.' };
  const list = MAT_LIST.filter(q => q.fam === m.fam).sort((p, q) => p.fmk - q.fmk);
  for (const q of list) {
    const S2 = JSON.parse(JSON.stringify(S)); S2.mat.cls = q.id; S2.mat.user = null;
    const R = calc(S2);
    if (passes(R, eta)) return { ok: true, cls: q.id, R, eta: govRatio(R) };
  }
  return { ok: false, why: 'Żadna klasa tej rodziny nie spełnia warunków przy obecnym przekroju.' };
}
// klasy handlowe i względny koszt jednostki objętości (heurystyka doboru „wszystko”)
const TRADE = {
  C: [['C24', 1.0], ['C30', 1.12]], D: [['D30', 1.0], ['D40', 1.15]],
  GLh: [['GL24h', 1.0], ['GL28h', 1.06], ['GL30h', 1.10], ['GL32h', 1.16]], GLc: [['GL24c', 1.0], ['GL28c', 1.06], ['GL30c', 1.10], ['GL32c', 1.16]],
  LVL: [['LVL-S', 1.0], ['LVL-Q', 1.1]],
};
// dobór przekroju i klasy: dla każdej klasy handlowej najmniejszy przekrój; wybór – najmniejszy koszt (pole × współczynnik ceny klasy)
function designAll(S0, opts) {
  opts = opts || {};
  const S = normalize(S0), m = matOf(S);
  if (m.fam === 'U' || S.mat.lock) { const r = designSection(S, opts); return Object.assign(r, { cls: S.mat.cls, list: [] }); }
  const list = TRADE[m.fam] || [[S.mat.cls, 1]];
  let best = null; const all = [];
  for (const [cls, k] of list) {
    const S2 = JSON.parse(JSON.stringify(S)); S2.mat.cls = cls; S2.mat.user = null;
    const r = designSection(S2, opts);
    if (r.ok) { const cost = r.b * r.h * k; all.push({ cls, b: r.b, h: r.h, cost, eta: r.eta }); if (!best || cost < best.cost - 1e-9) best = Object.assign({ cls, cost }, r); }
  }
  return best ? Object.assign(best, { list: all }) : { ok: false, list: all };
}

const API = {
  DUR, DUR_NAME, DUR_DESC, KMOD, KDEF, SC_DESC, FAM, FAM_ORDER, FAM_COMMON, MATS, MAT_LIST, CATALOG, catOf, PSI, SNOW_HIGH, IMP_EC1, IMP_DUR, KIND_DUR, VAR_KINDS,
  SCHEMES, SUP_DOF, SUP_NAME, DEFL_PRESETS, STL, KAPPA,
  num, clamp, optNum, defaultState, normalize, normItem, normPt, psiOf, durOf, durAuto, matOf, famOf, materials, khOf, secProps, strengthBase, torsionCoef,
  beamModel, segAt, itemRange, ptX, loadComp, ptComp, splitItem, statics, genCombos, combEnv, combReac, deflEnv, ltbOf, bucklOf, charDepth, calc,
  designSection, designClass, designAll, TRADE, FAST_STEEL, PLATE_STEEL, CONC_FCK, COL_DEF, normCol, colFastener, passes, govRatio, realChecks, candidates, bearingLen, kc90Of,
  makeBendSolver, bendRun, makeBarSolver, barRun,
};
root.EC5 = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
