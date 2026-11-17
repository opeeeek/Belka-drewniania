/* BelkaDR – raport obliczeniowy (pełny tok obliczeń z podstawieniami) */
(function () {
'use strict';
const BDR = window.BDR = window.BDR || {};
const E = () => window.EC5, U = () => window.BD;
const f = (v, dp) => U().fmt(v, dp === undefined ? 2 : dp);
const esc = s => U().esc(s);
const sym = s => U().sym(s);
const eq = (t, r) => `<div class="eq">${t}${r ? ` <span class="r">${r}</span>` : ''}</div>`;
const ok = (v, lim, txt) => v <= lim + 1e-9 ? `<span class="ok">✔ ${txt || 'warunek spełniony'}</span>` : `<span class="fail">✖ ${txt || 'warunek niespełniony'}</span>`;
const okR = r => ok(r, 1, `η = ${f(r * 100, 0)}%`);
const durTxt = c => c.type === 'ACC' ? 'sytuacja wyjątkowa (6.11b), k<sub>mod</sub> – chwilowe' : `${esc(E().DUR_NAME[c.fam] || '')} (k<sub>mod</sub> = ${f(c.kmod, 2)})`;
const cTxt = c => c ? `kombinacja ${c.id}: ${esc(c.eq)} – ${esc(c.desc)}; ${durTxt(c)}, γ<sub>M</sub> = ${f(c.gM, 2)}` : '';
const segN = (R, i) => R.md.segs.length > 1 ? ` – ${esc(R.md.segs[i].label)}` : '';

/* -------------------------------------------- tok obliczeń dla sprawdzeń */
function dBend(c, R) {
  const d = c.d, sd = R.segData[c.seg], sec = sd.sec, sb = sd.sb, mt = R.mt, km = mt.km;
  let o = eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}`);
  o += eq(`|M<sub>y,Ed</sub>| = ${f(d.My, 3)} kNm${d.Mz ? `; |M<sub>z,Ed</sub>| = ${f(d.Mz, 3)} kNm` : ''}${d.Nc ? `; N<sub>c,Ed</sub> = ${f(d.Nc, 2)} kN` : ''}${d.Nt ? `; N<sub>t,Ed</sub> = ${f(d.Nt, 2)} kN` : ''}`);
  o += eq(`σ<sub>m,y,d</sub> = M<sub>y,Ed</sub>/W<sub>y</sub> = ${f(d.My, 3)}·10⁶/${f(sec.Wy, 0)} = <b>${f(d.smy, 2)} MPa</b>`);
  o += eq(`f<sub>m,y,d</sub> = k<sub>mod</sub>·k<sub>h</sub>·k<sub>sys</sub>·f<sub>m,k</sub>/γ<sub>M</sub> = ${f(d.kmod, 2)}·${f(sb.khy, 3)}·${f(mt.ksys, 2)}·${f(mt.m.fmk, 1)}/${f(d.gM, 2)} = <b>${f(d.f.my, 2)} MPa</b>`, '(2.14), (3.1)');
  if (d.Mz) {
    o += eq(`σ<sub>m,z,d</sub> = M<sub>z,Ed</sub>/W<sub>z</sub> = ${f(d.Mz, 3)}·10⁶/${f(sec.Wz, 0)} = ${f(d.smz, 2)} MPa; f<sub>m,z,d</sub> = ${f(d.f.mz, 2)} MPa (k<sub>h,z</sub> = ${f(sb.khz, 3)})`);
    const r1 = d.smy / d.f.my + km * d.smz / d.f.mz, r2 = km * d.smy / d.f.my + d.smz / d.f.mz;
    o += eq(`${f(d.smy, 2)}/${f(d.f.my, 2)} + ${f(km, 2)}·${f(d.smz, 2)}/${f(d.f.mz, 2)} = ${f(r1, 3)}; ${f(km, 2)}·${f(d.smy, 2)}/${f(d.f.my, 2)} + ${f(d.smz, 2)}/${f(d.f.mz, 2)} = ${f(r2, 3)} ≤ 1 ${okR(Math.max(r1, r2))}`, '(6.11), (6.12)');
  } else o += eq(`σ<sub>m,y,d</sub> = ${f(d.smy, 2)} ≤ f<sub>m,y,d</sub> = ${f(d.f.my, 2)} MPa ${okR(c.ratio)}`, '(6.11)');
  return o;
}
function dTens(c, R) {
  const d = c.d, sec = R.segData[c.seg].sec;
  return eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}`) + eq(`σ<sub>t,0,d</sub> = N<sub>t,Ed</sub>/A = ${f(d.Nt, 2)}·10³/${f(sec.A, 0)} = ${f(d.st, 3)} MPa; f<sub>t,0,d</sub> = ${f(d.f.t0, 2)} MPa (k<sub>h</sub> z max(b, h))`) +
    eq(`σ<sub>t,0,d</sub>/f<sub>t,0,d</sub> + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = ${f(d.st / d.f.t0, 3)} + ${f(c.ratio - d.st / d.f.t0, 3)} = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, '(6.17), (6.18)');
}
function dComp(c, R) {
  const d = c.d, sec = R.segData[c.seg].sec;
  return eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}`) + eq(`σ<sub>c,0,d</sub> = N<sub>c,Ed</sub>/A = ${f(d.Nc, 2)}·10³/${f(sec.A, 0)} = ${f(d.sc, 3)} MPa; f<sub>c,0,d</sub> = ${f(d.f.c0, 2)} MPa`) +
    eq(`(σ<sub>c,0,d</sub>/f<sub>c,0,d</sub>)² + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = ${f((d.sc / d.f.c0) ** 2, 4)} + ${f(c.ratio - (d.sc / d.f.c0) ** 2, 3)} = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, '(6.19), (6.20)');
}
function dBuck(c, R) {
  const d = c.d, b = d.b, mt = R.mt, sec = R.segData[c.seg].sec;
  const one = (q, ax, i) => q.cont ? eq(`oś ${ax}: krawędź stężona w sposób ciągły – k<sub>c,${ax}</sub> = 1,0`) :
    eq(`l<sub>c,${ax}</sub> = ${f(q.lc / 1000, 2)} m; λ<sub>${ax}</sub> = l<sub>c</sub>/i<sub>${ax}</sub> = ${f(q.lc, 0)}/${f(i, 1)} = ${f(q.lam, 1)}; λ<sub>rel,${ax}</sub> = λ/π·√(f<sub>c,0,k</sub>/E<sub>0,05</sub>) = ${f(q.lam, 1)}/π·√(${f(mt.m.fc0k, 1)}/${f(mt.E005, 0)}) = ${f(q.lr, 3)}${q.lr > 0.3 ? `; k = 0,5[1 + ${f(b.betaC, 1)}(${f(q.lr, 3)} − 0,3) + ${f(q.lr, 3)}²] = ${f(q.k, 3)}; k<sub>c,${ax}</sub> = 1/(k + √(k² − λ<sub>rel</sub>²)) = <b>${f(q.kc, 3)}</b>` : ' ≤ 0,3 → k<sub>c</sub> = 1,0'}`, '(6.21)–(6.29)');
  return eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}; σ<sub>c,0,d</sub> = ${f(d.sc, 3)} MPa, σ<sub>m,y,d</sub> = ${f(d.smy, 2)} MPa${d.smz ? `, σ<sub>m,z,d</sub> = ${f(d.smz, 2)} MPa` : ''}`) + one(b.y, 'y', sec.iy) + one(b.z, 'z', sec.iz) +
    eq(`σ<sub>c,0,d</sub>/(k<sub>c,y</sub>f<sub>c,0,d</sub>) + σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + k<sub>m</sub>σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = ${f(d.r1, 3)}; σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>) + k<sub>m</sub>σ<sub>m,y,d</sub>/f<sub>m,y,d</sub> + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = ${f(d.r2, 3)} ${okR(c.ratio)}`, '(6.23), (6.24)');
}
function dShear(c, R) {
  const d = c.d, sec = R.segData[c.seg].sec, mt = R.mt, sd = R.segData[c.seg];
  let o = eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}`);
  if (sd.redOn) o += eq(`Siła poprzeczna poza strefą h = ${f(sec.h, 0)} mm od krawędzi podpór bezpośrednich (obciążenie przyłożone od góry) – 6.1.7(3)`);
  o += eq(`|V<sub>Ed</sub>| = ${f(d.Vy, 3)} kN; b<sub>ef</sub> = k<sub>cr</sub>·b = ${f(mt.kcr, 2)}·${f(sec.b, 0)} = ${f(mt.kcr * sec.b, 1)} mm`, '(6.13a)');
  o += eq(`τ<sub>d</sub> = 1,5·V<sub>Ed</sub>/(b<sub>ef</sub>·h) = 1,5·${f(d.Vy, 3)}·10³/(${f(mt.kcr * sec.b, 1)}·${f(sec.h, 0)}) = <b>${f(d.ty, 3)} MPa</b>`);
  o += eq(`f<sub>v,d</sub> = k<sub>mod</sub>·f<sub>v,k</sub>/γ<sub>M</sub> = ${f(d.kmod, 2)}·${f(mt.m.fvk, 1)}/${f(d.gM, 2)} = ${f(d.f.v, 3)} MPa`);
  if (c.id.startsWith('shear2')) o += eq(`τ<sub>z,d</sub> = 1,5·${f(d.Vz, 3)}·10³/(${f(mt.kcr * sec.b, 1)}·${f(sec.h, 0)}) = ${f(d.tz, 3)} MPa; (${f(d.ty, 3)}/${f(d.f.v, 3)})² + (${f(d.tz, 3)}/${f(d.f.vz, 3)})² = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, 'interakcja – DIN EN 1995-1-1/NA');
  else o += eq(`τ<sub>d</sub> = ${f(d.ty, 3)} ≤ f<sub>v,d</sub> = ${f(d.f.v, 3)} MPa ${okR(c.ratio)}`, '(6.13)');
  return o;
}
function dTor(c, R) {
  const d = c.d, sec = R.segData[c.seg].sec;
  let o = eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}; |T<sub>Ed</sub>| = ${f(d.T, 3)} kNm`);
  o += eq(`W<sub>tor</sub> = α·h·b² = ${f(sec.tc.alpha, 3)}·${f(Math.max(sec.h, sec.b), 0)}·${f(Math.min(sec.h, sec.b), 0)}² = ${f(sec.Wt, 0)} mm³; τ<sub>tor,d</sub> = T/W<sub>tor</sub> = ${f(d.tt, 3)} MPa`);
  o += eq(`k<sub>shape</sub> = min(1 + 0,15·h/b; 2,0) = ${f(sec.kshape, 3)}; k<sub>shape</sub>·f<sub>v,d</sub> = ${f(sec.kshape * d.f.v, 3)} MPa`, '(6.15)');
  if (c.id.startsWith('torv')) o += eq(`τ<sub>tor</sub>/(k<sub>shape</sub>f<sub>v,d</sub>) + (τ<sub>y</sub>/f<sub>v,d</sub>)² + (τ<sub>z</sub>/f<sub>v,d</sub>)² = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, 'DIN EN 1995-1-1/NA');
  else o += eq(`τ<sub>tor,d</sub> = ${f(d.tt, 3)} ≤ ${f(sec.kshape * d.f.v, 3)} MPa ${okR(c.ratio)}`, '(6.14)');
  return o;
}
function dLtb(c, R) {
  const d = c.d, z = d.z, sec = R.segData[c.seg].sec, mt = R.mt;
  let o = eq(`Strefa ${c.id.includes('plus') ? 'M &gt; 0 (ściskana krawędź górna)' : 'M &lt; 0 (ściskana krawędź dolna)'}: ${esc(z.src)}`);
  if (!z.man) o += eq(`l<sub>ef</sub> = ${f(z.f, 2)}·${f(z.l, 2)} m${z.corr ? ` ${z.corr > 0 ? '+ 2h' : '− 0,5h'} = ${f(z.f * z.l * 1000, 0)} ${z.corr > 0 ? '+' : '−'} ${f(Math.abs(z.corr), 0)}` : ''} = <b>${f(z.lef, 0)} mm</b> (obciążenie ${R.S.ltb.pos === 'top' ? 'na górnej krawędzi' : R.S.ltb.pos === 'bottom' ? 'na dolnej krawędzi' : 'w środku ciężkości'})`, 'tab. 6.1');
  o += eq(`σ<sub>m,crit</sub> = π·√(E<sub>0,05</sub>I<sub>z</sub>G<sub>0,05</sub>I<sub>tor</sub>)/(l<sub>ef</sub>W<sub>y</sub>) = π·√(${f(mt.E005, 0)}·${f(sec.Iz, 0)}·${f(mt.G05, 0)}·${f(sec.It, 0)})/(${f(z.lef, 0)}·${f(sec.Wy, 0)}) = <b>${f(z.sigcrit, 2)} MPa</b> (dla porównania 0,78b²E<sub>0,05</sub>/(h·l<sub>ef</sub>) = ${f(z.sig632, 2)} MPa)`, '(6.31), (6.32)');
  o += eq(`λ<sub>rel,m</sub> = √(f<sub>m,k</sub>/σ<sub>m,crit</sub>) = √(${f(mt.m.fmk, 1)}/${f(z.sigcrit, 2)}) = ${f(z.lam, 3)} → k<sub>crit</sub> = ${z.lam <= 0.75 ? '1,0' : z.lam <= 1.4 ? `1,56 − 0,75·${f(z.lam, 3)}` : `1/${f(z.lam, 3)}²`} = <b>${f(z.kcrit, 3)}</b>`, '(6.30), (6.34)');
  o += eq(`x = ${f(d.x, 2)} m; ${cTxt(d.c)}; M<sub>Ed</sub> = ${f(d.M, 3)} kNm → σ<sub>m,d</sub> = ${f(d.sm, 2)} MPa, f<sub>m,d</sub> = ${f(d.f.my, 2)} MPa`);
  if (d.Nc > 1e-9) o += eq(`(σ<sub>m,d</sub>/(k<sub>crit</sub>f<sub>m,d</sub>))² + σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>)${d.smz ? ' + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub>' : ''} = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, '(6.35)');
  else if (d.smz > 1e-9) o += eq(`σ<sub>m,y,d</sub>/(k<sub>crit</sub>f<sub>m,y,d</sub>) + σ<sub>m,z,d</sub>/f<sub>m,z,d</sub> = ${f(d.r0, 3)} + ${f(d.smz / d.f.mz, 3)} = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, '(6.33) z M<sub>z</sub>');
  else o += eq(`σ<sub>m,d</sub> = ${f(d.sm, 2)} ≤ k<sub>crit</sub>·f<sub>m,d</sub> = ${f(z.kcrit, 3)}·${f(d.f.my, 2)} = ${f(z.kcrit * d.f.my, 2)} MPa ${okR(c.ratio)}`, '(6.33)');
  return o;
}
function dBear(c, R) {
  const d = c.d, sd = R.supData[c.sup], p = sd.p, bl = d.bl, mt = R.mt;
  let o = eq(`Podpora ${esc(p.label)} (${esc(p.name)}): długość oparcia l = t = ${f(p.t, 0)} mm${p.a ? `, wysunięcie belki poza podporę a = ${f(p.a, 0)} mm` : ''}; b = ${f(sd.sec.b, 0)} mm`);
  o += eq(`l<sub>ef</sub> = l + ${f(bl.eL, 0)} + ${f(bl.eR, 0)} = ${f(bl.lef, 0)} mm (po ${bl.endL || bl.endR ? 'stronie końca belki min(30; a), po stronie przęsła' : 'obu stronach'} min(30; l<sub>1</sub>/2)); A<sub>ef</sub> = b·l<sub>ef</sub> = ${f(sd.sec.b * bl.lef, 0)} mm²`, '6.1.5(1)');
  o += eq(`k<sub>c,90</sub> = ${f(d.kc.k, 2)} – ${esc(d.kc.src)}`, '6.1.5(2)–(4)');
  o += eq(`${cTxt(d.c)}: F<sub>c,90,d</sub> = R<sub>Ed</sub> = ${f(d.F, 3)} kN`);
  o += eq(`σ<sub>c,90,d</sub> = ${f(d.F, 3)}·10³/${f(sd.sec.b * bl.lef, 0)} = ${f(d.s, 3)} MPa; f<sub>c,90,d</sub> = ${f(d.c.kmod, 2)}·${f(mt.m.fc90k, 2)}/${f(d.c.gM, 2)} = ${f(d.fd, 3)} MPa`);
  o += eq(`σ<sub>c,90,d</sub> = ${f(d.s, 3)} ≤ k<sub>c,90</sub>·f<sub>c,90,d</sub> = ${f(d.kc.k * d.fd, 3)} MPa ${okR(c.ratio)}`, '(6.3)');
  const treq = Math.max(0, d.F * 1e3 / (sd.sec.b * d.kc.k * d.fd) - bl.eL - bl.eR);
  o += eq(`Minimalna długość oparcia z warunku docisku: t<sub>min</sub> = F/(b·k<sub>c,90</sub>f<sub>c,90,d</sub>) − ${f(bl.eL + bl.eR, 0)} = ${f(treq, 0)} mm`);
  return o;
}
function dNotch(c, R) {
  const d = c.d, sd = R.supData[c.sup], mt = R.mt, h = sd.h;
  let o = eq(`Podpora ${esc(sd.p.label)}: podcięcie ${d.side === 'bot' ? 'od strony podpory' : 'od strony przeciwnej do podpory'}; h = ${f(h, 0)} mm, h<sub>ef</sub> = ${f(d.hef, 0)} mm, α = h<sub>ef</sub>/h = ${f(d.al, 3)}, x = ${f(d.x, 0)} mm, i = ${f(d.i, 2)}`);
  if (d.kvf !== null) o += eq(`k<sub>v</sub> = min{1; k<sub>n</sub>(1 + 1,1i<sup>1,5</sup>/√h)/[√h(√(α(1−α)) + 0,8·x/h·√(1/α − α²))]} = min{1; ${f(mt.F.kn, 1)}·(1 + 1,1·${f(d.i, 2)}<sup>1,5</sup>/√${f(h, 0)})/[√${f(h, 0)}·(√(${f(d.al, 3)}·${f(1 - d.al, 3)}) + 0,8·${f(d.x, 0)}/${f(h, 0)}·√(1/${f(d.al, 3)} − ${f(d.al, 3)}²))]} = <b>${f(d.kv, 3)}</b>`, '(6.62)');
  else o += eq(`k<sub>v</sub> = 1,0`, '6.5.2(2)');
  o += eq(`${cTxt(d.c)}: |V<sub>Ed</sub>| = ${f(d.V, 3)} kN; τ<sub>d</sub> = 1,5·V/(k<sub>cr</sub>·b·h<sub>ef</sub>) = 1,5·${f(d.V, 3)}·10³/(${f(mt.kcr, 2)}·${f(sd.sec.b, 0)}·${f(d.hef, 0)}) = ${f(d.tau, 3)} MPa`);
  o += eq(`τ<sub>d</sub> = ${f(d.tau, 3)} ≤ k<sub>v</sub>·f<sub>v,d</sub> = ${f(d.kv, 3)}·${f(d.fv, 3)} = ${f(d.kv * d.fv, 3)} MPa ${okR(c.ratio)}`, '(6.60)');
  return o;
}
function dPtb(c, R) {
  const d = c.d, mt = R.mt;
  return eq(`Siła ${esc(d.o.key)} = ${f(d.q.P, 2)} kN w x = ${f(d.q.x, 2)} m, długość docisku l = ${f(d.q.lb, 0)} mm; F<sub>d</sub> = ${f(d.gam, 2)}·${f(d.q.P, 2)} = ${f(d.F, 3)} kN`) +
    eq(`l<sub>ef</sub> = ${f(d.lef, 0)} mm; k<sub>c,90</sub> = ${f(d.kc, 2)}; σ<sub>c,90,d</sub> = ${f(d.s, 3)} MPa; f<sub>c,90,d</sub> = ${f(d.kmod, 2)}·${f(mt.m.fc90k, 2)}/${f(d.gM, 2)} = ${f(d.fd, 3)} MPa`) +
    eq(`σ<sub>c,90,d</sub> = ${f(d.s, 3)} ≤ ${f(d.kc * d.fd, 3)} MPa ${okR(c.ratio)}`, '(6.3)');
}
function dDefl(c, R) {
  const o0 = c.d, S = R.S, mt = R.mt, j = c.id.startsWith('winst') ? 0 : c.id.startsWith('wnetfin') ? 1 : 2;
  const lim = o0.lim[j], wl = o0.Lmm / lim, Lt = o0.cant ? 'l<sub>w</sub>' : 'L';
  let o = eq(`${esc(o0.seg.label)}: ${Lt} = ${f(o0.Lmm, 0)} mm; k<sub>def</sub> = ${f(mt.kdef, 2)}; E<sub>0,mean</sub> = ${f(mt.E0m, 0)} MPa, G<sub>mean</sub> = ${f(mt.Gm, 0)} MPa${S.sls.shear ? ' (z odkształceniami postaciowymi)' : ''}`);
  if (j === 0) o += eq(`w<sub>inst</sub> = w<sub>G</sub> + w<sub>Q,1</sub> + Σψ<sub>0,i</sub>w<sub>Q,i</sub> = <b>${f(o0.wi, 2)} mm</b> (x = ${f(o0.xi, 2)} m)`, '2.2.3(2)');
  else {
    o += eq(`w<sub>fin</sub> = w<sub>inst,G</sub>(1 + k<sub>def</sub>) + w<sub>inst,Q1</sub>(1 + ψ<sub>2,1</sub>k<sub>def</sub>) + Σw<sub>inst,Qi</sub>(ψ<sub>0,i</sub> + ψ<sub>2,i</sub>k<sub>def</sub>) = <b>${f(o0.wf, 2)} mm</b> (x = ${f(o0.xf, 2)} m)`, '2.2.3(5)');
    if (j === 1) o += eq(`w<sub>net,fin</sub> = w<sub>fin</sub> − w<sub>c</sub> = <b>${f(o0.wn, 2)} mm</b>${o0.w0 ? ` (podniesienie wykonawcze w<sub>c</sub> = ${f(o0.w0, 1)} mm, parabolicznie)` : ''}`, 'rys. 7.1');
  }
  const w = j === 0 ? o0.wi : j === 1 ? o0.wn : o0.wf;
  o += eq(`${f(w, 2)} ≤ ${Lt}/${lim} = ${f(wl, 2)} mm ${okR(w / wl)}`, 'tab. 7.2');
  return o;
}
function dVib(c, R) {
  const v = R.vib;
  return eq(`Rozstaw belek s = ${f(v.s, 3)} m, szerokość stropu B = ${f(v.B, 2)} m, rozpiętość l = ${f(v.L, 2)} m, ζ = ${f(v.zeta, 3)}`) +
    eq(`(EI)<sub>l</sub> = E<sub>0,mean</sub>I<sub>y</sub>/s = ${f(v.EIl / 1000, 1)} kNm²/m; m = ${f(v.gl, 3)} kN/m / s = ${f(v.m, 1)} kg/m²`) +
    eq(`f<sub>1</sub> = π/(2l²)·√((EI)<sub>l</sub>/m) = <b>${f(v.f1, 2)} Hz</b> ${ok(-v.f1, -8, v.f1 > 8 ? '&gt; 8 Hz' : '≤ 8 Hz – wymagana szczegółowa analiza')}`, '(7.5)') +
    eq(`w/F = k<sub>dist</sub>·(l³/(48EI) + l/(4κGA)) = ${f(v.wF, 3)} mm/kN ≤ a = ${f(v.a, 2)} mm/kN ${ok(v.wF, v.a)}`, '(7.3)') +
    eq(`n<sub>40</sub> = ${f(v.n40, 2)} ((EI)<sub>b</sub> = ${f(v.EIb / 1000, 2)} kNm²/m); v = 4(0,4 + 0,6n<sub>40</sub>)/(mBl + 200) = ${f(v.v, 4)} ≤ b<sup>(f₁ζ−1)</sup> = ${f(v.vlim, 4)} m/(Ns²) ${ok(v.v, v.vlim)}`, '(7.4), (7.6), (7.7)');
}
function dFire(c, R) {
  const d = c.d, rec = d.rec, ch = R.fireData.ch, mt = R.mt;
  let o = eq(`R ${R.S.fire.R}: β<sub>n</sub> = ${f(ch.bn, 2)} mm/min${ch.prot !== 'none' ? `; okładzina h<sub>p</sub> = ${f(ch.hp, 1)} mm: t<sub>ch</sub> = ${f(ch.tch, 1)} min, t<sub>f</sub> = ${f(ch.tf, 1)} min, k<sub>2</sub> = ${f(ch.k2, 3)}, t<sub>a</sub> = ${f(ch.ta, 1)} min` : ''}; d<sub>char,n</sub> = ${f(ch.dchar, 1)} mm`, 'PN-EN 1995-1-2, 3.4');
  o += eq(`d<sub>ef</sub> = d<sub>char,n</sub> + k<sub>0</sub>·d<sub>0</sub> = ${f(ch.dchar, 1)} + ${f(ch.k0, 2)}·7 = <b>${f(ch.def, 1)} mm</b> → przekrój ${f(rec.bfi, 0)}×${f(rec.hfi, 0)} mm (${R.S.fire.sides} strony)`, '(4.1)');
  o += eq(`f<sub>m,d,fi</sub> = k<sub>fi</sub>·f<sub>m,k</sub> = ${f(mt.kfi, 2)}·${f(mt.m.fmk, 1)} = ${f(rec.f.my, 2)} MPa; f<sub>v,d,fi</sub> = ${f(rec.f.v, 2)} MPa (k<sub>mod,fi</sub> = γ<sub>M,fi</sub> = 1,0)`, '(2.1)');
  if (c.id.startsWith('fib')) o += eq(`x = ${f(d.x, 2)} m; M<sub>Ed,fi</sub> = ${f(d.My, 3)} kNm → σ<sub>m,d,fi</sub> = ${f(d.smy, 2)} MPa; wykorzystanie ${f(c.ratio, 3)} ${okR(c.ratio)}`);
  else if (c.id.startsWith('fis')) o += eq(`x = ${f(d.x, 2)} m; V<sub>Ed,fi</sub> = ${f(d.Vy, 3)} kN → τ<sub>d,fi</sub> = ${f(d.ty, 3)} ≤ ${f(rec.f.v, 2)} MPa ${okR(c.ratio)}`);
  else o += eq(`l<sub>ef</sub> = ${f(d.z.lef, 0)} mm, σ<sub>m,crit,fi</sub> = ${f(d.z.sigcrit, 2)} MPa (k<sub>fi</sub>E<sub>0,05</sub>, k<sub>fi</sub>G<sub>0,05</sub>), λ<sub>rel,m</sub> = ${f(d.z.lam, 3)}, k<sub>crit</sub> = ${f(d.z.kcrit, 3)}; σ<sub>m,d,fi</sub> = ${f(d.sm, 2)} MPa → ${f(c.ratio, 3)} ${okR(c.ratio)}`);
  return o;
}
function dCol(c, R) {
  const o = c.d, cc = o.c, m = o.m, k = c.id, W0 = o.worst;
  const head = eq(`Słup pod podporą ${esc(o.p.label)}: ${esc(m.name)}, ${f(cc.b, 0)}×${f(cc.h, 0)} mm, H = ${f(cc.L, 2)} m, A = ${f(o.sec.A, 0)} mm²; ciężar własny G = ${f(o.gam, 1)}·A·H = ${f(o.Gcol, 3)} kN; obciążenie – reakcja belki R_Ed z każdej kombinacji SGN`);
  if (/^colbk/.test(k)) { const w = W0.buck, b = o.by, z = o.bz;
    return head + eq(`${cTxt(w.cmb)}: N<sub>c,Ed</sub> = R<sub>Ed</sub> + γ<sub>G</sub>·G = ${f(w.Nc, 3)} kN; M<sub>Ed</sub> = N·e = ${f(w.Ntop, 3)}·${f(cc.e / 1000, 3)} = ${f(w.M, 3)} kNm`) +
      eq(`λ<sub>y</sub> = ${f(b.lc, 0)}/${f(cc.h / Math.sqrt(12), 1)} = ${f(b.lam, 1)}, λ<sub>rel,y</sub> = ${f(b.lr, 3)} → k<sub>c,y</sub> = ${f(b.kc, 3)}; λ<sub>z</sub> = ${f(z.lam, 1)}, λ<sub>rel,z</sub> = ${f(z.lr, 3)} → k<sub>c,z</sub> = ${f(z.kc, 3)}`, '(6.21)–(6.29)') +
      eq(`σ<sub>c,0,d</sub> = ${f(w.sc, 3)} MPa, σ<sub>m,d</sub> = ${f(w.sm, 3)} MPa; f<sub>c,0,d</sub> = ${f(w.fc0d, 2)}, f<sub>m,d</sub> = ${f(w.fmd, 2)} MPa`) +
      eq(`σ<sub>c,0,d</sub>/(k<sub>c,y</sub>f<sub>c,0,d</sub>) + σ<sub>m,d</sub>/f<sub>m,d</sub> = ${f(w.r1, 3)}; σ<sub>c,0,d</sub>/(k<sub>c,z</sub>f<sub>c,0,d</sub>) + k<sub>m</sub>σ<sub>m,d</sub>/f<sub>m,d</sub> = ${f(w.r2, 3)} ${okR(c.ratio)}`, '(6.23), (6.24)'); }
  if (/^colend/.test(k)) { const w = W0.end;
    return head + eq(`A<sub>net</sub> = ${cc.type === 'slot' ? `A − (t<sub>s</sub> + 2)·h = ${f(o.sec.A, 0)} − ${f(cc.ts + 2, 0)}·${f(cc.h, 0)}` : 'A'} = ${f(o.Anet, 0)} mm²; ${cTxt(w.cmb)}`) + eq(`σ<sub>c,0,d</sub> = ${f(w.Nc, 3)}·10³/${f(o.Anet, 0)} = ${f(w.sce, 3)} ≤ f<sub>c,0,d</sub> = ${f(w.fc0d, 2)} MPa ${okR(c.ratio)}`, '(6.2)'); }
  if (/^colcn/.test(k)) { const w = W0.conn, F0 = o.F0, F90 = o.F90, md = F0.modes;
    let s = head + eq(`${cc.fast === 'bolt' ? 'Śruby' : 'Sworznie'} ⌀${cc.d} (${esc(E().FAST_STEEL[cc.grade].n)}, f<sub>u,k</sub> = ${f(F0.fu, 0)} MPa), ${cc.n} × ${cc.m} = ${o.nTot} szt., 2 płaszczyzny ścinania; ${cc.type === 'slot' ? `blacha wpuszczana t<sub>s</sub> = ${f(cc.ts, 0)} mm, t<sub>1</sub> = (b − t<sub>s</sub> − 2)/2 = ${f(F0.t, 1)} mm` : `blachy zewnętrzne t<sub>s</sub> = ${f(cc.ts, 0)} mm, t<sub>2</sub> = ${f(F0.t, 0)} mm`}`);
    s += eq(`f<sub>h,0,k</sub> = 0,082(1 − 0,01d)ρ<sub>k</sub> = 0,082·(1 − 0,01·${cc.d})·${f(m.rhok, 0)} = ${f(F0.fh0, 2)} MPa; k<sub>90</sub> = ${f(F0.k90, 3)} → f<sub>h,90,k</sub> = ${f(F90.fh, 2)} MPa; M<sub>y,Rk</sub> = 0,3f<sub>u,k</sub>d<sup>2,6</sup> = ${f(F0.My / 1000, 1)} Nm${F0.Fax ? `; F<sub>ax,Rk</sub> = ${f(F0.Fax / 1000, 2)} kN (podkładka)` : ''}`, '(8.30), (8.32), (8.33)');
    s += cc.type === 'slot' ? eq(`F<sub>v,Rk</sub> (α = 0°) = min{(f) ${f(md.f / 1000, 2)}; (g) ${f(md.g / 1000, 2)}; (h) ${f(md.h / 1000, 2)}} = <b>${f(F0.Fv / 1000, 2)} kN</b>; (α = 90°) ${f(F90.Fv / 1000, 2)} kN`, '(8.11)')
      : eq(`F<sub>v,Rk</sub> (α = 0°): (j) ${f(md.j / 1000, 2)}, (k) ${f(md.k / 1000, 2)}, (m) ${f(md.m / 1000, 2)} kN → ${f(F0.Fv / 1000, 2)} kN (interpolacja blacha cienka/gruba ${f(md.thinThick, 2)}); (α = 90°) ${f(F90.Fv / 1000, 2)} kN`, '(8.12), (8.13)');
    s += eq(`n<sub>ef</sub> = min{n; n<sup>0,9</sup>·(a<sub>1</sub>/(13d))<sup>0,25</sup>} = min{${cc.n}; ${f(Math.pow(cc.n, 0.9) * Math.pow(cc.a1 / (13 * cc.d), 0.25), 3)}} = ${f(o.nef0, 3)}`, '(8.34)');
    s += eq(`${cTxt(w.cmb)}, γ<sub>M</sub> = ${f(w.gMconn, 2)}: R<sub>t,d</sub> = k<sub>mod</sub>F<sub>v,Rk</sub>/γ<sub>M</sub>·2·n<sub>ef</sub>·m = ${f(w.RN, 2)} kN; R<sub>v,d</sub> (w poprzek włókien) = ${f(w.RH, 2)} kN`);
    s += eq(`F<sub>t,Ed</sub> = ${f(w.Nt, 2)} kN (odrywanie), F<sub>v,Ed</sub> = H = ${f(w.H, 2)} kN → (${f(w.Nt, 2)}/${f(w.RN, 2)})² + (${f(w.H, 2)}/${f(w.RH, 2)})² = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`);
    return s; }
  if (/^colbs/.test(k)) { const w = W0.block;
    return head + eq(`L<sub>net,t</sub> = (m − 1)(a<sub>2</sub> − d) = ${f(o.Lt, 0)} mm, L<sub>net,v</sub> = 2[(n − 1)(a<sub>1</sub> − d) + a<sub>3</sub> − d/2] = ${f(o.Lv, 0)} mm; t<sub>ef</sub> = ${f(w.tef, 1)} mm; A<sub>net,t</sub> = ${f(w.Anet_t, 0)} mm², A<sub>net,v</sub> = ${f(w.Anet_v, 0)} mm²`, 'zał. A') +
      eq(`F<sub>bs,Rd</sub> = k<sub>mod</sub>/γ<sub>M</sub>·max{1,5A<sub>net,t</sub>f<sub>t,0,k</sub>; 0,7A<sub>net,v</sub>f<sub>v,k</sub>}${cc.type === 'slot' ? ' (×2 – dwie warstwy drewna)' : ''} = ${f(w.Fbs, 2)} kN ≥ F<sub>t,Ed</sub> = ${f(w.Nt, 2)} kN ${okR(c.ratio)}`, '(A.1)–(A.5)'); }
  if (/^colsp/.test(k)) { const q = o.req, a = o.act, row = (n, l) => `${l} = ${isFinite(a[n]) ? f(a[n], 0) : '—'} ≥ ${f(q[n], 0)} mm ${isFinite(a[n]) ? ok(q[n], a[n], '') : ''}`;
    return eq(`${cc.fast === 'bolt' ? 'Śruby – tab. 8.5' : 'Sworznie – tab. 8.6'}; α = 0° (wyrywanie)${o.worst.conn && o.worst.conn.H > 0 ? ' i 90° (siła pozioma)' : ''}: ${[row('a1', 'a₁'), row('a2', 'a₂'), row('a3', 'a₃,t'), row('a4', 'a₄')].join('; ')}`) + eq(`Rozmieszczenie w przekroju: (m − 1)a<sub>2</sub> + 2a<sub>4</sub> = ${f((cc.m - 1) * cc.a2 + 2 * cc.a4, 0)} ≤ h = ${f(cc.h, 0)} mm ${ok((cc.m - 1) * cc.a2 + 2 * cc.a4, cc.h)}`); }
  if (/^colpb/.test(k)) { const w = W0.pbear;
    return eq(`Blacha ${esc(cc.steel)} (f<sub>u</sub> = ${f(E().PLATE_STEEL[cc.steel].fu, 0)} MPa), t = ${f(cc.ts, 0)} mm, d<sub>0</sub> = ${f(cc.fast === 'bolt' ? cc.d + 1 : cc.d, 0)} mm: α<sub>b</sub> = min{e<sub>1</sub>/(3d<sub>0</sub>); f<sub>ub</sub>/f<sub>u</sub>; 1} = ${f(o.alphaB, 3)}; F<sub>b,Rd</sub> = 2,5·α<sub>b</sub>·f<sub>u</sub>·d·t/γ<sub>M2</sub> = ${f(o.Fb1 / 1000, 2)} kN`, 'EN 1993-1-8, tab. 3.4') +
      eq(`F<sub>1,Ed</sub> = √(N<sub>t</sub>² + H²)/(n·m${o.nPl > 1 ? '·2' : ''}) = ${f(w.F1, 3)} ≤ ${f(o.Fb1 / 1000, 2)} kN ${okR(c.ratio)}`); }
  if (/^colcc/.test(k)) { const w = W0.conc;
    return eq(`Beton ${esc(cc.conc)}: f<sub>cd</sub> = f<sub>ck</sub>/γ<sub>c</sub> = ${f(o.fck, 0)}/1,4 = ${f(o.fcd, 2)} MPa; f<sub>jd</sub> = β<sub>j</sub>k<sub>j</sub>f<sub>cd</sub> = 2/3·1,0·${f(o.fcd, 2)} = ${f(o.fjd, 2)} MPa`, 'EN 1993-1-8, 6.2.5') + eq(`σ = N<sub>c,Ed</sub>/(a·b) = ${f(w.Nc, 3)}·10³/(${f(cc.pa, 0)}·${f(cc.pb, 0)}) = ${f(w.s, 3)} ≤ ${f(o.fjd, 2)} MPa ${okR(c.ratio)}`); }
  if (/^colan/.test(k)) { const w = W0.anch;
    return eq(`Kotwy: ${cc.na} szt., N<sub>Rd</sub> = ${f(cc.NRd, 2)} kN, V<sub>Rd</sub> = ${f(cc.VRd, 2)} kN (wartości obliczeniowe z ETA kotwy – przyjęte przez projektanta)`) + eq(`β<sub>N</sub> = N<sub>t,Ed</sub>/(n·N<sub>Rd</sub>) = ${f(w.Nt, 2)}/(${cc.na}·${f(cc.NRd, 2)}) = ${f(w.bN, 3)}; β<sub>V</sub> = H/(n·V<sub>Rd</sub>) = ${f(w.bV, 3)}; β<sub>N</sub><sup>1,5</sup> + β<sub>V</sub><sup>1,5</sup> = ${f(c.ratio, 3)} ≤ 1 ${okR(c.ratio)}`, 'EN 1992-4, (7.54)'); }
  return '';
}
BDR.detail = function (c) {
  const R = U().R; if (!c || !R) return '';
  try {
    const id = c.id;
    if (/^bend/.test(id)) return dBend(c, R);
    if (/^tens/.test(id)) return dTens(c, R);
    if (/^comp/.test(id)) return dComp(c, R);
    if (/^buck/.test(id)) return dBuck(c, R);
    if (/^shear/.test(id)) return dShear(c, R);
    if (/^tor/.test(id)) return dTor(c, R);
    if (/^ltb/.test(id)) return dLtb(c, R);
    if (/^bear/.test(id)) return dBear(c, R);
    if (/^notch/.test(id)) return dNotch(c, R);
    if (/^ptb/.test(id)) return dPtb(c, R);
    if (/^w(inst|netfin|fin)/.test(id)) return dDefl(c, R);
    if (/^vib/.test(id) && R.vib) return dVib(c, R);
    if (/^fi[bsl]/.test(id)) return dFire(c, R);
    if (/^col/.test(id) && c.d && c.d.worst) return dCol(c, R);
  } catch (e) { console.error(e); return `<div class="eq">(${esc(e.message)})</div>`; }
  return '';
};

