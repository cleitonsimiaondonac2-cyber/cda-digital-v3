/* Equivalente Node de `rsync -a --delete site/ docs/` (build.sh).
   Uso: node sync-docs.js [<src> <dst>] [--apply] */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const pos = args.filter(a => !a.startsWith('--'));
const SRC = pos[0] || 'C:\\Users\\Dev\\CDA\\cda-digital\\site';
const DST = pos[1] || 'C:\\Users\\Dev\\CDA\\cda-digital\\docs';

let copied = 0, deleted = 0, kept = 0;

function walk(dir, base, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = base ? path.join(base, e.name) : e.name;
    if (e.isDirectory()) walk(full, rel, fn);
    else fn(full, rel);
  }
}

// 1) copia/atualiza
walk(SRC, '', (full, rel) => {
  const target = path.join(DST, rel);
  const t = fs.existsSync(target) ? fs.readFileSync(target) : null;
  const s = fs.readFileSync(full);
  if (!t || !t.equals(s)) {
    console.log('copy  ' + rel);
    if (apply) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(full, target); }
    copied++;
  } else kept++;
});

// 2) remove o que já não existe na origem
walk(DST, '', (full, rel) => {
  const src = path.join(SRC, rel);
  if (!fs.existsSync(src)) {
    console.log('del   ' + rel);
    if (apply) fs.unlinkSync(full);
    deleted++;
  }
});

console.log(`\ncopiados: ${copied} · removidos: ${deleted} · inalterados: ${kept}`);
console.log(apply ? 'APLICADO.' : 'DRY-RUN (usa --apply para gravar).');
