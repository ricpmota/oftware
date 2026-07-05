import { readFileSync } from 'fs';

import { join } from 'path';

import type { Firestore } from 'firebase-admin/firestore';

import {

  nomeComPasta,

  PASTAS_PADRAO_PROTOCOLO,

  tituloExibicaoPrescricao,

} from '@/lib/prescricao/prescricaoCatalogoDefaults';



const COL_PRESCRICOES = 'prescricoes';

const COL_PASTAS = 'prescricao_pastas';

const SISTEMA_MEDICO_ID = 'SISTEMA';



export type ProtocoloImportacaoItem = {

  pastaMae: string;

  pasta: string;

  nome: string;

  conteudo: string;

  observacoes?: string;

};



export type ProtocoloImportacaoArquivo = {

  catalogoAba: 'protocolo';

  pastaMae: string;

  medicoId: string;

  isTemplate: boolean;

  protocolos: ProtocoloImportacaoItem[];

};



export type ImportarProtocolosResultado = {

  pastasCriadas: number;

  pastasExistentes: number;

  protocolosCriados: number;

  protocolosAtualizados: number;

  protocolosIgnorados: number;

  pastas: { nome: string; id: string }[];

};



export function carregarProtocolosImportacaoJson(

  caminho = join(process.cwd(), 'lib/prescricao/protocolos_importacao_oftware.json')

): ProtocoloImportacaoArquivo {

  const raw = readFileSync(caminho, 'utf-8');

  return JSON.parse(raw) as ProtocoloImportacaoArquivo;

}



function chaveProtocolo(pastaNome: string, nome: string): string {

  return `${pastaNome.trim()}|${nome.trim()}`;

}



function extrairPastaNomeDoDoc(data: Record<string, unknown>): string {

  if (typeof data.pastaNome === 'string' && data.pastaNome.trim()) {

    return data.pastaNome.trim();

  }

  const nome = String(data.nome ?? '');

  if (nome.includes(' — ')) return nome.split(' — ')[0].trim();

  return '';

}



async function ensurePastasProtocolo(db: Firestore): Promise<{

  pastaIdPorNome: Map<string, string>;

  pastasCriadas: number;

  pastasExistentes: number;

}> {

  const snap = await db

    .collection(COL_PASTAS)

    .where('medicoId', '==', SISTEMA_MEDICO_ID)

    .where('catalogoAba', '==', 'protocolo')

    .get();



  const pastaIdPorNome = new Map<string, string>();

  for (const doc of snap.docs) {

    pastaIdPorNome.set(String(doc.data().nome), doc.id);

  }



  const now = new Date();

  let pastasCriadas = 0;



  for (const p of PASTAS_PADRAO_PROTOCOLO) {

    if (pastaIdPorNome.has(p.nome)) continue;

    const ref = await db.collection(COL_PASTAS).add({

      medicoId: SISTEMA_MEDICO_ID,

      catalogoAba: 'protocolo',

      nome: p.nome,

      ordem: p.ordem,

      sistemaPadrao: true,

      criadoEm: now,

      atualizadoEm: now,

    });

    pastaIdPorNome.set(p.nome, ref.id);

    pastasCriadas++;

  }



  return {

    pastaIdPorNome,

    pastasCriadas,

    pastasExistentes: PASTAS_PADRAO_PROTOCOLO.length - pastasCriadas,

  };

}



function buildProtocoloDoc(

  pastaNome: string,

  pastaId: string,

  item: ProtocoloImportacaoItem,

  now: Date,

  criadoEm?: Date

) {

  const data: Record<string, unknown> = {

    medicoId: SISTEMA_MEDICO_ID,

    nome: nomeComPasta(pastaNome, item.nome.trim()),

    descricao: item.conteudo.trim(),

    itens: [],

    observacoes: (item.observacoes ?? '').trim(),

    isTemplate: true,

    criadoPor: SISTEMA_MEDICO_ID,

    catalogoAba: 'protocolo',

    pastaId,

    pastaNome,

    atualizadoEm: now,

  };

  data.criadoEm = criadoEm ?? now;

  return data;

}



