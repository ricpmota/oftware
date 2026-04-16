'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Trash2, Upload, Loader2, AlertCircle, CheckCircle2, CalendarDays } from 'lucide-react';
import type {
  BioImpedanciaRegistro,
  ComposicaoCorporal,
  AnaliseMusculoGordura,
  AnaliseObesidade,
  MassaMagraSegmentar,
  GorduraSegmentar,
  SegmentoBioImpedancia,
} from '@/types/bioImpedancia';
import { parseBioDataRegistro, formatBioDateInputLocal, dateFromBioDateInput } from '@/utils/bioImpedanciaDate';
import {
  normalizarRespostaBioImpedanciaIA,
  aplicarExtracaoBioAoFormulario,
  type BioImpedanciaExtracaoNormalizada,
} from '@/lib/metaadmin/bioImpedanciaExtracao';

const SEGMENTOS = ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'] as const;
const SEGMENTO_LABELS: Record<typeof SEGMENTOS[number], string> = {
  arm_r: 'Braço Direito',
  arm_l: 'Braço Esquerdo',
  trunk: 'Tronco',
  leg_r: 'Perna Direita',
  leg_l: 'Perna Esquerda',
};

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

function contarCamposExtraidos(ext: BioImpedanciaExtracaoNormalizada): number {
  let n = 0;
  if (ext.dataRegistro) n += 1;
  if (ext.peso != null) n += 1;
  if (ext.composicaoCorporal) n += Object.values(ext.composicaoCorporal).filter((v) => v != null).length;
  if (ext.analiseMusculoGordura) n += Object.values(ext.analiseMusculoGordura).filter((v) => v != null).length;
  if (ext.analiseObesidade?.percentualGordura != null) n += 1;
  const keys = ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'] as const;
  for (const k of keys) {
    const mm = ext.massaMagraSegmentar?.[k];
    const gs = ext.gorduraSegmentar?.[k];
    if (mm?.kg != null) n += 1;
    if (mm?.percentual != null) n += 1;
    if (gs?.kg != null) n += 1;
    if (gs?.percentual != null) n += 1;
  }
  return n;
}

interface BioImpedanciaFormProps {
  pacienteId: string;
  pesoAtual: number;
  registros: BioImpedanciaRegistro[];
  onSalvo: (registros: BioImpedanciaRegistro[]) => void;
  /** Quando preenchido, modo edição: pré-preenche e ao salvar substitui; exibe botão Excluir */
  registroParaEditar?: BioImpedanciaRegistro | null;
  indiceEdicao?: number;
  onCancelar?: () => void;
  /** Se true (mobile), layout mais compacto: campo Data menor, sem labels kg/% nos segmentares */
  isMobile?: boolean;
}

function registroToState(r: BioImpedanciaRegistro): Partial<BioImpedanciaRegistro> {
  const dataReg = parseBioDataRegistro(r.dataRegistro);
  return {
    dataRegistro: dataReg,
    peso: r.peso,
    composicaoCorporal: r.composicaoCorporal ? { ...r.composicaoCorporal } : initComposicao(),
    analiseMusculoGordura: r.analiseMusculoGordura ? { ...r.analiseMusculoGordura } : initAnaliseMusculo(),
    analiseObesidade: r.analiseObesidade ? { ...r.analiseObesidade } : { percentualGordura: 0 },
    massaMagraSegmentar: r.massaMagraSegmentar ? { ...r.massaMagraSegmentar } : initMassaMagra(),
    gorduraSegmentar: r.gorduraSegmentar ? { ...r.gorduraSegmentar } : initMassaMagra(),
  };
}

