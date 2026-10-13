import { normalizeNomeAlimento } from '../normalizeNomeAlimento';
import type { DuplicateMatchRef, ImportedFoodDraft } from './types';

type DupCandidate = {
  id: string;
  nome: string;
  nomeNormalizado: string;
  codigoOriginal?: string | null;
  codigoPreparacao?: string | null;
  nomeCientifico?: string | null;
  marca?: string | null;
  preparo?: string | null;
  processamento?: string | null;
};

export function findDuplicateMatches(opts: {
  item: Pick<
    ImportedFoodDraft,
    | 'id'
    | 'nome'
    | 'nomeNormalizado'
    | 'codigoOriginal'
    | 'codigoPreparacao'
    | 'nomeCientifico'
    | 'marca'
    | 'preparo'
    | 'processamento'
  >;
  importPeers: DupCandidate[];
  globalPeers: DupCandidate[];
}): DuplicateMatchRef[] {
  const matches: DuplicateMatchRef[] = [];
  const norm = opts.item.nomeNormalizado || normalizeNomeAlimento(opts.item.nome);
  const codigo = (opts.item.codigoOriginal || '').trim().toLowerCase();
  const prepCode = (opts.item.codigoPreparacao || '').trim().toLowerCase();
  const preparo = (opts.item.preparo || '').trim().toLowerCase();

  const check = (peer: DupCandidate, scope: 'import' | 'global') => {
    if (peer.id === opts.item.id) return;
    const reasons: string[] = [];
    const peerCodigo = (peer.codigoOriginal || '').trim().toLowerCase();
    const peerPrepCode = (peer.codigoPreparacao || '').trim().toLowerCase();
    const peerPreparo = (peer.preparo || '').trim().toLowerCase();

    if (codigo && peerCodigo && codigo === peerCodigo) {
      // IBGE: mesmo código + preparações diferentes = registros DISTINTOS
      if (prepCode || peerPrepCode) {
        if (prepCode && peerPrepCode && prepCode === peerPrepCode) {
          reasons.push('codigoOriginal+codigoPreparacao');
        }
      } else if (preparo || peerPreparo) {
        if (preparo && peerPreparo && preparo === peerPreparo) {
          reasons.push('codigoOriginal+preparo');
        } else if (!preparo || !peerPreparo) {
          reasons.push('codigoOriginal');
        }
      } else {
        reasons.push('codigoOriginal');
      }
    }
    if (norm && peer.nomeNormalizado && norm === peer.nomeNormalizado) {
      // Nome igual só conta como duplicata se preparação também bater (quando existe)
      if (prepCode && peerPrepCode && prepCode !== peerPrepCode) {
        // variantes distintas — não marcar só por nome
      } else if (preparo && peerPreparo && preparo !== peerPreparo) {
        // variantes distintas
      } else {
        reasons.push('nomeNormalizado');
      }
    }
    const cientifico = (opts.item.nomeCientifico || '').trim().toLowerCase();
    const peerCientifico = (peer.nomeCientifico || '').trim().toLowerCase();
    if (cientifico && peerCientifico && cientifico === peerCientifico) {
      reasons.push('nomeCientifico');
    }
    const marca = (opts.item.marca || '').trim().toLowerCase();
    const peerMarca = (peer.marca || '').trim().toLowerCase();
    if (marca && peerMarca && marca === peerMarca && reasons.includes('nomeNormalizado')) {
      reasons.push('marca');
    }
    if (reasons.length === 0) return;
    matches.push({
      scope,
      id: peer.id,
      nome: peer.nome,
      codigoOriginal: peer.codigoOriginal,
      reason: reasons.join('+'),
    });
  };

  for (const p of opts.importPeers) check(p, 'import');
  for (const p of opts.globalPeers) check(p, 'global');
  return matches;
}