/* -------------------------------------------- sekcje raportu */
function head(R, S, title) {
  const d = new Date();
  return `<h1>${esc(title)}: ${esc(S.meta.name || 'belka')}</h1><p class="note">BelkaDR 1.1 · ${d.toLocaleDateString('pl-PL')}${S.meta.author ? ' · opracował: ' + esc(S.meta.author) : ''} · PN-EN 1995-1-1 (+ ZK PL), PN-EN 1990, PN-EN 1991-1-1${S.fire.on ? ', PN-EN 1995-1-2' : ''}</p>${S.meta.note ? `<p>${esc(S.meta.note)}</p>` : ''}`;
}
function secData(R, S) {
  const u = U(), md = R.md, mt = R.mt;
  let o = `<h2>1. Dane wejściowe</h2>`;
  o += eq(`Schemat statyczny: <b>${esc(E().SCHEMES[S.scheme].name)}</b>; ${md.segs.map(s => `${esc(s.label)} – ${f(s.L, 2)} m`).join('; ')}; długość elementu ${f(md.Lmember, 2)} m`);
  if (S.geom.beta || S.geom.alpha) o += eq(`Nachylenie osi belki β = ${f(S.geom.beta, 1)}°, obrót przekroju α = ${f(S.geom.alpha, 1)}°`);
  o += eq(`Przekrój: ${S.geom.n > 1 ? `${S.geom.n} × ` : ''}b × h = ${f(S.geom.b, 0)} × ${f(S.geom.h, 0)} mm${md.segs.some(s => s.own) ? '; w odcinkach: ' + md.segs.filter(s => s.own).map(s => `${esc(s.label)} – ${f(s.b1, 0)}×${f(s.h, 0)}`).join(', ') : ''}`);
  o += eq(`Materiał: <b>${esc(mt.m.name)}</b> – ${esc(E().FAM[mt.m.fam].name)}; klasa użytkowania ${S.env.sc}${S.env.wet ? ' (drewno wbudowane w stanie mokrym)' : ''}`);
  o += `<h3>Podpory</h3><table class="sched"><tr><th>Podpora</th><th>x [m]</th><th>rodzaj</th><th>blokady</th><th>t [mm]</th><th>uwagi</th></tr>${md.sups.map(p => `<tr><td>${esc(p.label)} – ${esc(p.name)}</td><td class="n">${f(p.x, 2)}</td><td>${esc(p.typeName)}</td><td>${[['x', p.dof.x], ['y', p.dof.y], ['z', p.dof.z], ['φ', p.dof.r]].filter(q => q[1]).map(q => q[0]).join(', ')}</td><td class="n">${f(p.t, 0)}</td><td>${[p.kv ? `k<sub>v</sub> = ${f(+p.kv, 1)} kN/mm` : '', p.kr ? `k<sub>φ</sub> = ${f(+p.kr, 0)} kNm/rad` : '', p.a ? `a = ${f(p.a, 0)} mm` : '', p.notch && p.notch.on ? 'podcięcie' : '', p.direct ? '' : 'podparcie pośrednie'].filter(Boolean).join('; ')}</td></tr>`).join('')}</table>`;
  if (S.nodes.length) o += eq(`Węzły i przeguby: ${S.nodes.map(n => `${n.hinge ? 'przegub' : 'węzeł'} w ${esc((md.segs[n.seg] || {}).label || '')}, a = ${f(n.a, 2)} m`).join('; ')}`);
  o += `<h3>Obciążenia (wartości charakterystyczne)</h3><table class="sched"><tr><th>Ozn.</th><th>Obciążenie</th><th>Rodzaj / klasa trwania</th><th>Wartość</th><th>Zakres / kierunek</th><th>ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub></th></tr>`;
  R.st.items.forEach(o2 => {
    const it = o2.it;
    if (o2.sw) { o += `<tr><td>G0</td><td>Ciężar własny</td><td>stałe</td><td>γ = ${f(mt.gamma, 1)} kN/m³ → ${o2.qsw.map(v => f(v, 3)).filter((v, i, a) => a.indexOf(v) === i).join(' / ')} kN/m</td><td>cała belka, pionowo</td><td>—</td></tr>`; return; }
    const rg = o2.rg, q2 = it.q2 === '' ? it.q : it.q2;
    const val = [it.q || q2 ? `q = ${f(it.q, 2)}${q2 !== it.q ? '…' + f(q2, 2) : ''} kN/m` : '', ...(it.pts || []).filter(p => p.P).map(p => `P = ${f(p.P, 2)} kN @ ${f(E().ptX(p, rg), 2)} m`), it.mt ? `m<sub>t</sub> = ${f(it.mt, 2)} kNm/m` : '', it.N ? `N = ${f(it.N, 1)} kN` : ''].filter(Boolean).join('<br>');
    const ps = o2.psi;
    o += `<tr><td>${o2.key}</td><td>${esc(it.name)}</td><td>${esc(u.KIND_NAME[it.kind])} / ${esc(E().DUR_NAME[o2.dur])}</td><td>${val}</td><td>${f(rg.xa, 2)}–${f(rg.xb, 2)} m; ${it.dir === 'g' ? 'pionowo' + (it.proj === 'hor' ? ', na rzut poziomy' : '') : it.dir === 'y' ? '⊥ do osi (y)' : 'poziomo (z)'}${o2.split ? '; szachownica' : ''}</td><td>${ps ? `${u.fmtPsi(ps.p0)} / ${u.fmtPsi(ps.p1)} / ${u.fmtPsi(ps.p2)}` : '—'}</td></tr>`;
  });
  o += `</table>`;
  return o;
}
function secMat(R, S) {
  const mt = R.mt, m = mt.m, u = U();
  let o = `<h2>2. Parametry materiałowe</h2>`;
  o += eq(`${esc(m.name)}: f<sub>m,k</sub> = ${f(m.fmk, 1)}, f<sub>t,0,k</sub> = ${f(m.ft0k, 1)}, f<sub>t,90,k</sub> = ${f(m.ft90k, 2)}, f<sub>c,0,k</sub> = ${f(m.fc0k, 1)}, f<sub>c,90,k</sub> = ${f(m.fc90k, 2)}, f<sub>v,k</sub> = ${f(m.fvk, 2)} MPa`, m.fam === 'C' || m.fam === 'D' ? 'PN-EN 338' : /^GL/.test(m.fam) ? 'PN-EN 14080' : 'DoP');
  o += eq(`E<sub>0,mean</sub> = ${f(mt.E0m, 0)} MPa, E<sub>0,05</sub> = ${f(mt.E005, 0)} MPa, G<sub>mean</sub> = ${f(mt.Gm, 0)} MPa, G<sub>0,05</sub> = ${f(mt.G05, 0)} MPa, ρ<sub>k</sub> = ${f(m.rhok, 0)} kg/m³, ρ<sub>mean</sub> = ${f(m.rhom, 0)} kg/m³`);
  o += eq(`γ<sub>M</sub> = ${f(mt.gM, 2)} (sytuacja wyjątkowa ${f(mt.gMA, 2)}); k<sub>cr</sub> = ${f(mt.kcr, 2)}; k<sub>m</sub> = ${f(mt.km, 2)}; k<sub>sys</sub> = ${f(mt.ksys, 2)}; k<sub>def</sub> = ${f(mt.kdef, 2)}`, 'tab. 2.3, 3.2; 6.1.6, 6.1.7, 6.6');
  o += u.fdTableHTML();
  return o;
}
function secStatics(R, S, num) {
  const u = U(), md = R.md, st = R.st, W = 860;
  let o = `<h2>${num}. Obciążenia, kombinacje i siły wewnętrzne</h2>`;
  o += `<div class="fig">${u.schemeSVG(W)}</div>`;
  o += `<p>Każde obciążenie zmienne traktowano jako niezależne oddziaływanie i rozpatrzono kombinacje z kolejnymi obciążeniami wiodącymi. Obciążenia zmienne uwzględniano tylko tam, gdzie działają niekorzystnie${S.loads.pattern ? ' (użytkowe i inne zmienne – osobno w każdym przęśle, układ szachownicowy)' : ''}; obciążenia stałe z γ<sub>G,sup</sub> = ${f(S.loads.gG, 2)} (niekorzystnie) lub γ<sub>G,inf</sub> = ${f(S.loads.gGi, 2)} (korzystnie).</p>`;
  o += eq(S.loads.comb === '610' ? `E<sub>d</sub> = Σγ<sub>G</sub>G<sub>k</sub> + γ<sub>Q</sub>Q<sub>k,1</sub> + Σγ<sub>Q</sub>ψ<sub>0,i</sub>Q<sub>k,i</sub>` : `E<sub>d</sub> = max{Σγ<sub>G</sub>G<sub>k</sub> + Σγ<sub>Q</sub>ψ<sub>0,i</sub>Q<sub>k,i</sub>; Σξγ<sub>G</sub>G<sub>k</sub> + γ<sub>Q</sub>Q<sub>k,1</sub> + Σγ<sub>Q</sub>ψ<sub>0,i</sub>Q<sub>k,i</sub>}, ξ = ${f(S.loads.xi, 2)}`, 'PN-EN 1990, 6.10' + (S.loads.comb === '610' ? '' : 'a, 6.10b'));
  o += `<p>Ze względu na k<sub>mod</sub> (3.1.3(2)) kombinacje utworzono w grupach klas trwania obciążenia: w grupie danej klasy są obciążenia o czasie trwania nie krótszym; wytrzymałość obliczeniowa – z k<sub>mod</sub> tej klasy. Decyduje największy stosunek E<sub>d</sub>/R<sub>d</sub> spośród wszystkich grup.</p>`;
  o += `<div class="fig">${u.combosHTML()}</div>`;
  o += `<p>Siły wewnętrzne wyznaczono metodą elementów skończonych dla całej belki (${st.ne} elementów Timoshenki${S.sls.shear ? ', z odkształceniami postaciowymi' : ''}; węzły w podporach, na krawędziach oparć, w punktach przyłożenia sił i na granicach obciążeń), osobno dla każdego obciążenia; analiza liniowo-sprężysta I rzędu, sztywności średnie E<sub>0,mean</sub>, G<sub>mean</sub>. Obwiednie – punkt po punkcie.</p>`;
  const x = Array.from(st.stX), vl = md.sups.map(p => ({ x: p.x, l: p.label }));
  const M = u.envSeries(R.env.uls, 'My', st.stX), Mk = u.envSeries(R.env.char, 'My', st.stX), V = u.envSeries(R.env.uls, 'Vy', st.stX);
  o += `<div class="fig">${u.lineChart({ W, vl, title: 'Momenty zginające M_y [kNm] – obwiednie SGN i charakterystyczne', series: [{ x, y: M.mx, c: '#c0262d', fill: '#e6b3b3', l: 'M_Ed max' }, { x, y: M.mn, c: '#c0262d', fill: '#e6b3b3', l: 'M_Ed min' }, { x, y: Mk.mx, c: '#1d5bb8', dash: '5 3', w: 1.2, l: 'M_k' }, { x, y: Mk.mn, c: '#1d5bb8', dash: '5 3', w: 1.2 }], yl: 'M [kNm]', invert: true, marks: u.extremeMarks(st, M.mx, M.mn, md, '#c0262d', 2) })}</div>`;
  o += `<div class="fig">${u.lineChart({ W, vl, title: 'Siły poprzeczne V_y [kN] – obwiednia SGN', series: [{ x, y: V.mx, c: '#1d5bb8', fill: '#c9d4e6', l: 'V_Ed max' }, { x, y: V.mn, c: '#1d5bb8', fill: '#c9d4e6', l: 'V_Ed min' }], yl: 'V [kN]', marks: u.extremeMarks(st, V.mx, V.mn, md, '#1d5bb8', 2) })}</div>`;
  if (st.need.z) { const Mz = u.envSeries(R.env.uls, 'Mz', st.stX); o += `<div class="fig">${u.lineChart({ W, vl, title: 'Momenty zginające M_z [kNm]', series: [{ x, y: Mz.mx, c: '#6a3fb5', fill: '#b597ee', l: 'M_z,Ed max' }, { x, y: Mz.mn, c: '#6a3fb5', fill: '#b597ee', l: 'M_z,Ed min' }], yl: 'M_z [kNm]', invert: true, marks: u.extremeMarks(st, Mz.mx, Mz.mn, md, '#6a3fb5', 2) })}</div>`; }
  if (st.need.x || st.items.some(q => q.it.N)) { const N = u.envSeries(R.env.uls, 'N', st.stX); o += `<div class="fig">${u.lineChart({ W, vl, title: 'Siła podłużna N [kN] (+ ściskanie)', series: [{ x, y: N.mx, c: '#6a3fb5', fill: '#b597ee', l: 'N_Ed max' }, { x, y: N.mn, c: '#6a3fb5', l: 'N_Ed min' }], yl: 'N [kN]', marks: u.extremeMarks(st, N.mx, N.mn, md, '#6a3fb5', 1) })}</div>`; }
  if (st.need.t) { const T = u.envSeries(R.env.uls, 'T', st.stX); o += `<div class="fig">${u.lineChart({ W, vl, title: 'Momenty skręcające T [kNm]', series: [{ x, y: T.mx, c: '#b5651d', fill: '#e6a35a', l: 'T_Ed max' }, { x, y: T.mn, c: '#b5651d', l: 'T_Ed min' }], yl: 'T [kNm]' })}</div>`; }
  o += `<h3>Reakcje podporowe</h3><div class="fig">${u.reactionsHTML()}</div>`;
  return o;
}
function secChecks(R, S, filt, title, fn) {
  const cs = R.checks.filter(filt);
  if (!cs.length) return '';
  let o = `<h2>${title}</h2>`;
  cs.forEach(c => { const d = BDR.detail(c); o += `<h3>${sym(c.name)}${c.ref ? ` <span class="r">(${esc(c.ref)})</span>` : ''}</h3>${d || eq(`${U().ckCond(c)} – <span class="${c.status}">${U().STL[c.status]}</span>`)}`; });
  if (fn) o += fn();
  return o;
}
function secStab(R) {
  let o = '';
  R.segData.forEach(sd => {
    const z1 = sd.ltb.plus, z2 = sd.ltb.minus;
    const tx = z => z.lef ? `l<sub>ef</sub> = ${f(z.lef / 1000, 2)} m, σ<sub>m,crit</sub> = ${f(z.sigcrit, 1)} MPa, λ<sub>rel,m</sub> = ${f(z.lam, 3)}, k<sub>crit</sub> = ${f(z.kcrit, 3)}` : esc(z.src);
    o += eq(`${esc(sd.seg.label)}: M &gt; 0 – ${tx(z1)}; M &lt; 0 – ${tx(z2)}`);
  });
  return `<h3>Współczynniki zwichrzenia w odcinkach</h3>${o}<p class="note">Sprawdzenie zwichrzenia wykonano tylko w strefach, w których k<sub>crit</sub> &lt; 1 i występuje moment o danym znaku.</p>`;
}
function summary(R, S) {
  if (U().syncTicks) U().syncTicks();
  const ticks = S.meta.ticks || {}, all = R.checks;
  let list = all.filter(c => ticks[c.id]);
  let o = `<h2>Zestawienie wyników</h2>`;
  if (!list.length) { list = all; o += `<p class="note">Żadne sprawdzenie nie zostało odhaczone w Podsumowaniu – zestawiono wszystkie.</p>`; }
  o += `<table class="sched"><tr><th>Sprawdzenie</th><th>Punkt normy</th><th>Warunek</th><th>η</th><th>Status</th></tr>`;
  let grp = '';
  list.forEach(c => {
    if (c.grp !== grp) { grp = c.grp; o += `<tr><td colspan="5"><b>${esc(grp)}</b></td></tr>`; }
    o += `<tr><td>${sym(c.name)}</td><td>${esc(c.ref || '')}</td><td>${U().ckCond(c)}</td><td class="n">${isFinite(c.ratio) ? f(c.ratio * 100, 0) + '%' : '—'}</td><td><span class="${c.status}">${U().STL[c.status]}</span></td></tr>`;
  });
  o += `</table>`;
  const fails = list.filter(c => c.status === 'fail'), mx = Math.max(0, ...list.filter(c => isFinite(c.ratio) && c.status !== 'info' && c.status !== 'warn').map(c => c.ratio));
  o += `<p class="verdict"><span class="${fails.length ? 'fail' : 'ok'}">${fails.length ? `✖ Niespełnione warunki: ${fails.length}. Element wymaga zmiany.` : `✔ Wszystkie przedstawione warunki normowe są spełnione. Maksymalne wykorzystanie η = ${f(mx * 100, 0)}%.`}</span></p>`;
  const w = all.filter(c => c.status === 'warn'); if (w.length) o += `<p class="note">Uwagi: ${w.map(c => sym(c.name)).join('; ')}</p>`;
  return o;
}
BDR.build = function (R, S) {
  const u = U();
  let o = head(R, S, 'Raport obliczeń belki drewnianej');
  o += secData(R, S) + secMat(R, S) + secStatics(R, S, 3);
  let n = 4;
  const add = (filt, title, fn) => { const t = secChecks(R, S, filt, `${n}. ${title}`, fn); if (t) { n++; o += t; } };
  add(c => /^SGN – zginanie/.test(c.grp), 'SGN – zginanie (6.1.6, 6.2)');
  add(c => /^SGN – ścinanie/.test(c.grp), 'SGN – ścinanie i skręcanie (6.1.7, 6.1.8)');
  add(c => /^SGN – docisk/.test(c.grp), 'SGN – docisk w poprzek włókien i podcięcia (6.1.5, 6.5.2)');
  { const has = R.checks.some(c => /^SGN – stateczność/.test(c.grp)); o += `<h2>${n}. SGN – stateczność (6.3)</h2>` + secStab(R); if (has) R.checks.filter(c => /^SGN – stateczność/.test(c.grp)).forEach(c => { o += `<h3>${sym(c.name)} <span class="r">(${esc(c.ref)})</span></h3>${BDR.detail(c)}`; }); else o += `<p>Brak stref wymagających sprawdzenia zwichrzenia lub wyboczenia.</p>`; n++; }
  add(c => /^Słup/.test(c.grp), 'Słupy pod podporami i połączenie z fundamentem (6.3.2, 8.2.3, zał. A)');
  add(c => /ugięcia/.test(c.grp), 'SGU – ugięcia (2.2.3, 7.2)', () => `<div class="fig">${(() => { const st = R.st, md = R.md, x = Array.from(st.stX), w = k => Array.from(R.defl[k], v => v * 1000); return u.lineChart({ W: 860, vl: md.sups.map(p => ({ x: p.x, l: p.label })), title: 'Ugięcia [mm] (przęsła – od cięciwy podpór)', series: [{ x, y: w('instMx'), c: '#a35d00', l: 'w_inst' }, { x, y: w('finMx'), c: '#1d7f3c', fill: '#a6c76a', l: 'w_fin' }, { x, y: w('finMn'), c: '#1d7f3c', w: 1 }], yl: 'w [mm]', invert: true, dp: 1, marks: u.extremeMarks(st, w('finMx'), w('finMn'), md, '#1d7f3c', 1) }); })()}</div>`);
  add(c => /drgania/.test(c.grp), 'SGU – drgania stropu (7.3.3)');
  add(c => /^Pożar/.test(c.grp), `Odporność ogniowa R ${S.fire.R} (PN-EN 1995-1-2, 4.2.2)`);
  add(c => /^Konstrukcja/.test(c.grp), 'Uwagi konstrukcyjne i wykonawcze');
  o += `<h2>${n}. Zestawienie drewna</h2>${u.scheduleHTML()}`;
  o += summary(R, S);
  o += `<p class="note">Obliczenia wykonano programem BelkaDR – narzędziem pomocniczym; wyniki wymagają weryfikacji przez osobę z uprawnieniami budowlanymi.</p>`;
  return o;
};
BDR.buildStatic = function (R, S) {
  return head(R, S, 'Statyka belki') + secData(R, S) + secStatics(R, S, 2);
};
})();