export function BioImpedanciaForm({ pacienteId, pesoAtual, registros, onSalvo, registroParaEditar, indiceEdicao = 0, onCancelar, isMobile = false }: BioImpedanciaFormProps) {
  const hojeStr = formatBioDateInputLocal(new Date());
  const isEditMode = !!registroParaEditar;
  const [novoRegistro, setNovoRegistro] = useState<Partial<BioImpedanciaRegistro>>(() => registroParaEditar ? registroToState(registroParaEditar) : ({
    dataRegistro: new Date(),
    peso: pesoAtual || 0,
    composicaoCorporal: initComposicao(),
    analiseMusculoGordura: initAnaliseMusculo(),
    analiseObesidade: { percentualGordura: 0 },
    massaMagraSegmentar: initMassaMagra(),
    gorduraSegmentar: initMassaMagra(),
  }));

  useEffect(() => {
    if (registroParaEditar) setNovoRegistro(registroToState(registroParaEditar));
  }, [registroParaEditar]);

  const [salvando, setSalvando] = useState(false);
  const [erroSoma, setErroSoma] = useState<string | null>(null);
  const [lendoArquivoIA, setLendoArquivoIA] = useState(false);
  const [feedbackIA, setFeedbackIA] = useState<{ type: 'idle' | 'success' | 'error'; text?: string }>({ type: 'idle' });
  const [modalDataAberto, setModalDataAberto] = useState(false);
  const [dataPendenteIA, setDataPendenteIA] = useState(hojeStr);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateComposicao = (key: keyof ComposicaoCorporal, val: number) => {
    const cc = { ...(novoRegistro.composicaoCorporal || initComposicao()), [key]: val };
    setNovoRegistro({ ...novoRegistro, composicaoCorporal: cc });
    const soma = cc.aguaTotalLitros + cc.proteinasKg + cc.mineraisKg + cc.massaGorduraKg;
    const peso = novoRegistro.peso || 0;
    setErroSoma(Math.abs(soma - peso) > 0.5 ? `Soma (${soma.toFixed(1)} kg) deve ≈ peso (${peso.toFixed(1)} kg)` : null);
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

  const handleSalvar = async () => {
    if (!novoRegistro.peso || !novoRegistro.composicaoCorporal || !novoRegistro.analiseMusculoGordura || !novoRegistro.analiseObesidade || !novoRegistro.massaMagraSegmentar) return;
    if (erroSoma) return;
    setSalvando(true);
    try {
      const dataReg = parseBioDataRegistro(novoRegistro.dataRegistro ?? Date.now());
      const reg: BioImpedanciaRegistro = {
        dataRegistro: dataReg,
        peso: novoRegistro.peso,
        composicaoCorporal: novoRegistro.composicaoCorporal,
        analiseMusculoGordura: novoRegistro.analiseMusculoGordura,
        analiseObesidade: novoRegistro.analiseObesidade,
        massaMagraSegmentar: novoRegistro.massaMagraSegmentar,
        gorduraSegmentar: novoRegistro.gorduraSegmentar || initMassaMagra(),
      };
      let novos: BioImpedanciaRegistro[];
      if (isEditMode && indiceEdicao >= 0 && indiceEdicao < registros.length) {
        novos = registros.map((r, i) => (i === indiceEdicao ? reg : r));
      } else {
        novos = [reg, ...registros];
      }
      await Promise.resolve(onSalvo(novos));
      if (!isEditMode) {
        setNovoRegistro({ dataRegistro: new Date(), peso: pesoAtual || 0, composicaoCorporal: initComposicao(), analiseMusculoGordura: initAnaliseMusculo(), analiseObesidade: { percentualGordura: 0 }, massaMagraSegmentar: initMassaMagra(), gorduraSegmentar: initMassaMagra() });
      }
      setErroSoma(null);
      if (onCancelar) onCancelar();
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!isEditMode || indiceEdicao < 0 || indiceEdicao >= registros.length) return;
    if (!confirm('Excluir este registro de Bio Impedância?')) return;
    setSalvando(true);
    try {
      const novos = registros.filter((_, i) => i !== indiceEdicao);
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

  const handleSelecionarArquivosIA = async (files: File[]) => {
    if (!files.length) return;
    setLendoArquivoIA(true);
    setFeedbackIA({ type: 'idle' });
    try {
      let camposExtraidosTotal = 0;
      let avisosTotal = 0;
      let dataEncontradaEmAlgumArquivo = false;
      const erros: string[] = [];

      for (const file of files) {
        const resultado = await processarArquivoIA(file);
        if (!resultado.ok) {
          erros.push(resultado.error);
          continue;
        }
        const normalized = resultado.normalized;
        if (normalized.dataRegistro) dataEncontradaEmAlgumArquivo = true;
        camposExtraidosTotal += contarCamposExtraidos(normalized);
        avisosTotal += normalized.avisos.length;

        setNovoRegistro((prev) => {
          const next = aplicarExtracaoBioAoFormulario(prev, normalized, { aplicarData: !isEditMode });
          const cc = next.composicaoCorporal || initComposicao();
          const soma = cc.aguaTotalLitros + cc.proteinasKg + cc.mineraisKg + cc.massaGorduraKg;
          const peso = next.peso || 0;
          setErroSoma(Math.abs(soma - peso) > 0.5 ? `Soma (${soma.toFixed(1)} kg) deve ≈ peso (${peso.toFixed(1)} kg)` : null);
          return next;
        });
      }

      if (!isEditMode && !dataEncontradaEmAlgumArquivo && camposExtraidosTotal > 0) {
        setDataPendenteIA(dataRegStr || hojeStr);
        setModalDataAberto(true);
      }

      if (erros.length > 0 && camposExtraidosTotal === 0) {
        setFeedbackIA({ type: 'error', text: erros[0] });
        return;
      }

      const msgAvisos = avisosTotal > 0 ? ` (${avisosTotal} aviso${avisosTotal > 1 ? 's' : ''})` : '';
      const msgErros = erros.length > 0 ? ` ${erros.length} arquivo(s) falharam.` : '';
      setFeedbackIA({
        type: camposExtraidosTotal > 0 ? 'success' : 'error',
        text:
          camposExtraidosTotal > 0
            ? `${camposExtraidosTotal} campo(s) sugerido(s) pela IA${msgAvisos}.${msgErros} Revise antes de salvar.`
            : `Nenhum campo detectado${msgAvisos}.${msgErros}`,
      });
    } finally {
      setLendoArquivoIA(false);
    }
  };

  const cc = novoRegistro.composicaoCorporal || initComposicao();
  const amg = novoRegistro.analiseMusculoGordura || initAnaliseMusculo();
  const mm = novoRegistro.massaMagraSegmentar || initMassaMagra();
  const gs = novoRegistro.gorduraSegmentar || initMassaMagra();

  const dataRegStr = formatBioDateInputLocal(
    novoRegistro.dataRegistro instanceof Date
      ? novoRegistro.dataRegistro
      : parseBioDataRegistro(novoRegistro.dataRegistro)
  );

  const confirmarDataPendenteIA = () => {
    setNovoRegistro((prev) => ({
      ...prev,
      dataRegistro: dateFromBioDateInput(dataPendenteIA),
    }));
    setModalDataAberto(false);
  };

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {modalDataAberto && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <CalendarDays className="h-4 w-4 text-teal-700" />
              <h4 className="text-sm font-semibold text-gray-900">Data da bioimpedância</h4>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-gray-700">
                Não foi possível identificar a data no(s) arquivo(s). Informe a data de realização para este registro.
              </p>
              <input
                type="date"
                value={dataPendenteIA}
                onChange={(e) => setDataPendenteIA(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button type="button" onClick={() => setModalDataAberto(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                Agora não
              </button>
              <button type="button" onClick={confirmarDataPendenteIA} className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
                Confirmar data
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-3 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            disabled={salvando || lendoArquivoIA}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lendoArquivoIA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {lendoArquivoIA ? 'Lendo arquivo(s)…' : 'Upload PDF/Imagem (IA)'}
          </button>
          {feedbackIA.type === 'success' && feedbackIA.text && (
            <span className="inline-flex items-center gap-1 text-xs text-green-800">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {feedbackIA.text}
            </span>
          )}
          {feedbackIA.type === 'error' && feedbackIA.text && (
            <span className="inline-flex items-center gap-1 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {feedbackIA.text}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Envie um ou mais laudos para auto preencher os campos. Nada é salvo automaticamente.
        </p>
      </div>

      <div className={`flex flex-wrap gap-4 ${isMobile ? 'flex-row items-end' : 'grid grid-cols-1 sm:grid-cols-2'}`}>
        <div className={isMobile ? 'flex-1 min-w-0 max-w-[140px]' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data do registro *</label>
          <input
            type="date"
            value={dataRegStr}
            onChange={(e) =>
              setNovoRegistro({ ...novoRegistro, dataRegistro: dateFromBioDateInput(e.target.value) })
            }
            className={`w-full border border-gray-300 rounded-md px-2 py-2 text-sm min-w-0 ${!isMobile ? 'px-3' : ''}`}
          />
        </div>
        <div className={isMobile ? 'flex-1 min-w-0 max-w-[90px]' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg) *</label>
          <input type="number" step="0.1" value={novoRegistro.peso || ''} onChange={e => setNovoRegistro({ ...novoRegistro, peso: parseFloat(e.target.value) || 0 })} className={`w-full border border-gray-300 rounded-md px-2 py-2 text-sm min-w-0 ${!isMobile ? 'px-3' : ''}`} />
        </div>
      </div>

      {/* Análise de Composição Corporal */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Análise de Composição Corporal (Total = Peso)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Água total (L)</label>
            <input type="number" step="0.1" value={cc.aguaTotalLitros || ''} onChange={e => updateComposicao('aguaTotalLitros', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proteínas (kg)</label>
            <input type="number" step="0.1" value={cc.proteinasKg || ''} onChange={e => updateComposicao('proteinasKg', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minerais (kg)</label>
            <input type="number" step="0.1" value={cc.mineraisKg || ''} onChange={e => updateComposicao('mineraisKg', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Massa de Gordura (kg)</label>
            <input type="number" step="0.1" value={cc.massaGorduraKg || ''} onChange={e => updateComposicao('massaGorduraKg', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
        </div>
        {erroSoma && <p className="text-sm text-red-600 mt-2">{erroSoma}</p>}
      </div>

      {/* Análise Músculo-Gordura */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Análise Músculo-Gordura</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Massa muscular (kg)</label>
            <input type="number" step="0.1" value={amg.massaMuscularKg || ''} onChange={e => updateMusculoGordura('massaMuscularKg', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Massa de gordura (kg)</label>
            <input type="number" step="0.1" value={amg.massaGorduraKg || ''} onChange={e => updateMusculoGordura('massaGorduraKg', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
        </div>
      </div>

      {/* Análise de Obesidade */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Análise de Obesidade</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Percentual de Gordura - PGC (%)</label>
          <input type="number" step="0.1" value={novoRegistro.analiseObesidade?.percentualGordura || ''} onChange={e => updateObesidade(parseFloat(e.target.value) || 0)} className="w-full max-w-[200px] border border-gray-300 rounded-md px-3 py-2" />
        </div>
      </div>

      {/* Massa Magra Segmentar */}
      <div className="border border-gray-200 rounded-lg p-4 min-w-0 overflow-hidden">
        <h4 className="font-semibold text-gray-900 mb-3">Massa Magra Segmentar</h4>
        <div className="space-y-2">
          {SEGMENTOS.map((key) => (
            <div key={key} className={`flex items-center gap-2 min-w-0 ${isMobile ? 'flex-nowrap' : 'flex-wrap gap-3'}`}>
              <span className={`text-sm font-medium text-gray-700 shrink-0 ${isMobile ? 'w-20 truncate' : 'w-32'}`}>{SEGMENTO_LABELS[key]}</span>
              <input type="number" step="0.1" placeholder="kg" value={mm[key]?.kg || ''} onChange={e => updateSegmento(key, 'kg', parseFloat(e.target.value) || 0)} className={`border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-0 ${isMobile ? 'w-14 shrink-0' : 'w-20'}`} />
              {!isMobile && <span className="text-gray-500 text-sm">kg</span>}
              <input type="number" step="0.1" placeholder="%" value={mm[key]?.percentual || ''} onChange={e => updateSegmento(key, 'percentual', parseFloat(e.target.value) || 0)} className={`border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-0 ${isMobile ? 'w-14 shrink-0' : 'w-20'}`} />
              {!isMobile && <span className="text-gray-500 text-sm">%</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Gordura Segmentar */}
      <div className="border border-gray-200 rounded-lg p-4 min-w-0 overflow-hidden">
        <h4 className="font-semibold text-gray-900 mb-3">Gordura Segmentar</h4>
        <div className="space-y-2">
          {SEGMENTOS.map((key) => (
            <div key={key} className={`flex items-center gap-2 min-w-0 ${isMobile ? 'flex-nowrap' : 'flex-wrap gap-3'}`}>
              <span className={`text-sm font-medium text-gray-700 shrink-0 ${isMobile ? 'w-20 truncate' : 'w-32'}`}>{SEGMENTO_LABELS[key]}</span>
              <input type="number" step="0.1" placeholder="kg" value={gs[key]?.kg || ''} onChange={e => updateSegmentoGordura(key, 'kg', parseFloat(e.target.value) || 0)} className={`border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-0 ${isMobile ? 'w-14 shrink-0' : 'w-20'}`} />
              {!isMobile && <span className="text-gray-500 text-sm">kg</span>}
              <input type="number" step="0.1" placeholder="%" value={gs[key]?.percentual || ''} onChange={e => updateSegmentoGordura(key, 'percentual', parseFloat(e.target.value) || 0)} className={`border border-gray-300 rounded-md px-2 py-1.5 text-sm min-w-0 ${isMobile ? 'w-14 shrink-0' : 'w-20'}`} />
              {!isMobile && <span className="text-gray-500 text-sm">%</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleSalvar} disabled={salvando || !!erroSoma} className={`bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 ${isMobile && isEditMode ? 'p-2' : 'px-4 py-2'}`} title={isEditMode ? 'Salvar alterações' : 'Salvar registro'}>
          <Save size={18} />
          {!(isMobile && isEditMode) && <span>{salvando ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Salvar registro'}</span>}
        </button>
        {isEditMode && (
          <>
            <button type="button" onClick={handleExcluir} disabled={salvando} className={`bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 ${isMobile ? 'p-2' : 'px-4 py-2'}`} title="Excluir registro">
              <Trash2 size={18} />
              {!isMobile && <span>Excluir registro</span>}
            </button>
            {onCancelar && !isMobile && (
              <button type="button" onClick={onCancelar} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