export async function importarProtocolosOftware(

  db: Firestore,

  dados?: ProtocoloImportacaoArquivo

): Promise<ImportarProtocolosResultado> {

  const arquivo = dados ?? carregarProtocolosImportacaoJson();

  const { pastaIdPorNome, pastasCriadas, pastasExistentes } = await ensurePastasProtocolo(db);



  const itensSnap = await db

    .collection(COL_PRESCRICOES)

    .where('medicoId', '==', SISTEMA_MEDICO_ID)

    .where('isTemplate', '==', true)

    .get();



  const existentesPorChave = new Map<string, { id: string; criadoEm: Date }>();

  for (const doc of itensSnap.docs) {

    const data = doc.data();

    if ((data.catalogoAba || 'prescricao') !== 'protocolo') continue;



    const pastaNome = extrairPastaNomeDoDoc(data as Record<string, unknown>);

    const titulo = tituloExibicaoPrescricao(String(data.nome ?? ''));

    if (!pastaNome || !titulo) continue;



    existentesPorChave.set(chaveProtocolo(pastaNome, titulo), {

      id: doc.id,

      criadoEm: data.criadoEm?.toDate?.() ?? new Date(),

    });

  }



  let protocolosCriados = 0;

  let protocolosAtualizados = 0;

  let protocolosIgnorados = 0;

  const now = new Date();



  for (const item of arquivo.protocolos) {

    const pastaNome = item.pasta.trim();

    const pastaId = pastaIdPorNome.get(pastaNome);

    if (!pastaId) {

      throw new Error(`Pasta não encontrada para importação: "${pastaNome}"`);

    }



    const chave = chaveProtocolo(pastaNome, item.nome.trim());

    const existente = existentesPorChave.get(chave);



    if (existente) {

      await db

        .collection(COL_PRESCRICOES)

        .doc(existente.id)

        .update(

          buildProtocoloDoc(pastaNome, pastaId, item, now, existente.criadoEm)

        );

      protocolosAtualizados++;

      continue;

    }



    const ref = await db.collection(COL_PRESCRICOES).add(

      buildProtocoloDoc(pastaNome, pastaId, item, now)

    );

    existentesPorChave.set(chave, { id: ref.id, criadoEm: now });

    protocolosCriados++;

  }



  const pastas = PASTAS_PADRAO_PROTOCOLO.map((p) => ({

    nome: p.nome,

    id: pastaIdPorNome.get(p.nome) ?? '',

  }));



  return {

    pastasCriadas,

    pastasExistentes,

    protocolosCriados,

    protocolosAtualizados,

    protocolosIgnorados,

    pastas,

  };

}

export type LimparProtocolosLegadosResultado = {
  protocolosRemovidos: number;
  protocolosMantidos: number;
  removidos: { id: string; nome: string; pastaNome: string }[];
};

function chavesProtocolosCanonicos(dados?: ProtocoloImportacaoArquivo): Set<string> {
  const arquivo = dados ?? carregarProtocolosImportacaoJson();
  const keys = new Set<string>();
  for (const item of arquivo.protocolos) {
    keys.add(chaveProtocolo(item.pasta.trim(), item.nome.trim()));
  }
  return keys;
}

/** Remove protocolos SISTEMA da aba Protocolo que não estão no JSON canônico atual. */
export async function limparProtocolosLegadosOftware(
  db: Firestore,
  dados?: ProtocoloImportacaoArquivo
): Promise<LimparProtocolosLegadosResultado> {
  const canonicos = chavesProtocolosCanonicos(dados);

  const itensSnap = await db
    .collection(COL_PRESCRICOES)
    .where('medicoId', '==', SISTEMA_MEDICO_ID)
    .where('isTemplate', '==', true)
    .get();

  let protocolosRemovidos = 0;
  let protocolosMantidos = 0;
  const removidos: { id: string; nome: string; pastaNome: string }[] = [];

  for (const doc of itensSnap.docs) {
    const data = doc.data();
    if ((data.catalogoAba || 'prescricao') !== 'protocolo') continue;

    const pastaNome = extrairPastaNomeDoDoc(data as Record<string, unknown>);
    const titulo = tituloExibicaoPrescricao(String(data.nome ?? ''));
    if (!pastaNome || !titulo) continue;

    if (canonicos.has(chaveProtocolo(pastaNome, titulo))) {
      protocolosMantidos++;
      continue;
    }

    await doc.ref.delete();
    protocolosRemovidos++;
    removidos.push({
      id: doc.id,
      nome: String(data.nome ?? ''),
      pastaNome,
    });
  }

  return { protocolosRemovidos, protocolosMantidos, removidos };
}

