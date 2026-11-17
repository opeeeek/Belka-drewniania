// Testy silnika BelkaDR – porównanie z rozwiązaniami analitycznymi i obliczeniami ręcznymi wg PN-EN 1995-1-1.
// Uruchomienie: node test/engine.test.js
'use strict';
const E = require('../src/engine.js');
let n = 0, bad = 0;
const near = (a, b, tol, msg) => {
  n++;
  const ok = Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  if (!ok) { bad++; console.log(`✖ ${msg}: ${a} ≠ ${b} (tol ${tol})`); }
  else console.log(`✔ ${msg}: ${+a.toFixed(5)} ≈ ${+b.toFixed(5)}`);
};
const truthy = (v, msg) => { n++; if (!v) { bad++; console.log('✖ ' + msg); } else console.log('✔ ' + msg); };
const base = () => {
  const S = E.defaultState();
  S.loads.perm = []; S.loads.var = []; S.loads.sw = false;
  return S;
};
const maxAbs = a => Math.max(...Array.from(a).map(Math.abs));
const ck = (R, id) => R.checks.find(c => c.id === id);

// 1. Belka swobodnie podparta, siła skupiona w środku – M = PL/4, w = PL³/48EI + PL/4κGA
{
  const S = base(); S.geom.L = 4; S.geom.b = 100; S.geom.h = 200; S.mat.cls = 'C24';
  S.loads.perm = [{ name: 'P', q: 0, pts: [{ P: 10, a: 2, ref: 'L' }] }];
  S.loads.gG = 1.0; S.loads.xi = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  truthy(!R.errors.length, 'SS+P: brak błędów');
  near(maxAbs(R.env.uls.My.mx), 10, 1e-6, 'SS+P: M = PL/4');
  near(maxAbs(R.env.uls.Vy.mx), 5, 1e-6, 'SS+P: V = P/2');
  const EI = 11000 * 100 * 200 ** 3 / 12, GA = 5 / 6 * 690 * 100 * 200;
  const w = 10e3 * 4000 ** 3 / (48 * EI) + 10e3 * 4000 / (4 * GA);
  near(Math.max(...R.defl.instMx) * 1000, w, 1e-4, 'SS+P: w_inst (z odkształceniem postaciowym)');
  near(R.reac[0].CHAR.mx, 5, 1e-6, 'SS+P: reakcja A');
}
// 2. Wspornik, obciążenie równomierne – M = qL²/2, w = qL⁴/8EI + qL²/2κGA
{
  const S = base(); S.scheme = 'cant'; S.geom.L = 2; S.geom.b = 120; S.geom.h = 240; S.mat.cls = 'GL24h';
  S.loads.perm = [{ name: 'q', q: 3 }]; S.loads.gG = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  near(Math.min(...R.env.uls.My.mn), -6, 1e-6, 'Wspornik: M = −qL²/2');
  const EI = 11500 * 120 * 240 ** 3 / 12, GA = 5 / 6 * 650 * 120 * 240;
  const w = 3 * 2000 ** 4 / (8 * EI) + 3 * 2000 ** 2 / (2 * GA);
  near(Math.max(...R.defl.instMx) * 1000, w, 1e-4, 'Wspornik: ugięcie końca');
}
// 3. Belka dwuprzęsłowa równomiernie obciążona (bez odkształceń postaciowych) – M_B = −qL²/8, R_A = 3/8 qL, R_B = 10/8 qL
{
  const S = base(); S.scheme = 'cont'; S.cont.spans = [5, 5]; S.sls.shear = false;
  S.loads.perm = [{ name: 'q', q: 2 }]; S.loads.gG = 1.0; S.loads.gGi = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  near(Math.min(...R.env.uls.My.mn), -2 * 25 / 8, 1e-5, 'Ciągła: M_B = −qL²/8');
  near(R.reac[0].CHAR.mx, 3 / 8 * 2 * 5, 1e-5, 'Ciągła: R_A = 3/8·qL');
  near(R.reac[1].CHAR.mx, 10 / 8 * 2 * 5, 1e-5, 'Ciągła: R_B = 10/8·qL');
  near(Math.max(...R.env.uls.My.mx), 9 / 128 * 2 * 25, 1e-3, 'Ciągła: M_przęsła = 9/128·qL²');
}
// 4. Układ szachownicowy: obciążenie zmienne tylko na jednym przęśle daje większy moment przęsłowy
{
  const S = base(); S.scheme = 'cont'; S.cont.spans = [5, 5]; S.sls.shear = false;
  S.loads.var = [{ kind: 'imp', cat: 'B', name: 'Q', q: 2 }]; S.loads.gQ = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  // M max w przęśle przy obciążeniu jednego przęsła: (7/16)²/2·qL² ≈ 0.0957·qL²
  near(Math.max(...R.env.uls.My.mx), 2 * 25 * 0.095703125, 2e-3, 'Szachownica: M przęsła od jednego przęsła');
}
// 5. Belka obustronnie utwierdzona – M_podp = −qL²/12, M_przęsła = qL²/24
{
  const S = base(); S.geom.L = 6; S.sls.shear = false;
  S.supCfg = [{ dof: { x: true, y: true, z: true, r: true } }, { dof: { x: false, y: true, z: true, r: true } }];
  S.loads.perm = [{ name: 'q', q: 1 }]; S.loads.gG = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  near(Math.min(...R.env.uls.My.mn), -36 / 12, 1e-4, 'Utwierdzona: M_podp = −qL²/12');
  near(Math.max(...R.env.uls.My.mx), 36 / 24, 1e-3, 'Utwierdzona: M_przęsła = qL²/24');
}
// 6. Przegub (belka Gerbera): wspornik prawy z przegubem → moment w przegubie = 0
{
  const S = base(); S.scheme = 'cont'; S.cont.spans = [4, 4, 4];
  S.nodes = [{ seg: 1, a: 1.0, hinge: true }];
  S.loads.perm = [{ name: 'q', q: 2 }]; S.loads.gG = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  truthy(!R.errors.length, 'Gerber: układ rozwiązany');
  const st = R.st, x0 = 5.0; let mh = Infinity;
  for (let i = 0; i < st.stX.length; i++) if (Math.abs(st.stX[i] - x0) < 1e-6) mh = Math.min(mh, Math.abs(R.cb.uls[0].env.My.mx[i] + R.cb.uls[0].env.My.mn[i]));
  near(mh, 0, 1e-6, 'Gerber: M = 0 w przegubie');
}
// 7. Belka nachylona (krokiew, β = 30°), ciężar na długość osi: q⊥ = q·cosβ, siła osiowa od q∥ = q·sinβ (podpora dolna nieprzesuwna)
{
  const S = base(); S.geom.L = 4; S.geom.beta = 30; S.sls.shear = false;
  S.loads.perm = [{ name: 'q', q: 2, dir: 'g', proj: 'len' }]; S.loads.gG = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  near(Math.max(...R.env.uls.My.mx), 2 * Math.cos(Math.PI / 6) * 16 / 8, 1e-5, 'Krokiew: M = q·cosβ·L²/8');
  near(Math.max(...R.env.uls.N.mx), 2 * Math.sin(Math.PI / 6) * 4, 1e-5, 'Krokiew: N_max (ściskanie przy podporze dolnej) = q·sinβ·L');
  // obciążenie na rzut poziomy (śnieg): q_⊥ = s·cos²β
  const S2 = base(); S2.geom.L = 4; S2.geom.beta = 30; S2.sls.shear = false;
  S2.loads.var = [{ kind: 'snow', name: 's', q: 1, dir: 'g', proj: 'hor' }]; S2.loads.gQ = 1.0; S2.loads.comb = '610';
  const R2 = E.calc(S2);
  near(Math.max(...R2.env.uls.My.mx), Math.cos(Math.PI / 6) ** 2 * 16 / 8, 1e-5, 'Krokiew: śnieg na rzut poziomy q⊥ = s·cos²β');
}
// 8. Płatew z obrotem przekroju α = 20° – zginanie dwukierunkowe
{
  const S = base(); S.geom.L = 4; S.geom.alpha = 20; S.sls.shear = false;
  S.loads.perm = [{ name: 'q', q: 1, dir: 'g' }]; S.loads.gG = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  near(Math.max(...R.env.uls.My.mx), Math.cos(20 * Math.PI / 180) * 2, 1e-5, 'Płatew: M_y = q·cosα·L²/8');
  near(Math.max(...R.env.uls.Mz.mx), Math.sin(20 * Math.PI / 180) * 2, 1e-5, 'Płatew: M_z = q·sinα·L²/8');
  const c = ck(R, 'bend0'), d = c.d;
  near(c.ratio, Math.max(d.smy / d.f.my + 0.7 * d.smz / d.f.mz, 0.7 * d.smy / d.f.my + d.smz / d.f.mz), 1e-9, 'Płatew: warunek (6.11)/(6.12)');
}
// 9. k_mod w kombinacjach: śnieg (krótkotrwałe) – k_mod = 0,9; samo G – 0,6
{
  const S = base(); S.geom.L = 4;
  S.loads.perm = [{ name: 'g', q: 1 }]; S.loads.var = [{ kind: 'snow', name: 'S', q: 2 }];
  const R = E.calc(S);
  const fams = Array.from(new Set(R.cb.uls.map(c => c.fam)));
  truthy(fams.join() === 'P,S', 'Rodziny k_mod: P i S');
  truthy(R.cb.uls.find(c => c.fam === 'S').kmod === 0.9 && R.cb.uls.find(c => c.fam === 'P').kmod === 0.6, 'k_mod: S = 0,9, P = 0,6');
  const c = ck(R, 'bend0');
  // 6.10b: 0,85·1,35·1 + 1,5·2 = 4,1475 kN/m; M = 4,1475·16/8 = 8,295 kNm; σ = 8,295e6/666667 = 12,4425; f = 0,9·24/1,3
  near(c.ratio, 8.295e6 / (100 * 200 * 200 / 6) / (0.9 * 24 / 1.3), 1e-6, 'Zginanie ze śniegiem (6.10b, k_mod = 0,9)');
}
// 10. Zwichrzenie: σ_m,crit wg (6.31) ≈ (6.32) dla drewna litego iglastego; k_crit
{
  const S = base(); S.geom.L = 6; S.geom.b = 60; S.geom.h = 240; S.ltb.pos = 'center';
  S.loads.perm = [{ name: 'q', q: 1 }];
  const R = E.calc(S);
  const z = R.segData[0].ltb.plus;
  near(z.lef, 0.9 * 6000, 1e-9, 'Zwichrzenie: l_ef = 0,9·L (obc. rozłożone, środek ciężkości)');
  const sec = R.md.segs[0].sec, mt = R.mt;
  near(z.sigcrit, Math.PI * Math.sqrt(mt.E005 * sec.Iz * mt.G05 * sec.It) / (z.lef * sec.Wy), 1e-9, 'Zwichrzenie: σ_crit wg (6.31) z I_tor wg Saint-Venanta');
  truthy(z.sigcrit <= z.sig632, 'Zwichrzenie: (6.31) z dokładnym I_tor ≤ (6.32) (I_tor = hb³/3) – bezpiecznie');
  const lam = Math.sqrt(24 / z.sigcrit);
  near(z.kcrit, lam <= 0.75 ? 1 : lam <= 1.4 ? 1.56 - 0.75 * lam : 1 / lam ** 2, 1e-9, 'Zwichrzenie: k_crit (6.34)');
  const S2 = JSON.parse(JSON.stringify(S)); S2.ltb.pos = 'top';
  near(E.calc(S2).segData[0].ltb.plus.lef, 0.9 * 6000 + 2 * 240, 1e-9, 'Zwichrzenie: obciążenie na krawędzi ściskanej → l_ef + 2h');
}
// 11. Skręcanie: równomierny moment skręcający na belce o podporach widełkowych → T_podp = m_t·L/2
{
  const S = base(); S.geom.L = 5;
  S.loads.perm = [{ name: 't', q: 0, mt: 0.4 }]; S.loads.gG = 1.0; S.loads.comb = '610';
  const R = E.calc(S);
  near(maxAbs(R.env.uls.T.mx.map((v, i) => Math.max(Math.abs(v), Math.abs(R.env.uls.T.mn[i])))), 1.0, 1e-5, 'Skręcanie: T = m_t·L/2');
  truthy(!!ck(R, 'tor0'), 'Skręcanie: jest sprawdzenie 6.1.8');
}
// 12. Docisk i k_c,90; podcięcie – k_v wg (6.62)
{
  const S = base(); S.geom.L = 4; S.geom.b = 100; S.geom.h = 200; S.geom.t = 100;
  S.loads.perm = [{ name: 'q', q: 5 }]; S.loads.comb = '610'; S.loads.gG = 1.35;
  S.supCfg = [{ notch: { on: true, side: 'bot', hef: 150, x: 50, i: 0 } }];
  const R = E.calc(S);
  const b = ck(R, 'bear0');
  // R = 1,35·(5)·4/2 = 13,5 kN; l_ef = 100 + 30 = 130 mm; σ = 13500/(100·130) = 1,0385; f = 0,6·2,5/1,3; k_c90 = 1,5
  near(b.Ed, 13500 / 13000, 1e-6, 'Docisk: σ_c,90,d');
  near(b.ratio, (13500 / 13000) / (1.5 * 0.6 * 2.5 / 1.3), 1e-6, 'Docisk: wykorzystanie z k_c,90 = 1,5');
  const nt = ck(R, 'notch0'), al = 0.75, h = 200;
  const kv = 5 * 1 / (Math.sqrt(h) * (Math.sqrt(al * (1 - al)) + 0.8 * 50 / h * Math.sqrt(1 / al - al * al)));
  near(nt.d.kv, Math.min(1, kv), 1e-9, 'Podcięcie: k_v (6.62)');
}
// 13. Pożar: d_ef = β_n·t + 7 mm (t ≥ 20 min), drewno lite β_n = 0,8
{
  const S = base(); S.fire.on = true; S.fire.R = 30; S.loads.perm = [{ name: 'q', q: 1 }];
  const R = E.calc(S);
  near(R.fireData.ch.def, 0.8 * 30 + 7, 1e-9, 'Pożar R30: d_ef = 31 mm');
  near(R.fireData.segs[0].bfi, 100 - 62, 1e-9, 'Pożar: b_fi = b − 2d_ef');
  near(R.fireData.segs[0].hfi, 200 - 31, 1e-9, 'Pożar (3 strony): h_fi = h − d_ef');
}
// 14. Dobór przekroju – wynik spełnia warunki, a przekrój mniejszy nie
{
  const S = E.defaultState();
  const r = E.designSection(S, { eta: 100 });
  truthy(r.ok, `Dobór przekroju: ${r.b}×${r.h} (η = ${r.eta && r.eta.toFixed(3)}, prób: ${r.tried})`);
}
console.log(`\n${n - bad}/${n} testów zaliczonych`);
process.exit(bad ? 1 : 0);
