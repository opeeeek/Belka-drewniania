/* BelkaDR – eksport rysunku belki do pliku DXF (AutoCAD R12, ASCII), jednostki: mm, skala 1:1.
   Warstwy: BELKA (zarys elementu), PODPORY, OSIE, PODCIECIA, STEZENIA, WYMIARY, PRZEKROJ, OPISY. */
(function () {
'use strict';
const BDD = window.BDD = {};
BDD.build = function (R, S) {
  const md = R.md, L = [];
  const n = v => (Math.round(v * 1000) / 1000).toFixed(3);
  const line = (x1, y1, x2, y2, lay) => L.push('0', 'LINE', '8', lay, '10', n(x1), '20', n(y1), '30', '0.0', '11', n(x2), '21', n(y2), '31', '0.0');
  const rect = (x, y, w, h, lay) => { line(x, y, x + w, y, lay); line(x + w, y, x + w, y + h, lay); line(x + w, y + h, x, y + h, lay); line(x, y + h, x, y, lay); };
  const PL = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z', Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z', '–': '-', '×': 'x', '·': '.' };
  const text = (x, y, h, s, lay, al) => { const t = String(s).replace(/[\r\n]+/g, ' ').replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–×·]/g, c => PL[c]).replace(/[^\x20-\x7e]/g, '?'); L.push('0', 'TEXT', '8', lay, '10', n(x), '20', n(y), '30', '0.0', '40', n(h), '1', t); if (al) L.push('72', '1', '11', n(x), '21', n(y), '31', '0.0'); };
  const circle = (x, y, r, lay) => L.push('0', 'CIRCLE', '8', lay, '10', n(x), '20', n(y), '30', '0.0', '40', n(r));
  const dimH = (x1, x2, y, s) => { line(x1, y, x2, y, 'WYMIARY'); line(x1, y - 40, x1, y + 40, 'WYMIARY'); line(x2, y - 40, x2, y + 40, 'WYMIARY'); line(x1 - 25, y - 25, x1 + 25, y + 25, 'WYMIARY'); line(x2 - 25, y - 25, x2 + 25, y + 25, 'WYMIARY'); text((x1 + x2) / 2, y + 30, 60, s, 'WYMIARY', true); };
  const X = x => (x + md.extL) * 1000;           // mm od lewego końca elementu
  const hmax = Math.max(...md.segs.map(s => s.h));
  // zarys belki (oparcie dolną krawędzią na y = 0)
  md.segs.forEach((sg, i) => {
    let xa = X(sg.x0), xb = X(sg.x1);
    if (i === 0) xa -= md.extL * 1000; if (i === md.segs.length - 1) xb += md.extR * 1000;
    rect(xa, 0, xb - xa, sg.h, 'BELKA');
  });
  // podpory, osie, podcięcia
  md.sups.forEach(p => {
    const xx = X(p.x);
    rect(xx - p.t / 2, -60, p.t, 60, 'PODPORY');
    line(xx, -300, xx, hmax + 200, 'OSIE');
    text(xx, -220, 80, p.label, 'OPISY', true);
    if (p.notch && p.notch.on) {
      const sg = p.segR || p.segL, h = sg.h, hef = p.notch.hef > 0 ? Math.min(p.notch.hef, h) : h, dir = p.segR ? 1 : -1;
      const xe = p.segR ? xx - (p.i === 0 ? md.extL * 1000 : 0) : xx + (p.i === md.sups.length - 1 ? md.extR * 1000 : 0);
      const xc = xx + dir * (p.notch.x > 0 ? p.notch.x : p.t / 2);
      const y0 = p.notch.side === 'top' ? hef : 0;
      rect(Math.min(xe, xc), y0, Math.abs(xc - xe), h - hef, 'PODCIECIA');
      text(xc, y0 + (h - hef) / 2, 40, `h_ef=${Math.round(hef)}`, 'OPISY');
    }
  });
  // przeguby, stężenia
  S.nodes.forEach(nd => { const sg = md.segs[nd.seg]; if (!sg || !nd.hinge) return; const xx = X(sg.x0 + nd.a); line(xx, 0, xx, sg.h, 'OPISY'); circle(xx, sg.h / 2, 30, 'OPISY'); });
  if (S.ltb.on && S.ltb.top > 0) md.segs.forEach(sg => { for (let x = sg.x0 + S.ltb.top; x < sg.x1 - 1e-6; x += S.ltb.top) { const xx = X(x); line(xx - 40, hmax + 120, xx, hmax + 30, 'STEZENIA'); line(xx, hmax + 30, xx + 40, hmax + 120, 'STEZENIA'); } });
  // słupy pod podporami ze stopami (oś słupa w osi podpory, czoło słupa pod spodem belki)
  let yLow = 0;
  md.sups.forEach(p => {
    const c0 = S.supCfg[p.i] && S.supCfg[p.i].col; if (!c0 || !c0.on) return;
    const c = window.EC5.normCol(c0), xx = X(p.x), Lc = c.L * 1000, yB = -60 - Lc;
    rect(xx - c.h / 2, yB, c.h, Lc, 'SLUPY');
    const yP = yB - c.gap - 15;
    rect(xx - c.pa / 2, yP, c.pa, 15, 'STOPY');
    const plH = c.a3 + (c.n - 1) * c.a1 + c.e1p + c.gap;
    rect(xx - (c.h - 20) / 2, yP + 15, c.h - 20, plH, 'STOPY');
    const xs = c.m === 1 ? [0] : Array.from({ length: c.m }, (_, j) => -(c.m - 1) * c.a2 / 2 + j * c.a2);
    for (let i = 0; i < c.n; i++) xs.forEach(dx => circle(xx + dx, yB + c.a3 + i * c.a1, c.d / 2, 'STOPY'));
    const na = c.na, ax = na === 1 ? [0] : Array.from({ length: na }, (_, i) => -c.pa / 2 + 35 + (c.pa - 70) * i / (na - 1));
    ax.forEach(dx => line(xx + dx, yP + 15, xx + dx, yP - 250, 'STOPY'));
    rect(xx - c.pa / 2 - 150, yP - 400, c.pa + 300, 400, 'FUNDAMENT');
    text(xx + c.h / 2 + 40, yB + Lc / 2, 50, `SLUP ${Math.round(c.b)}x${Math.round(c.h)}, H=${Math.round(Lc)}`, 'OPISY');
    text(xx + c.h / 2 + 40, yB + Lc / 2 - 80, 40, `${c.type === 'slot' ? 'blacha wpuszczana' : 'blachy zewn.'} t=${c.ts}, ${c.n * c.m}x fi${c.d}, ${c.na} kotwy`, 'OPISY');
    yLow = Math.min(yLow, yP - 400);
  });
  // wymiary
  let y = Math.min(-500, yLow - 300);
  md.segs.forEach(sg => dimH(X(sg.x0), X(sg.x1), y, String(Math.round(sg.L * 1000))));
  y -= 300; dimH(0, md.Lmember * 1000, y, `${Math.round(md.Lmember * 1000)}`);
  line(-250, 0, -250, md.segs[0].h, 'WYMIARY'); text(-300, md.segs[0].h / 2, 60, String(Math.round(md.segs[0].h)), 'WYMIARY');
  // przekrój
  const sec = md.segs[0].sec, sx = md.Lmember * 1000 + 800;
  const bw = sec.b / sec.n;
  for (let k = 0; k < sec.n; k++) rect(sx + k * bw, 0, bw, sec.h, 'PRZEKROJ');
  line(sx - 100, sec.h / 2, sx + sec.b + 100, sec.h / 2, 'OSIE'); line(sx + sec.b / 2, -100, sx + sec.b / 2, sec.h + 100, 'OSIE');
  text(sx, sec.h + 150, 60, `PRZEKROJ ${sec.n > 1 ? sec.n + 'x' : ''}${Math.round(sec.b1)}x${Math.round(sec.h)}`, 'OPISY');
  if (R.fireData && R.fireData.segs[0] && R.fireData.segs[0].bfi > 0) { const q = R.fireData.segs[0]; rect(sx + (sec.b - q.bfi) / 2, S.fire.sides === 4 ? (sec.h - q.hfi) / 2 : 0, q.bfi, q.hfi, 'PRZEKROJ_POZAR'); text(sx, -200, 50, `R${S.fire.R}: ${Math.round(q.bfi)}x${Math.round(q.hfi)}`, 'OPISY'); }
  // opis
  const mt = R.mt;
  text(0, hmax + 450, 100, `${S.meta.name || 'Belka'} - ${mt.m.name} ${sec.n > 1 ? sec.n + 'x' : ''}${Math.round(sec.b1)}x${Math.round(sec.h)} mm, L = ${Math.round(md.Lmember * 1000)} mm`, 'OPISY');
  text(0, hmax + 320, 60, `Klasa uzytkowania ${S.env.sc}; eta max = ${Math.round(R.maxEta * 100)}%; BelkaDR`, 'OPISY');
  const layers = [['BELKA', 7, 'CONTINUOUS'], ['PODPORY', 8, 'CONTINUOUS'], ['OSIE', 1, 'DASHDOT'], ['PODCIECIA', 1, 'CONTINUOUS'], ['STEZENIA', 3, 'CONTINUOUS'], ['WYMIARY', 4, 'CONTINUOUS'], ['PRZEKROJ', 7, 'CONTINUOUS'], ['PRZEKROJ_POZAR', 1, 'DASHED'], ['OPISY', 2, 'CONTINUOUS'], ['SLUPY', 30, 'CONTINUOUS'], ['STOPY', 8, 'CONTINUOUS'], ['FUNDAMENT', 9, 'CONTINUOUS']];
  const H = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSBASE', '10', '0.0', '20', '0.0', '30', '0.0', '9', '$EXTMIN', '10', '-1000.0', '20', n(Math.min(-1500, y - 400)), '30', '0.0', '9', '$EXTMAX', '10', n(md.Lmember * 1000 + 2000), '20', n(hmax + 1000), '30', '0.0', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LTYPE', '70', '3',
    '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
    '0', 'LTYPE', '2', 'DASHED', '70', '0', '3', '__ __ __', '72', '65', '73', '2', '40', '30.0', '49', '20.0', '49', '-10.0',
    '0', 'LTYPE', '2', 'DASHDOT', '70', '0', '3', '__ . __ .', '72', '65', '73', '4', '40', '50.0', '49', '30.0', '49', '-8.0', '49', '0.0', '49', '-12.0',
    '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(layers.length)];
  layers.forEach(([nm, col, lt]) => H.push('0', 'LAYER', '2', nm, '70', '0', '62', String(col), '6', lt));
  H.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
  return H.concat(L, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
};
})();
