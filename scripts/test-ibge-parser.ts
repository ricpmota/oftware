import fs from 'fs';
import {
  parseIbgeTabela1FromText,
  hasFoodTableSignals,
  detectIbgeTableKind,
} from '../lib/metaadmingeral/alimentosGlobais/importacao/parseIbgeTabela1';

const t = fs.readFileSync('tmp/etapa03_1/A_chunkText.txt', 'utf8');
console.log('signals', hasFoodTableSignals(t));
console.log('kind', detectIbgeTableKind(t));
const foods = parseIbgeTabela1FromText(t);
console.log('count', foods.length);
const batata = foods.filter((f) => f.codigoOriginal === '6400101');
console.log('batata count', batata.length);
const cozido = batata.find((f) => f.valoresOriginais?.codigoPreparacao === '2');
console.log('cozido', JSON.stringify(cozido, null, 2));
console.log(
  'first5',
  foods.slice(0, 5).map((f) => ({
    c: f.codigoOriginal,
    n: f.nome,
    p: f.preparo,
    prepCode: f.valoresOriginais?.codigoPreparacao,
    kcal: f.nutrientes?.energiaKcal,
  }))
);
