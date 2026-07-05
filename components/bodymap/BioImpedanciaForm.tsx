'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Save,
  Trash2,
  Upload,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import type {
  BioImpedanciaRegistro,
  ComposicaoCorporal,
  AnaliseMusculoGordura,
  MassaMagraSegmentar,
  GorduraSegmentar,
  SegmentoBioImpedancia,
} from '@/types/bioImpedancia';
import { parseBioDataRegistro, formatBioDateInputLocal, dateFromBioDateInput } from '@/utils/bioImpedanciaDate';
import {
  normalizarRespostaBioImpedanciaIA,
  aplicarExtracaoBioAoFormulario,
  sincronizarBioRegistroParaPersistencia,
  type BioImpedanciaExtracaoNormalizada,
} from '@/lib/metaadmin/bioImpedanciaExtracao';
import { BioExtractedReviewCard } from '@/components/bodymap/BioExtractedReviewCard';
import { BIO_CARD, BIO_CARD_PAD } from '@/components/bodymap/bioImpedanciaTokens';
import { getBioMainMetrics } from '@/utils/bioImpedanciaMetrics';
import {
  ensureBioRegistroId,
  ensureBioRegistrosIds,
  newBioRegistroId,
  removeRegistroById,
  removeRegistroLegacy,
  replaceRegistroById,
  replaceRegistroLegacy,
} from '@/utils/bioImpedanciaRegistroId';

const SEGMENTOS = ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'] as const;
const SEGMENTO_LABELS: Record<(typeof SEGMENTOS)[number], string> = {
  arm_r: 'Braço Direito',
  arm_l: 'Braço Esquerdo',
  trunk: 'Tronco',
  leg_r: 'Perna Direita',
  leg_l: 'Perna Esquerda',
};

const MOBILE_STEPS = ['Dados principais', 'Composição', 'Segmentares', 'Revisão'] as const;

function initSegmento(): SegmentoBioImpedancia {
  return { kg: 0, percentual: 0 };
}

function initMassaMagra(): MassaMagraSegmentar {
  return { arm_r: initSegmento(), arm_l: initSegmento(), trunk: initSegmento(), leg_r: initSegmento(), leg_l: initSegmento() };
}

function initComposicao(): ComposicaoCorporal {
  return { aguaTotalLitros: 0, proteinasKg: 0, mineraisKg: 0, massaGorduraKg: 0 };
}

function initAnaliseMusculo(): AnaliseMusculoGordura {
  return { massaMuscularKg: 0, massaGorduraKg: 0 };
}

interface BioImpedanciaFormProps {
  pacienteId: string;
  pesoAtual: number;
  registros: BioImpedanciaRegistro[];
  onSalvo: (registros: BioImpedanciaRegistro[]) => void;
  registroParaEditar?: BioImpedanciaRegistro | null;
  /** ID estável do registro em edição (preferencial ao índice) */
  registroEditandoId?: string | null;
  /** @deprecated Use registroEditandoId — mantido só para compatibilidade */
  indiceEdicao?: number;
  onCancelar?: () => void;
  isMobile?: boolean;
}

