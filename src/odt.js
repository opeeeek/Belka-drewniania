/* BelkaDR – raport do edytowalnego pliku OpenDocument Text (.odt): LibreOffice/OpenOffice Writer, MS Word.
   HTML raportu → content.xml (nagłówki, akapity, tabele, indeksy, pogrubienia) + rysunki SVG zamienione na PNG; ZIP bez kompresji. */
(function () {
'use strict';
const BDR = window.BDR = window.BDR || {};
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
// archiwum ZIP (metoda STORE); pierwszy plik „mimetype” – wymóg ODF
function zip(files) {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const hdr = [0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    parts.push(new Uint8Array(hdr), name, data);
    cen.push([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)], name);
    off += hdr.length + name.length + data.length;
  });
  let cl = 0; const cparts = []; for (let i = 0; i < cen.length; i += 2) { const h = new Uint8Array(cen[i]); cparts.push(h, cen[i + 1]); cl += h.length + cen[i + 1].length; }
  const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cl), ...u32(off), 0, 0]);
  const all = [...parts, ...cparts, end], len = all.reduce((a, p) => a + p.length, 0), out = new Uint8Array(len);
  let p = 0; all.forEach(a => { out.set(a, p); p += a.length; });
  return out;
}
BDR.zip = zip;
BDR.odt = async function (html, title) {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;'; host.innerHTML = html; document.body.appendChild(host);
  const pics = [];
  const svgPng = async svg => {
    const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
    const w = vb ? vb.width : (+svg.getAttribute('width') || 800), h = vb ? vb.height : (+svg.getAttribute('height') || 400);
    const cl = svg.cloneNode(true); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', w); cl.setAttribute('height', h);
    cl.querySelectorAll('[style]').forEach(el => { const st = el.getAttribute('style'); if (/var\(/.test(st)) el.setAttribute('style', st.replace(/var\(--[^,)]+,\s*([^)]+)\)/g, '$1')); });
    cl.querySelectorAll('.cur,.hit').forEach(n => n.remove());
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl));
    const img = new Image(); await new Promise(res => { img.onload = res; img.onerror = res; img.src = src; });
    const k = 2, cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height); try { cx.drawImage(img, 0, 0, cv.width, cv.height); } catch (e) { /* */ }
    const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const name = `Pictures/r${pics.length + 1}.png`; pics.push({ name, data: u });
    const wcm = Math.min(17, w / 96 * 2.54 * 0.85), hcm = wcm * h / w;
    return `<draw:frame draw:name="r${pics.length}" text:anchor-type="as-char" svg:width="${wcm.toFixed(2)}cm" svg:height="${hcm.toFixed(2)}cm"><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
  };
  const inline = async el => {
    let o = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { o += esc(n.nodeValue.replace(/\s+/g, ' ')); continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === 'svg') { o += await svgPng(n); continue; }
      if (t === 'br') { o += '<text:line-break/>'; continue; }
      if (t === 'input' || t === 'button' && n.classList.contains('lnk')) continue;
      if (t === 'sub') { o += `<text:span text:style-name="Tsub">${await inline(n)}</text:span>`; continue; }
      if (t === 'sup') { o += `<text:span text:style-name="Tsup">${await inline(n)}</text:span>`; continue; }
      if (t === 'b' || t === 'strong' || t === 'th') { o += `<text:span text:style-name="Tb">${await inline(n)}</text:span>`; continue; }
      if (n.classList && (n.classList.contains('ok') || n.classList.contains('fail') || n.classList.contains('warn'))) { o += `<text:span text:style-name="${n.classList.contains('ok') ? 'Tok' : n.classList.contains('fail') ? 'Tfail' : 'Twarn'}">${await inline(n)}</text:span>`; continue; }
      if (n.classList && n.classList.contains('r')) { o += `<text:tab/>${await inline(n)}`; continue; }
      o += await inline(n);
    }
    return o;
  };
  let body = `<text:p text:style-name="Title">${esc(title || 'Raport obliczeń')}</text:p>`;
  const block = async el => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) body += `<text:p text:style-name="Body">${esc(n.nodeValue.trim())}</text:p>`; continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName.toLowerCase();
      if (t === 'br') continue;
      if (/^h[1-4]$/.test(t)) { body += `<text:h text:style-name="H${t[1]}" text:outline-level="${Math.max(1, +t[1] - 1)}">${await inline(n)}</text:h>`; continue; }
      if (t === 'table') {
        if (n.classList.contains('pwrap')) { const tb = n.querySelector('td.pbody'); if (tb) await block(tb); continue; }
        const rows = [...n.querySelectorAll('tr')]; if (!rows.length) continue;
        const nc = Math.max(...rows.map(r => [...r.children].reduce((a, c) => a + (+c.getAttribute('colspan') || 1), 0)));
        body += `<table:table table:style-name="Tab"><table:table-column table:number-columns-repeated="${nc}"/>`;
        for (const r of rows) {
          body += '<table:table-row>';
          let used = 0;
          for (const c of r.children) { const cs = +c.getAttribute('colspan') || 1; used += cs; body += `<table:table-cell table:style-name="Cell" office:value-type="string"${cs > 1 ? ` table:number-columns-spanned="${cs}"` : ''}><text:p text:style-name="${c.tagName === 'TH' ? 'Th' : 'Td'}">${await inline(c)}</text:p></table:table-cell>`; for (let k = 1; k < cs; k++) body += '<table:covered-table-cell/>'; }
          for (; used < nc; used++) body += '<table:table-cell table:style-name="Cell"/>';
          body += '</table:table-row>';
        }
        body += '</table:table>'; continue;
      }
      if (t === 'div' && (n.classList.contains('fig') || n.classList.contains('tscroll'))) { if (n.querySelector('table') && !n.querySelector('svg')) { await block(n); continue; } body += `<text:p text:style-name="Fig">${await inline(n)}</text:p>`; continue; }
      if (t === 'ul' || t === 'ol') { for (const li of n.children) body += `<text:p text:style-name="Li">• ${await inline(li)}</text:p>`; continue; }
      if (t === 'div' && n.children.length && [...n.children].some(c => /^(h[1-4]|table|div|p|ul|ol)$/i.test(c.tagName)) && !n.classList.contains('eq')) { await block(n); continue; }
      const st = n.classList.contains('eq') ? 'Eq' : n.classList.contains('note') ? 'Note' : n.classList.contains('verdict') ? 'Verdict' : 'Body';
      const tx = await inline(n); if (tx.trim()) body += `<text:p text:style-name="${st}">${tx}</text:p>`;
    }
  };
  try { await block(host); } finally { host.remove(); }
  const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"';
  const ps = (n, o) => `<style:style style:name="${n}" style:family="paragraph"><style:paragraph-properties fo:margin-top="${o.mt || '0cm'}" fo:margin-bottom="${o.mb || '0.1cm'}"${o.ml ? ` fo:margin-left="${o.ml}"` : ''}${o.tab ? '><style:tab-stops><style:tab-stop style:position="16.5cm" style:type="right"/></style:tab-stops></style:paragraph-properties>' : '/>'}<style:text-properties fo:font-size="${o.fs || '10pt'}"${o.b ? ' fo:font-weight="bold"' : ''}${o.c ? ` fo:color="${o.c}"` : ''}${o.it ? ' fo:font-style="italic"' : ''}/></style:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Calibri" fo:font-family="Calibri, Arial, sans-serif" fo:font-size="10pt" fo:language="pl" fo:country="PL"/></style:default-style></office:styles><office:automatic-styles><style:page-layout style:name="PL"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="1.8cm" fo:margin-bottom="1.8cm" fo:margin-left="2cm" fo:margin-right="1.8cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL"/></office:master-styles></office:document-styles>`;
  const auto = ps('Title', { fs: '16pt', b: true, mb: '0.3cm' }) + ps('H1', { fs: '15pt', b: true, mt: '0.3cm' }) + ps('H2', { fs: '13pt', b: true, mt: '0.45cm', mb: '0.15cm' }) + ps('H3', { fs: '11pt', b: true, mt: '0.3cm' }) + ps('H4', { fs: '10pt', b: true }) +
    ps('Body', {}) + ps('Eq', { ml: '0.5cm', tab: true }) + ps('Note', { fs: '9pt', it: true }) + ps('Verdict', { fs: '11pt', b: true, mt: '0.3cm' }) + ps('Li', { ml: '0.4cm' }) + ps('Fig', { mt: '0.2cm', mb: '0.2cm' }) + ps('Th', { fs: '9pt', b: true }) + ps('Td', { fs: '9pt' }) +
    `<style:style style:name="Tsub" style:family="text"><style:text-properties style:text-position="sub 58%"/></style:style><style:style style:name="Tsup" style:family="text"><style:text-properties style:text-position="super 58%"/></style:style><style:style style:name="Tb" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>` +
    `<style:style style:name="Tok" style:family="text"><style:text-properties fo:color="#1d7f3c" fo:font-weight="bold"/></style:style><style:style style:name="Tfail" style:family="text"><style:text-properties fo:color="#c0262d" fo:font-weight="bold"/></style:style><style:style style:name="Twarn" style:family="text"><style:text-properties fo:color="#a35d00" fo:font-weight="bold"/></style:style>` +
    `<style:style style:name="Tab" style:family="table"><style:table-properties style:width="17cm" table:align="left" fo:margin-top="0.15cm" fo:margin-bottom="0.15cm"/></style:style><style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.05cm" fo:border="0.5pt solid #9aa3b0"/></style:style>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:automatic-styles>${auto}</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>${pics.map(p => `<manifest:file-entry manifest:full-path="${p.name}" manifest:media-type="image/png"/>`).join('')}</manifest:manifest>`;
  const meta = `<?xml version="1.0" encoding="UTF-8"?><office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2"><office:meta><meta:generator>BelkaDR 1.0</meta:generator><dc:title>${esc(title || '')}</dc:title><meta:creation-date>${new Date().toISOString().slice(0, 19)}</meta:creation-date></office:meta></office:document-meta>`;
  return zip([{ name: 'mimetype', data: 'application/vnd.oasis.opendocument.text' }, { name: 'META-INF/manifest.xml', data: manifest }, { name: 'content.xml', data: content }, { name: 'styles.xml', data: styles }, { name: 'meta.xml', data: meta }, ...pics]);
};
})();
