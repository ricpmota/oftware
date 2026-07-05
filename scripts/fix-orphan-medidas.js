const fs = require('fs');
const p = 'c:/oftware/app/metaadmin/page.tsx';
let c = fs.readFileSync(p, 'utf8');
const marker1 = '{pastaAtiva === 10 && pacienteEditando && (';
const marker2 = '<ProntuarioTab paciente={pacienteEditando}';
const first = c.indexOf(marker1);
const prontuario = c.indexOf(marker2);
if (first === -1 || prontuario === -1) {
  console.error('markers not found', first, prontuario);
  process.exit(1);
}
// Remove duplicate block before ProntuarioTab
const lineStart = c.lastIndexOf('\n', prontuario) + 1;
const prontuarioBlockStart = c.lastIndexOf(marker1, prontuario);
if (prontuarioBlockStart === first && first < prontuario) {
  // Remove from first occurrence to just before prontuarioBlockStart's line... 
  // first is wrong block, prontuarioBlockStart is correct one
  const removeEnd = c.lastIndexOf('\n', prontuarioBlockStart);
  const removeStart = c.lastIndexOf('\n', first - 1) + 1;
  c = c.slice(0, removeStart) + c.slice(removeEnd + 1);
  fs.writeFileSync(p, c);
  console.log('removed bytes', removeEnd - removeStart);
} else {
  console.log('unexpected', { first, prontuarioBlockStart, prontuario });
}