function registroToState(r: BioImpedanciaRegistro): Partial<BioImpedanciaRegistro> {
  const dataReg = parseBioDataRegistro(r.dataRegistro);
  return {
    id: r.id,
    dataRegistro: dataReg,
    peso: r.peso,
    composicaoCorporal: r.composicaoCorporal ? { ...r.composicaoCorporal } : initComposicao(),
    analiseMusculoGordura: r.analiseMusculoGordura ? { ...r.analiseMusculoGordura } : initAnaliseMusculo(),
    analiseObesidade: r.analiseObesidade ? { ...r.analiseObesidade } : { percentualGordura: 0 },
    massaMagraSegmentar: r.massaMagraSegmentar ? { ...r.massaMagraSegmentar } : initMassaMagra(),
    gorduraSegmentar: r.gorduraSegmentar ? { ...r.gorduraSegmentar } : initMassaMagra(),
    gorduraVisceral: r.gorduraVisceral,
    metabolismoBasalKcal: r.metabolismoBasalKcal,
    massaOsseaKg: r.massaOsseaKg,
    circunferenciaAbdominalCm: r.circunferenciaAbdominalCm,
    origemExame: r.origemExame,
    imc: r.imc,
    percentualGordura: r.percentualGordura,
    massaGorduraKg: r.massaGorduraKg,
    massaMuscularKg: r.massaMuscularKg,
    massaMuscularEsqueleticaKg: r.massaMuscularEsqueleticaKg,
    aguaPercentual: r.aguaPercentual,
    aguaKg: r.aguaKg,
    proteinaPercentual: r.proteinaPercentual,
    idadeCorporal: r.idadeCorporal,
    alturaCm: r.alturaCm,
  };
}

function inputCls(compact?: boolean) {
  return `w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 min-w-0 ${compact ? '' : ''}`;
}

