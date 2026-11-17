// Budowanie aplikacji BelkaDR do jednego pliku HTML (dist/BelkaDR.html) – jak BelkaZB: style i skrypty osadzone.
// Uruchomienie: node tools/build.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = p => fs.readFileSync(path.join(root, 'src', p), 'utf8');
const uiDir = path.join(root, 'src', 'ui');
const ui = fs.readdirSync(uiDir).filter(f => f.endsWith('.js')).sort().map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(uiDir, f), 'utf8')).join('\n');
const opt = f => fs.existsSync(path.join(root, 'src', f)) ? src(f) : '';
const parts = {
  CSS: src('style.css') + '\n' + opt('style_dr.css'),
  ENGINE: src('engine.js'),
  NORM: opt('norm.js'),
  UI: `/* BelkaDR – interfejs użytkownika */\n(function () {\n'use strict';\n${ui}\n})();`,
  REPORT: opt('report.js'),
  ODT: opt('odt.js'),
  DXF: opt('dxf.js'),
};
let html = src('index.html');
for (const [k, v] of Object.entries(parts)) {
  const tag = `/*@@${k}@@*/`;
  if (!html.includes(tag)) throw new Error('Brak znacznika ' + tag);
  html = html.split(tag).join(v.replace(/<\/script/gi, '<\\/script'));
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'BelkaDR.html'), html);
fs.mkdirSync(path.join(root, 'host'), { recursive: true });
fs.writeFileSync(path.join(root, 'host', 'BelkaDR.html'), html);
console.log('dist/BelkaDR.html', (html.length / 1024).toFixed(0) + ' kB');
