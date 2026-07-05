import {
  OFTREVIEW_APOSTILAS_GCS_PREFIX,
  type AlternativaLetra,
  type OftpayQuestao,
  type OftpayQuestaoAlternativa,
  type QuestaoDificuldade,
  type QuestaoStatus,
} from '@/types/oftpayQuestoes';
import {
  OFTPAY_QUESTOES_COURSE_ID,
  QUESTAO_ALTERNATIVA_LETRAS,
  QUESTAO_ALTERNATIVA_MAX,
  QUESTAO_ALTERNATIVA_MIN,
  QUESTAO_DIFICULDADES,
  QUESTAO_STATUS_VALUES,
} from './questoesConstants';

export type ValidateOftpayQuestaoResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function trim(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function isQuestaoDificuldade(value: unknown): value is QuestaoDificuldade {
  return typeof value === 'string' && (QUESTAO_DIFICULDADES as readonly string[]).includes(value);
}

function isQuestaoStatus(value: unknown): value is QuestaoStatus {
  return typeof value === 'string' && (QUESTAO_STATUS_VALUES as readonly string[]).includes(value);
}

function isAlternativaLetra(value: unknown): value is AlternativaLetra {
  return typeof value === 'string' && (QUESTAO_ALTERNATIVA_LETRAS as readonly string[]).includes(value);
}

/** Rascunho inicial para formulário de criação (sem persistência). */
export function createEmptyOftpayQuestaoDraft(criadoPor: string): OftpayQuestao {
  const alternativas: OftpayQuestaoAlternativa[] = QUESTAO_ALTERNATIVA_LETRAS.slice(
    0,
    QUESTAO_ALTERNATIVA_MIN
  ).map((letra) => ({
    letra,
    texto: '',
    correta: false,
  }));

  return {
    courseId: OFTPAY_QUESTOES_COURSE_ID,
    tema: '',
    enunciado: '',
    alternativas,
    explicacao: '',
    dificuldade: 'medio',
    status: 'rascunho',
    fonte: {
      apostilaTitulo: '',
      sourceType: 'pdf_bucket',
      bucketPath: OFTREVIEW_APOSTILAS_GCS_PREFIX,
    },
    criadoPor: trim(criadoPor),
  };
}

/**
 * Valida estrutura local de uma questão antes de revisão/publicação.
 * Reforça vínculo com PDFs oficiais em gs://oftware/OFTREVIEW 2023/APOSTILAS/*.pdf
 */
export function validateOftpayQuestao(questao: Partial<OftpayQuestao>): ValidateOftpayQuestaoResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (questao.courseId !== OFTPAY_QUESTOES_COURSE_ID) {
    errors.push('courseId deve ser "oftreview".');
  }

  if (!trim(questao.tema)) {
    errors.push('tema é obrigatório.');
  }

  if (!trim(questao.enunciado)) {
    errors.push('enunciado é obrigatório.');
  }

  if (!questao.dificuldade) {
    errors.push('dificuldade é obrigatória.');
  } else if (!isQuestaoDificuldade(questao.dificuldade)) {
    errors.push('dificuldade deve ser "facil", "medio" ou "dificil".');
  }

  if (!questao.status) {
    errors.push('status é obrigatório.');
  } else if (!isQuestaoStatus(questao.status)) {
    errors.push('status deve ser "rascunho", "revisao" ou "publicado".');
  }

  if (!trim(questao.explicacao)) {
    errors.push('explicacao é obrigatória.');
  }

  if (!trim(questao.subtema)) {
    warnings.push('subtema não informado.');
  }

  const fonte = questao.fonte;
  if (!fonte) {
    errors.push('fonte é obrigatória.');
  } else {
    if (fonte.sourceType !== 'pdf_bucket') {
      errors.push('fonte.sourceType deve ser "pdf_bucket".');
    }

    if (!trim(fonte.apostilaTitulo)) {
      errors.push('fonte.apostilaTitulo é obrigatório.');
    }

    if (fonte.pagina == null) {
      warnings.push('fonte.pagina não informada.');
    }

    if (!trim(fonte.trechoBase)) {
      warnings.push('fonte.trechoBase não informado.');
    }

    if (fonte.bucketPath && !fonte.bucketPath.includes('OFTREVIEW 2023/APOSTILAS')) {
      warnings.push(
        'fonte.bucketPath deve apontar para os PDFs oficiais em gs://oftware/OFTREVIEW 2023/APOSTILAS/.'
      );
    }
  }

  const alternativas = questao.alternativas ?? [];

  if (alternativas.length < QUESTAO_ALTERNATIVA_MIN) {
    errors.push(`mínimo de ${QUESTAO_ALTERNATIVA_MIN} alternativas.`);
  }

  if (alternativas.length > QUESTAO_ALTERNATIVA_MAX) {
    errors.push(`máximo de ${QUESTAO_ALTERNATIVA_MAX} alternativas.`);
  }

  const letrasVistas = new Set<AlternativaLetra>();
  for (const alt of alternativas) {
    if (!isAlternativaLetra(alt.letra)) {
      errors.push(`alternativa com letra inválida: "${String(alt.letra)}".`);
      continue;
    }

    if (letrasVistas.has(alt.letra)) {
      errors.push(`letra "${alt.letra}" repetida nas alternativas.`);
    } else {
      letrasVistas.add(alt.letra);
    }

    if (!trim(alt.texto)) {
      errors.push(`alternativa ${alt.letra} precisa ter texto.`);
    }
  }

  const corretas = alternativas.filter((alt) => alt.correta);
  if (corretas.length !== 1) {
    errors.push('deve haver exatamente 1 alternativa correta.');
  }

  if (questao.status === 'publicado') {
    if (!fonte || !trim(fonte.apostilaTitulo)) {
      errors.push('não é permitido status "publicado" sem fonte.apostilaTitulo.');
    }
    if (!trim(questao.explicacao)) {
      errors.push('não é permitido status "publicado" sem explicacao.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