export function BioImpedanciaForm({
  pacienteId: _pacienteId,
  pesoAtual,
  registros,
  onSalvo,
  registroParaEditar,
  registroEditandoId = null,
  onCancelar,
  isMobile = false,
}: BioImpedanciaFormProps) {
  const hojeStr = formatBioDateInputLocal(new Date());
  const isEditMode = !!registroParaEditar;
  const [novoRegistro, setNovoRegistro] = useState<Partial<BioImpedanciaRegistro>>(() =>
    registroParaEditar
      ? registroToState(registroParaEditar)
      : {
          dataRegistro: new Date(),
          peso: pesoAtual || 0,
          composicaoCorporal: initComposicao(),
          analiseMusculoGordura: initAnaliseMusculo(),
          analiseObesidade: { percentualGordura: 0 },
          massaMagraSegmentar: initMassaMagra(),
          gorduraSegmentar: initMassaMagra(),
        }
  );

  useEffect(() => {
    if (registroParaEditar) setNovoRegistro(registroToState(registroParaEditar));
  }, [registroParaEditar]);

  const [salvando, setSalvando] = useState(false);
  const [lendoArquivoIA, setLendoArquivoIA] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState<BioImpedanciaExtracaoNormalizada | null>(null);
  const [modalDataAberto, setModalDataAberto] = useState(false);
  const [dataPendenteIA, setDataPendenteIA] = useState(hojeStr);
  const [mobileStep, setMobileStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preImportSnapshotRef = useRef<Partial<BioImpedanciaRegistro> | null>(null);

  const updateComposicao = (key: keyof ComposicaoCorporal, val: number) => {
    const cc = { ...(novoRegistro.composicaoCorporal || initComposicao()), [key]: val };
    setNovoRegistro({ ...novoRegistro, composicaoCorporal: cc });
  };

  const updateMusculoGordura = (key: keyof AnaliseMusculoGordura, val: number) => {
    const amg = { ...(novoRegistro.analiseMusculoGordura || initAnaliseMusculo()), [key]: val };
    setNovoRegistro({ ...novoRegistro, analiseMusculoGordura: amg });
  };

  const updateObesidade = (val: number) => {
    setNovoRegistro({ ...novoRegistro, analiseObesidade: { percentualGordura: val } });
  };

  const updateSegmento = (key: keyof MassaMagraSegmentar, campo: 'kg' | 'percentual', val: number) => {
    const mm = { ...(novoRegistro.massaMagraSegmentar || initMassaMagra()) };
    mm[key] = { ...mm[key], [campo]: val };
    setNovoRegistro({ ...novoRegistro, massaMagraSegmentar: mm });
  };

  const updateSegmentoGordura = (key: keyof GorduraSegmentar, campo: 'kg' | 'percentual', val: number) => {
    const gs = { ...(novoRegistro.gorduraSegmentar || initMassaMagra()) };
    gs[key] = { ...gs[key], [campo]: val };
    setNovoRegistro({ ...novoRegistro, gorduraSegmentar: gs });
  };

  const buildRegistroSalvar = (state = novoRegistro): BioImpedanciaRegistro | null => {
    const synced = sincronizarBioRegistroParaPersistencia(state);
    if (
      !synced.peso ||
      !synced.composicaoCorporal ||
      !synced.analiseMusculoGordura ||
      !synced.analiseObesidade ||
      !synced.massaMagraSegmentar
    ) {
      return null;
    }
    const dataReg = parseBioDataRegistro(synced.dataRegistro ?? Date.now());
    const reg: BioImpedanciaRegistro = {
      dataRegistro: dataReg,
      peso: synced.peso,
      composicaoCorporal: synced.composicaoCorporal,
      analiseMusculoGordura: synced.analiseMusculoGordura,
      analiseObesidade: synced.analiseObesidade,
      massaMagraSegmentar: synced.massaMagraSegmentar,
      gorduraSegmentar: synced.gorduraSegmentar || initMassaMagra(),
    };
    const extFields = [
      'origemExame',
      'imc',
      'percentualGordura',
      'massaGorduraKg',
      'massaMuscularKg',
      'massaMuscularEsqueleticaKg',
      'gorduraVisceral',
      'aguaPercentual',
      'aguaKg',
      'metabolismoBasalKcal',
      'massaOsseaKg',
      'circunferenciaAbdominalCm',
      'proteinaPercentual',
      'idadeCorporal',
      'alturaCm',
    ] as const;
    for (const key of extFields) {
      const v = synced[key];
      if (v != null && v !== '') (reg as Record<string, unknown>)[key] = v;
    }

    const editId = registroEditandoId ?? registroParaEditar?.id ?? synced.id;
    if (isEditMode && editId) {
      reg.id = editId;
    } else {
      reg.id = newBioRegistroId(dataReg);
    }

    return reg;
  };

  const resolveEstadoAntesSalvar = (): Partial<BioImpedanciaRegistro> => {
    let state = novoRegistro;
    if (pendingExtraction) {
      state = aplicarExtracaoBioAoFormulario(state, pendingExtraction, { aplicarData: !isEditMode });
      setPendingExtraction(null);
      preImportSnapshotRef.current = null;
    }
    return sincronizarBioRegistroParaPersistencia(state);
  };

  const handleSalvar = async () => {
    const stateSalvar = resolveEstadoAntesSalvar();
    setNovoRegistro(stateSalvar);
    const reg = buildRegistroSalvar(stateSalvar);
    if (!reg) return;
    setSalvando(true);
    try {
      const base = ensureBioRegistrosIds(registros);
      let novos: BioImpedanciaRegistro[];

      if (isEditMode && registroParaEditar) {
        const editId = registroEditandoId ?? registroParaEditar.id;
        if (editId) {
          novos = replaceRegistroById(base, editId, reg);
        } else {
          novos = replaceRegistroLegacy(base, registroParaEditar, reg);
        }
      } else {
        novos = [ensureBioRegistroId(reg), ...base];
      }

      await Promise.resolve(onSalvo(novos));
      if (!isEditMode) {
        setNovoRegistro({
          dataRegistro: new Date(),
          peso: pesoAtual || 0,
          composicaoCorporal: initComposicao(),
          analiseMusculoGordura: initAnaliseMusculo(),
          analiseObesidade: { percentualGordura: 0 },
          massaMagraSegmentar: initMassaMagra(),
          gorduraSegmentar: initMassaMagra(),
        });
        setMobileStep(0);
      }
      if (onCancelar) onCancelar();
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!isEditMode || !registroParaEditar) return;
    if (
      !confirm(
        'Tem certeza que deseja excluir este registro de bioimpedância? Essa ação não pode ser desfeita.'
      )
    ) {
      return;
    }
    setSalvando(true);
    try {
      const base = ensureBioRegistrosIds(registros);
      const editId = registroEditandoId ?? registroParaEditar.id;
      const novos = editId
        ? removeRegistroById(base, editId)
        : removeRegistroLegacy(base, registroParaEditar);
      await Promise.resolve(onSalvo(novos));
      if (onCancelar) onCancelar();
    } finally {
      setSalvando(false);
    }
  };

  const processarArquivoIA = async (
    file: File
  ): Promise<{ ok: true; normalized: BioImpedanciaExtracaoNormalizada } | { ok: false; error: string }> => {
    const mime = (file.type || '').toLowerCase();
    const permitidos = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!permitidos.has(mime)) {
      return { ok: false, error: `Formato não suportado em "${file.name}". Use PDF, JPG, PNG ou WebP.` };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, error: `Arquivo "${file.name}" muito grande. Máximo 5 MB.` };
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/metaadmin/bio-impedancia-extrair-ia', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        return { ok: false, error: json?.error || `Falha ao ler "${file.name}" com IA.` };
      }
      return { ok: true, normalized: normalizarRespostaBioImpedanciaIA(json.data) };
    } catch {
      return { ok: false, error: `Falha de rede ao processar "${file.name}".` };
    }
  };

  const mergeExtractions = (
    a: BioImpedanciaExtracaoNormalizada,
    b: BioImpedanciaExtracaoNormalizada
  ): BioImpedanciaExtracaoNormalizada => ({
    dataRegistro: a.dataRegistro ?? b.dataRegistro,
    peso: a.peso ?? b.peso,
    origemExame: a.origemExame ?? b.origemExame,
    imc: a.imc ?? b.imc,
    percentualGordura: a.percentualGordura ?? b.percentualGordura,
    massaGorduraKg: a.massaGorduraKg ?? b.massaGorduraKg,
    massaMuscularKg: a.massaMuscularKg ?? b.massaMuscularKg,
    massaMuscularEsqueleticaKg: a.massaMuscularEsqueleticaKg ?? b.massaMuscularEsqueleticaKg,
    gorduraVisceral: a.gorduraVisceral ?? b.gorduraVisceral,
    aguaPercentual: a.aguaPercentual ?? b.aguaPercentual,
    aguaKg: a.aguaKg ?? b.aguaKg,
    metabolismoBasalKcal: a.metabolismoBasalKcal ?? b.metabolismoBasalKcal,
    massaOsseaKg: a.massaOsseaKg ?? b.massaOsseaKg,
    proteinaPercentual: a.proteinaPercentual ?? b.proteinaPercentual,
    idadeCorporal: a.idadeCorporal ?? b.idadeCorporal,
    alturaCm: a.alturaCm ?? b.alturaCm,
    circunferenciaAbdominalCm: a.circunferenciaAbdominalCm ?? b.circunferenciaAbdominalCm,
    composicaoCorporal: { ...b.composicaoCorporal, ...a.composicaoCorporal },
    analiseMusculoGordura: { ...b.analiseMusculoGordura, ...a.analiseMusculoGordura },
    analiseObesidade: a.analiseObesidade ?? b.analiseObesidade,
    massaMagraSegmentar: { ...b.massaMagraSegmentar, ...a.massaMagraSegmentar },
    gorduraSegmentar: { ...b.gorduraSegmentar, ...a.gorduraSegmentar },
    avisos: [...a.avisos, ...b.avisos],
  });

  const handleSelecionarArquivosIA = async (files: File[]) => {
    if (!files.length) return;
    setLendoArquivoIA(true);
    try {
      let merged: BioImpedanciaExtracaoNormalizada | null = null;
      const erros: string[] = [];

      for (const file of files) {
        const resultado = await processarArquivoIA(file);
        if (!resultado.ok) {
          erros.push(resultado.error);
          continue;
        }
        merged = merged ? mergeExtractions(resultado.normalized, merged) : resultado.normalized;
      }

      if (!merged) {
        alert(erros[0] ?? 'Não foi possível ler o arquivo.');
        return;
      }
      if (erros.length) merged.avisos.push(...erros.map((e) => `Arquivo: ${e}`));

      setNovoRegistro((prev) => {
        preImportSnapshotRef.current = prev;
        return aplicarExtracaoBioAoFormulario(prev, merged!, { aplicarData: !isEditMode });
      });
      setPendingExtraction(merged);

      if (!isEditMode && !merged.dataRegistro) {
        setDataPendenteIA(dataRegStr || hojeStr);
        setModalDataAberto(true);
      }
    } finally {
      setLendoArquivoIA(false);
    }
  };

  const aplicarExtracaoPendente = () => {
    if (!pendingExtraction) return;
    setNovoRegistro((prev) =>
      aplicarExtracaoBioAoFormulario(prev, pendingExtraction, { aplicarData: !isEditMode })
    );
    if (!isEditMode && !pendingExtraction.dataRegistro) {
      setDataPendenteIA(dataRegStr || hojeStr);
      setModalDataAberto(true);
    }
    setPendingExtraction(null);
    preImportSnapshotRef.current = null;
  };

  const descartarExtracaoPendente = () => {
    if (preImportSnapshotRef.current) {
      setNovoRegistro(preImportSnapshotRef.current);
      preImportSnapshotRef.current = null;
    }
    setPendingExtraction(null);
  };

  const cc = novoRegistro.composicaoCorporal || initComposicao();
  const amg = novoRegistro.analiseMusculoGordura || initAnaliseMusculo();
  const mm = novoRegistro.massaMagraSegmentar || initMassaMagra();
  const gs = novoRegistro.gorduraSegmentar || initMassaMagra();

  const dataRegStr = formatBioDateInputLocal(
    novoRegistro.dataRegistro instanceof Date ? novoRegistro.dataRegistro : parseBioDataRegistro(novoRegistro.dataRegistro)
  );

  const confirmarDataPendenteIA = () => {
    setNovoRegistro((prev) => ({ ...prev, dataRegistro: dateFromBioDateInput(dataPendenteIA) }));
    setModalDataAberto(false);
  };

  const previewRegistro = buildRegistroSalvar();
  const previewMetrics = previewRegistro ? getBioMainMetrics(previewRegistro) : null;

  const uploadBlock = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const selecionados = Array.from(e.target.files || []);
          e.target.value = '';
          if (selecionados.length) void handleSelecionarArquivosIA(selecionados);
        }}
        disabled={salvando || lendoArquivoIA}
      />
      {!isEditMode && (
        <div className={`${BIO_CARD} ${BIO_CARD_PAD} border-dashed border-gray-300 bg-gray-50/50`}>
          <button
            type="button"
            disabled={salvando || lendoArquivoIA}
            onClick={() => fileInputRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {lendoArquivoIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {lendoArquivoIA ? 'Lendo arquivo…' : 'Fazer upload do exame'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">PDF ou imagem (JPG, PNG, WebP). Você também pode preencher manualmente abaixo.</p>
        </div>
      )}
      {pendingExtraction && (
        <BioExtractedReviewCard
          extraction={pendingExtraction}
          loading={lendoArquivoIA}
          onApply={aplicarExtracaoPendente}
          onDiscard={descartarExtracaoPendente}
        />
      )}
    </>
  );

  const stepPrincipal = (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD} space-y-4`}>
      <h4 className="text-sm font-semibold text-gray-900">Dados principais</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Data do exame *</label>
          <input type="date" value={dataRegStr} onChange={(e) => setNovoRegistro({ ...novoRegistro, dataRegistro: dateFromBioDateInput(e.target.value) })} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg) *</label>
          <input type="number" step="0.1" value={novoRegistro.peso || ''} onChange={(e) => setNovoRegistro({ ...novoRegistro, peso: parseFloat(e.target.value) || 0 })} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">IMC</label>
          <input type="number" step="0.1" value={novoRegistro.imc ?? ''} onChange={(e) => setNovoRegistro({ ...novoRegistro, imc: parseFloat(e.target.value) || undefined })} className={inputCls()} placeholder="Opcional" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gordura %</label>
          <input type="number" step="0.1" value={novoRegistro.analiseObesidade?.percentualGordura || ''} onChange={(e) => updateObesidade(parseFloat(e.target.value) || 0)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Massa muscular (kg)</label>
          <input type="number" step="0.1" value={amg.massaMuscularKg || ''} onChange={(e) => updateMusculoGordura('massaMuscularKg', parseFloat(e.target.value) || 0)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gordura visceral</label>
          <input type="number" step="1" value={novoRegistro.gorduraVisceral ?? ''} onChange={(e) => setNovoRegistro({ ...novoRegistro, gorduraVisceral: parseFloat(e.target.value) || undefined })} className={inputCls()} placeholder="1–20" />
        </div>
      </div>
    </div>
  );

  const stepComposicao = (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD} space-y-4`}>
      <h4 className="text-sm font-semibold text-gray-900">Composição corporal</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Água total (L)</label>
          <input type="number" step="0.1" value={cc.aguaTotalLitros || ''} onChange={(e) => updateComposicao('aguaTotalLitros', parseFloat(e.target.value) || 0)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Massa de gordura (kg)</label>
          <input type="number" step="0.1" value={cc.massaGorduraKg || ''} onChange={(e) => updateComposicao('massaGorduraKg', parseFloat(e.target.value) || 0)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Metabolismo basal (kcal)</label>
          <input type="number" step="1" value={novoRegistro.metabolismoBasalKcal ?? ''} onChange={(e) => setNovoRegistro({ ...novoRegistro, metabolismoBasalKcal: parseFloat(e.target.value) || undefined })} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Proteínas (kg)</label>
          <input type="number" step="0.1" value={cc.proteinasKg || ''} onChange={(e) => updateComposicao('proteinasKg', parseFloat(e.target.value) || 0)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Minerais (kg)</label>
          <input type="number" step="0.1" value={cc.mineraisKg || ''} onChange={(e) => updateComposicao('mineraisKg', parseFloat(e.target.value) || 0)} className={inputCls()} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Massa óssea (kg)</label>
          <input type="number" step="0.1" value={novoRegistro.massaOsseaKg ?? ''} onChange={(e) => setNovoRegistro({ ...novoRegistro, massaOsseaKg: parseFloat(e.target.value) || undefined })} className={inputCls()} />
        </div>
      </div>
    </div>
  );

  const stepSegmentar = (
    <div className="space-y-4">
      <div className={`${BIO_CARD} ${BIO_CARD_PAD}`}>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Massa magra segmentar</h4>
        <div className="space-y-2">
          {SEGMENTOS.map((key) => (
            <div key={key} className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-gray-600 w-24 shrink-0 truncate">{SEGMENTO_LABELS[key]}</span>
              <input type="number" step="0.1" placeholder="kg" value={mm[key]?.kg || ''} onChange={(e) => updateSegmento(key, 'kg', parseFloat(e.target.value) || 0)} className={`${inputCls(true)} w-20`} />
              <input type="number" step="0.1" placeholder="%" value={mm[key]?.percentual || ''} onChange={(e) => updateSegmento(key, 'percentual', parseFloat(e.target.value) || 0)} className={`${inputCls(true)} w-20`} />
            </div>
          ))}
        </div>
      </div>
      <div className={`${BIO_CARD} ${BIO_CARD_PAD}`}>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Gordura segmentar</h4>
        <div className="space-y-2">
          {SEGMENTOS.map((key) => (
            <div key={key} className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-gray-600 w-24 shrink-0 truncate">{SEGMENTO_LABELS[key]}</span>
              <input type="number" step="0.1" placeholder="kg" value={gs[key]?.kg || ''} onChange={(e) => updateSegmentoGordura(key, 'kg', parseFloat(e.target.value) || 0)} className={`${inputCls(true)} w-20`} />
              <input type="number" step="0.1" placeholder="%" value={gs[key]?.percentual || ''} onChange={(e) => updateSegmentoGordura(key, 'percentual', parseFloat(e.target.value) || 0)} className={`${inputCls(true)} w-20`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const stepRevisao = (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD} space-y-3`}>
      <h4 className="text-sm font-semibold text-gray-900">Revisão</h4>
      <p className="text-xs text-gray-500">Confira o que será salvo neste registro.</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><dt className="text-gray-500 text-xs">Data</dt><dd className="font-medium text-gray-900">{dataRegStr}</dd></div>
        <div><dt className="text-gray-500 text-xs">Peso</dt><dd className="font-medium text-gray-900">{previewMetrics?.peso?.toFixed(1) ?? '—'} kg</dd></div>
        <div><dt className="text-gray-500 text-xs">Gordura %</dt><dd className="font-medium text-gray-900">{previewMetrics?.percentualGordura?.toFixed(1) ?? '—'}%</dd></div>
        <div><dt className="text-gray-500 text-xs">Massa muscular</dt><dd className="font-medium text-gray-900">{previewMetrics?.massaMuscularKg?.toFixed(1) ?? '—'} kg</dd></div>
        <div><dt className="text-gray-500 text-xs">Gordura visceral</dt><dd className="font-medium text-gray-900">{previewMetrics?.gorduraVisceral ?? '—'}</dd></div>
        <div><dt className="text-gray-500 text-xs">Água</dt><dd className="font-medium text-gray-900">{previewMetrics?.aguaKg?.toFixed(1) ?? '—'} L</dd></div>
      </dl>
    </div>
  );

  const actionBar = (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 mt-4">
      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando}
        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Save size={18} />
        {salvando ? 'Salvando…' : isEditMode ? 'Salvar alterações' : 'Salvar registro'}
      </button>
      {onCancelar && (
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      )}
      {isEditMode && (
        <button
          type="button"
          onClick={handleExcluir}
          disabled={salvando}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 ml-auto sm:ml-0"
        >
          <Trash2 size={18} />
          Excluir registro
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      {modalDataAberto && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <CalendarDays className="h-4 w-4 text-teal-700" />
              <h4 className="text-sm font-semibold text-gray-900">Data da bioimpedância</h4>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-gray-700">Informe a data de realização deste exame.</p>
              <input type="date" value={dataPendenteIA} onChange={(e) => setDataPendenteIA(e.target.value)} className={inputCls()} />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button type="button" onClick={() => setModalDataAberto(false)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">Agora não</button>
              <button type="button" onClick={confirmarDataPendenteIA} className="rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isMobile && !isEditMode && <div className="mb-4">{uploadBlock}</div>}

      {isMobile ? (
        <>
          <div className="flex items-center gap-1 mb-2">
            {MOBILE_STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 min-w-0">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i <= mobileStep ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < mobileStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < MOBILE_STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-0.5 ${i < mobileStep ? 'bg-teal-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-700 mb-3">{MOBILE_STEPS[mobileStep]}</p>
          {mobileStep === 0 && stepPrincipal}
          {mobileStep === 1 && stepComposicao}
          {mobileStep === 2 && stepSegmentar}
          {mobileStep === 3 && (
            <>
              {stepRevisao}
              {actionBar}
            </>
          )}
          <div className="flex gap-2">
            {mobileStep > 0 && (
              <button type="button" onClick={() => setMobileStep((s) => s - 1)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
            )}
            {mobileStep < 3 && (
              <button type="button" onClick={() => setMobileStep((s) => s + 1)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white">
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {!isEditMode && uploadBlock}
          <div className="grid lg:grid-cols-2 gap-4">
            {stepPrincipal}
            {stepComposicao}
          </div>
          {stepSegmentar}
          {stepRevisao}
          {actionBar}
        </>
      )}
    </div>
  );
}
