'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ImageIcon,
  Lightbulb,
  Loader2,
  Lock,
  ScanLine,
  Shirt,
  Sun,
  Trash2,
  UnfoldHorizontal,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { BodyScanModal } from '@/components/bodyscan/BodyScanModal';
import type { BodyScanBackfillSummary } from '@/components/bodyscan/BodyScanModal';
import { fetchPublicPatientApi } from '@/lib/public/fetchPublicPatientApi';
import type { BodyScanPublicView } from '@/lib/bodyscan/bodyScanSerialize';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';

export type FotoProgresso = {
  id: string;
  tipo: 'frontal' | 'perfil';
  url: string;
  data: string;
  semana?: number;
  applicationId?: string;
  compartilharComMedico: boolean;
  storagePath?: string;
  createdAt?: string;
};

type Props = {
  token: string;
  /** Só altera o título. O restante da interface é o mesmo nos dois fluxos. */
  context?: 'checkin' | 'marco-zero';
  /** `dadosIdentificacao.sexoBiologico` já cadastrado. Só escolhe a ilustração vazia. */
  sexoBiologico?: 'M' | 'F' | 'Outro' | null;
  /**
   * Raiz da API de fotos. Padrão: aplicação semanal.
   * A conclusão usa `/api/conclusao/{token}`.
   */
  apiBase?: string;
};

/** Valores reais do cadastro: M, F ou Outro. Outro e ausente não escolhem modelo. */
function sexoIlustracao(value: Props['sexoBiologico']): 'M' | 'F' | null {
  if (value === 'M' || value === 'F') return value;
  return null;
}

const BODYSCAN_SPRITE_W = 1536;
const BODYSCAN_SPRITE_H = 1024;

/**
 * Recorte da sprite em px, medido no corpo (não no quadrante).
 * Cada retângulo fica dentro do seu quadrante e tem o corpo no centro.
 */
const BODYSCAN_CROP = {
  F: {
    frontal: { x: 338, y: 27, w: 278, h: 445 },
    perfil: { x: 969, y: 36, w: 171, h: 437 },
  },
  M: {
    frontal: { x: 336, y: 515, w: 276, h: 460 },
    perfil: { x: 972, y: 517, w: 166, h: 458 },
  },
} as const;

export default function AplicacaoFotosEvolucaoSection({
  token,
  context = 'checkin',
  sexoBiologico,
  apiBase,
}: Props) {
  const apiRoot = apiBase ?? `/api/aplicacao/${encodeURIComponent(token)}`;
  const [fotoFrontalAtual, setFotoFrontalAtual] = useState<FotoProgresso | null>(null);
  const [fotoPerfilAtual, setFotoPerfilAtual] = useState<FotoProgresso | null>(null);
  const [historicoFrontal, setHistoricoFrontal] = useState<FotoProgresso[]>([]);
  const [historicoPerfil, setHistoricoPerfil] = useState<FotoProgresso[]>([]);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [previewImagemSelecionada, setPreviewImagemSelecionada] = useState<FotoProgresso | null>(null);
  const [compartilhamentoMedico, setCompartilhamentoMedico] = useState(true);
  const [modalBodyScanAberto, setModalBodyScanAberto] = useState(false);
  const [semanaBodyScan, setSemanaBodyScan] = useState<number | null>(null);
  const [uploadEmAndamentoFrontal, setUploadEmAndamentoFrontal] = useState(false);
  const [uploadEmAndamentoPerfil, setUploadEmAndamentoPerfil] = useState(false);
  const [erroFotos, setErroFotos] = useState<string | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [privacidadeAberta, setPrivacidadeAberta] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [showModalFonteFoto, setShowModalFonteFoto] = useState(false);
  const [tipoFonteFoto, setTipoFonteFoto] = useState<'frontal' | 'perfil' | null>(null);
  const [applicationIdFotos, setApplicationIdFotos] = useState<string | null>(null);
  const [deletandoFotoId, setDeletandoFotoId] = useState<string | null>(null);
  const inputCameraFrontalRef = useRef<HTMLInputElement | null>(null);
  const inputGaleriaFrontalRef = useRef<HTMLInputElement | null>(null);
  const inputArquivoFrontalRef = useRef<HTMLInputElement | null>(null);
  const inputCameraPerfilRef = useRef<HTMLInputElement | null>(null);
  const inputGaleriaPerfilRef = useRef<HTMLInputElement | null>(null);
  const inputArquivoPerfilRef = useRef<HTMLInputElement | null>(null);

  const ordenarFotos = (fotos: FotoProgresso[]) =>
    [...fotos].sort((a, b) => {
      const ta = new Date(a.createdAt || a.data || 0).getTime();
      const tb = new Date(b.createdAt || b.data || 0).getTime();
      return tb - ta;
    });

  const fotoDesteRegistro = (lista: FotoProgresso[], applicationId: string | null) => {
    if (!applicationId) return null;
    return lista.find((f) => f.applicationId === applicationId) || null;
  };

  const atualizarHistoricos = (fotos: FotoProgresso[], applicationId: string | null) => {
    const frontal = ordenarFotos(fotos.filter((f) => f.tipo === 'frontal'));
    const perfil = ordenarFotos(fotos.filter((f) => f.tipo === 'perfil'));
    setHistoricoFrontal(frontal);
    setHistoricoPerfil(perfil);
    setFotoFrontalAtual(fotoDesteRegistro(frontal, applicationId));
    setFotoPerfilAtual(fotoDesteRegistro(perfil, applicationId));
  };

  const carregarHistoricoFotos = async () => {
    if (!token) return;
    try {
      const res = await fetchPublicPatientApi(`${apiRoot}/fotos`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar histórico de fotos');
      const fotos = Array.isArray(json.fotos) ? (json.fotos as FotoProgresso[]) : [];
      const applicationId = typeof json.applicationId === 'string' ? json.applicationId : null;
      setApplicationIdFotos(applicationId);
      if (typeof json.compartilharComMedico === 'boolean') {
        setCompartilhamentoMedico(json.compartilharComMedico);
      }
      atualizarHistoricos(fotos, applicationId);
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : 'Erro ao carregar histórico de fotos');
    }
  };

  useEffect(() => {
    if (!token) return;
    void carregarHistoricoFotos();
  }, [token, apiRoot]);


  const salvarMetadataFoto = async (tipo: 'frontal' | 'perfil', file: File): Promise<FotoProgresso> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    formData.append('compartilharComMedico', String(compartilhamentoMedico));
    const res = await fetch(`${apiRoot}/fotos`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao enviar foto');
    return json.foto as FotoProgresso;
  };

  const handleUploadFotoProgresso = async (tipo: 'frontal' | 'perfil', file: File) => {
    if (!token) return;
    const jaTemFotoNaSemanaAtual =
      !!applicationIdFotos &&
      (tipo === 'frontal'
        ? historicoFrontal.some((f) => f.applicationId === applicationIdFotos)
        : historicoPerfil.some((f) => f.applicationId === applicationIdFotos));
    if (jaTemFotoNaSemanaAtual) {
      setErroFotos(
        tipo === 'frontal'
          ? 'Você já registrou uma foto frontal nesta semana.'
          : 'Você já registrou uma foto de perfil nesta semana.'
      );
      return;
    }
    if (tipo === 'frontal') setUploadEmAndamentoFrontal(true);
    if (tipo === 'perfil') setUploadEmAndamentoPerfil(true);
    try {
      setErroFotos(null);
      const foto = await salvarMetadataFoto(tipo, file);
      if (tipo === 'frontal') {
        const next = ordenarFotos([foto, ...historicoFrontal.filter((f) => f.id !== foto.id)]);
        setHistoricoFrontal(next);
        setFotoFrontalAtual(foto);
      } else {
        const next = ordenarFotos([foto, ...historicoPerfil.filter((f) => f.id !== foto.id)]);
        setHistoricoPerfil(next);
        setFotoPerfilAtual(foto);
      }
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : 'Erro ao enviar foto');
    } finally {
      if (tipo === 'frontal') setUploadEmAndamentoFrontal(false);
      if (tipo === 'perfil') setUploadEmAndamentoPerfil(false);
    }
  };

  const handleSelecionarFoto = async (tipo: 'frontal' | 'perfil', file: File | null) => {
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    const tempFoto: FotoProgresso = {
      id: `tmp-${Date.now()}`,
      tipo,
      url: tempUrl,
      data: new Date().toISOString().slice(0, 10),
      compartilharComMedico: compartilhamentoMedico,
      createdAt: new Date().toISOString(),
    };
    if (tipo === 'frontal') setFotoFrontalAtual(tempFoto);
    if (tipo === 'perfil') setFotoPerfilAtual(tempFoto);
    try {
      await handleUploadFotoProgresso(tipo, file);
    } finally {
      setTimeout(() => URL.revokeObjectURL(tempUrl), 60_000);
    }
  };

  const handleAbrirPreview = (foto: FotoProgresso) => {
    setPreviewImagemSelecionada(foto);
    setModalPreviewAberto(true);
  };

  const handleFecharPreview = () => {
    setModalPreviewAberto(false);
    setPreviewImagemSelecionada(null);
  };

  const handleExcluirFoto = async (foto: FotoProgresso) => {
    if (!token || !foto?.id || foto.id.startsWith('tmp-')) return;
    if (applicationIdFotos && foto.applicationId && foto.applicationId !== applicationIdFotos) {
      setErroFotos('Esta foto pertence a um registro anterior e não pode ser apagada daqui.');
      return;
    }
    setDeletandoFotoId(foto.id);
    setErroFotos(null);
    try {
      const res = await fetch(`${apiRoot}/fotos?photoId=${encodeURIComponent(foto.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir foto');
      if (previewImagemSelecionada?.id === foto.id) handleFecharPreview();
      await carregarHistoricoFotos();
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : 'Erro ao excluir foto');
    } finally {
      setDeletandoFotoId(null);
    }
  };

  const handleAbrirModalFonteFoto = (tipo: 'frontal' | 'perfil') => {
    setTipoFonteFoto(tipo);
    setShowModalFonteFoto(true);
  };

  const handleEscolherOrigemFoto = (origem: 'camera' | 'galeria' | 'arquivos') => {
    if (!tipoFonteFoto) return;
    const tipo = tipoFonteFoto;
    setShowModalFonteFoto(false);
    setTipoFonteFoto(null);
    const refs =
      origem === 'camera'
        ? { frontal: inputCameraFrontalRef, perfil: inputCameraPerfilRef }
        : origem === 'galeria'
          ? { frontal: inputGaleriaFrontalRef, perfil: inputGaleriaPerfilRef }
          : { frontal: inputArquivoFrontalRef, perfil: inputArquivoPerfilRef };
    refs[tipo].current?.click();
  };

  const handleAtualizarCompartilhamento = async (value: boolean) => {
    if (!token) return;
    const previous = compartilhamentoMedico;
    setCompartilhamentoMedico(value);
    try {
      const res = await fetch(`${apiRoot}/fotos/compartilhamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compartilharComMedico: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar compartilhamento');
      setHistoricoFrontal((curr) => curr.map((f) => ({ ...f, compartilharComMedico: value })));
      setHistoricoPerfil((curr) => curr.map((f) => ({ ...f, compartilharComMedico: value })));
      setFotoFrontalAtual((curr) => (curr ? { ...curr, compartilharComMedico: value } : curr));
      setFotoPerfilAtual((curr) => (curr ? { ...curr, compartilharComMedico: value } : curr));
    } catch (err) {
      setCompartilhamentoMedico(previous);
      setErroFotos(err instanceof Error ? err.message : 'Erro ao atualizar compartilhamento');
    }
  };

  const formatarBadgeFoto = (foto: FotoProgresso) => {
    if (typeof foto.semana === 'number' && Number.isFinite(foto.semana)) return `Semana ${foto.semana}`;
    const d = new Date(foto.data);
    return Number.isNaN(d.getTime()) ? 'Sem data' : d.toLocaleDateString('pt-BR');
  };

  const bloqueioUploadFrontalSemanaAtual =
    !!applicationIdFotos && historicoFrontal.some((f) => f.applicationId === applicationIdFotos);
  const bloqueioUploadPerfilSemanaAtual =
    !!applicationIdFotos && historicoPerfil.some((f) => f.applicationId === applicationIdFotos);

  const fotosEnviadas = (fotoFrontalAtual ? 1 : 0) + (fotoPerfilAtual ? 1 : 0);
  const bodyScanVisualDisponivel = Boolean(fotoFrontalAtual && fotoPerfilAtual);
  const temHistorico = historicoFrontal.length > 0 || historicoPerfil.length > 0;
  const titulo = context === 'marco-zero' ? 'Fotos iniciais' : 'Fotos da evolução';
  const descricao =
    context === 'marco-zero'
      ? 'Registre suas fotos de referência para acompanhar sua evolução.'
      : 'Registre duas fotos para acompanhar sua evolução e gerar o BodyScan.';

  const renderCard = (tipo: 'frontal' | 'perfil') => {
    const atual = tipo === 'frontal' ? fotoFrontalAtual : fotoPerfilAtual;
    const uploadEmAndamento = tipo === 'frontal' ? uploadEmAndamentoFrontal : uploadEmAndamentoPerfil;
    const bloqueio = tipo === 'frontal' ? bloqueioUploadFrontalSemanaAtual : bloqueioUploadPerfilSemanaAtual;
    const tituloCard = tipo === 'frontal' ? 'Foto frontal' : 'Foto perfil';
    const dicaCard = tipo === 'frontal' ? 'De frente, corpo inteiro' : 'De lado, corpo inteiro';
    const sexo = sexoIlustracao(sexoBiologico);
    const spriteCrop = sexo ? BODYSCAN_CROP[sexo][tipo] : null;

    return (
      <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-800">
          {atual && !atual.id.startsWith('tmp-') ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          ) : null}
          <span className="truncate">{tituloCard}</span>
        </p>

        {atual ? (
          <button
            type="button"
            onClick={() => handleAbrirPreview(atual)}
            className="mt-2 w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={atual.url} alt={tituloCard} className="h-28 w-full object-cover sm:h-36" />
          </button>
        ) : spriteCrop ? (
          <div className="mt-2 overflow-hidden rounded-xl bg-emerald-50/80">
            <div className="relative mx-auto aspect-[3/2] w-full max-w-[13.5rem]" aria-hidden>
              <div
                className="absolute left-1/2 top-1/2 h-[92%] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
                style={{ aspectRatio: `${spriteCrop.w} / ${spriteCrop.h}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/bodyscan.png"
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{
                    width: `${(BODYSCAN_SPRITE_W / spriteCrop.w) * 100}%`,
                    height: `${(BODYSCAN_SPRITE_H / spriteCrop.h) * 100}%`,
                    left: `${(-spriteCrop.x / spriteCrop.w) * 100}%`,
                    top: `${(-spriteCrop.y / spriteCrop.h) * 100}%`,
                  }}
                />
              </div>
            </div>
            <p className="px-1 pb-1.5 text-center text-[10px] leading-tight text-slate-500">{dicaCard}</p>
          </div>
        ) : (
          <div className="mt-2 flex h-28 flex-col items-center justify-center rounded-xl bg-emerald-50/80 sm:h-36">
            <span
              className={`flex h-10 w-8 items-end justify-center ${tipo === 'perfil' ? 'origin-bottom -rotate-12' : ''}`}
              aria-hidden
            >
              <span className="flex flex-col items-center">
                <span className="h-3 w-3 rounded-full bg-emerald-200" />
                <span className={`mt-0.5 h-6 rounded-full bg-emerald-200/80 ${tipo === 'perfil' ? 'w-3' : 'w-6'}`} />
              </span>
            </span>
            <p className="mt-1 px-1 text-center text-[10px] leading-tight text-slate-500">{dicaCard}</p>
          </div>
        )}

        {uploadEmAndamento ? (
          <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enviando foto...
          </p>
        ) : null}

        {atual && !atual.id.startsWith('tmp-') ? (
          <button
            type="button"
            onClick={() => handleExcluirFoto(atual)}
            disabled={deletandoFotoId === atual.id}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
          >
            {deletandoFotoId === atual.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Excluir foto
          </button>
        ) : null}

        {!bloqueio ? (
          <button
            type="button"
            onClick={() => handleAbrirModalFonteFoto(tipo)}
            disabled={uploadEmAndamento}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2 text-[11px] font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:bg-slate-400"
          >
            <Upload className="h-3.5 w-3.5" />
            Adicionar foto
          </button>
        ) : null}
      </div>
    );
  };

  const renderCarrossel = (tipo: 'frontal' | 'perfil', fotos: FotoProgresso[]) => {
    if (fotos.length === 0) return null;
    return (
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {tipo === 'frontal' ? 'Frontal' : 'Perfil'}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => handleAbrirPreview(foto)}
              className="w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="" className="h-16 w-full object-cover" />
              <span className="block bg-slate-50 px-1 py-1 text-[10px] font-medium text-slate-600">
                {formatarBadgeFoto(foto)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Camera className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#0A1F44]">{titulo}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{descricao}</p>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2">
        <div
          className={`pointer-events-none absolute top-3.5 z-0 h-0.5 -translate-y-1/2 ${
            fotosEnviadas > 0 ? 'bg-emerald-300' : 'bg-slate-200'
          }`}
          style={{ left: 'calc((100% - 0.5rem) / 4)', right: 'calc((100% - 0.5rem) / 4)' }}
          aria-hidden
        />
        <div className="flex flex-col items-center">
          <span
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              fotoFrontalAtual ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
            }`}
            aria-hidden
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="mt-1 text-[11px] font-semibold text-slate-600">Frontal</span>
        </div>
        <div className="flex flex-col items-center">
          <span
            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              fotoPerfilAtual ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
            }`}
            aria-hidden
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="mt-1 text-[11px] font-semibold text-slate-600">Perfil</span>
        </div>
      </div>
      <p className="text-center text-xs font-medium text-slate-500">{fotosEnviadas} de 2 fotos enviadas</p>

      <div className="grid grid-cols-2 gap-2">
        {renderCard('frontal')}
        {renderCard('perfil')}
      </div>

      {erroFotos ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">
          {erroFotos}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1F44]">
            <ScanLine className="h-4 w-4 text-emerald-700" aria-hidden />
            BodyScan
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              bodyScanVisualDisponivel ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {bodyScanVisualDisponivel ? 'Disponível' : 'Em breve'}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {bodyScanVisualDisponivel
            ? 'Suas fotos foram enviadas. Veja sua análise corporal.'
            : 'Envie as duas fotos para acompanhar sua composição corporal.'}
        </p>
        {bodyScanVisualDisponivel ? (
          <button
            type="button"
            onClick={() => setModalBodyScanAberto(true)}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center text-sm font-semibold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Ver meu BodyScan →
          </button>
        ) : null}
      </div>

      {temHistorico ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setHistoricoAberto((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-expanded={historicoAberto}
            aria-controls="fotos-historico-painel"
          >
            <span className="text-sm font-medium text-[#0A1F44]">Histórico de fotos</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${historicoAberto ? 'rotate-180' : ''}`} />
          </button>
          {historicoAberto ? (
            <div id="fotos-historico-painel" className="space-y-3 border-t border-slate-100 px-3 py-3">
              {renderCarrossel('frontal', historicoFrontal)}
              {renderCarrossel('perfil', historicoPerfil)}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setDicasAbertas((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-expanded={dicasAbertas}
          aria-controls="fotos-dicas-painel"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0A1F44]">
            <Lightbulb className="h-4 w-4 text-emerald-700" aria-hidden />
            Como tirar uma boa foto
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${dicasAbertas ? 'rotate-180' : ''}`} />
        </button>
        {dicasAbertas ? (
          <div id="fotos-dicas-painel" className="space-y-3 border-t border-slate-100 px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: UserRound, title: 'Corpo inteiro', text: 'em pé e ereto' },
                { icon: Shirt, title: 'Roupa justa', text: 'e clara' },
                { icon: Sun, title: 'Boa iluminação', text: 'fundo simples' },
                { icon: UnfoldHorizontal, title: 'Braços afastados', text: 'do tronco' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl bg-emerald-50/70 px-2 py-2">
                  <item.icon className="h-4 w-4 text-emerald-700" aria-hidden />
                  <p className="mt-1 text-[11px] font-semibold leading-tight text-slate-800">{item.title}</p>
                  <p className="text-[11px] leading-tight text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-2.5 py-2">
              <p className="text-[11px] font-semibold text-emerald-900">Foto frontal</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Olhe para a câmera, ombros alinhados, peso igualmente nas duas pernas. Mostre bem tronco, cintura e quadril.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-2.5 py-2">
              <p className="text-[11px] font-semibold text-emerald-900">Foto perfil</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Vire 90° (perfil verdadeiro), olhando para o lado. Não incline o tronco nem esconda o abdome. Mostre a silhueta lateral completa.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setPrivacidadeAberta((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-expanded={privacidadeAberta}
          aria-controls="fotos-privacidade-painel"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0A1F44]">
            <Lock className="h-4 w-4 text-emerald-700" aria-hidden />
            Privacidade das suas fotos
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${privacidadeAberta ? 'rotate-180' : ''}`} />
        </button>
        {privacidadeAberta ? (
          <div id="fotos-privacidade-painel" className="border-t border-slate-100 px-3 py-3">
            <button
              type="button"
              onClick={() => handleAtualizarCompartilhamento(!compartilhamentoMedico)}
              className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-pressed={compartilhamentoMedico}
            >
              <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800">
                Compartilhar fotos com minha equipe médica
              </span>
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                  compartilhamentoMedico ? 'border-emerald-500 bg-emerald-500' : 'border-red-700 bg-red-600'
                }`}
              >
                <span
                  className={`mt-0.5 inline-block h-5 w-5 transform rounded-full border border-slate-300 bg-white shadow-md transition-transform ${
                    compartilhamentoMedico ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Suas fotos podem ser visualizadas pela sua equipe médica para acompanhar sua evolução.
            </p>
          </div>
        ) : null}
      </div>

      {(['frontal', 'perfil'] as const).flatMap((tipo) =>
        (['camera', 'galeria', 'arquivos'] as const).map((origem) => {
          const capture = origem === 'camera' ? 'environment' : undefined;
          const refMap = {
            frontal: { camera: inputCameraFrontalRef, galeria: inputGaleriaFrontalRef, arquivos: inputArquivoFrontalRef },
            perfil: { camera: inputCameraPerfilRef, galeria: inputGaleriaPerfilRef, arquivos: inputArquivoPerfilRef },
          };
          return (
            <input
              key={`${tipo}-${origem}`}
              ref={refMap[tipo][origem]}
              type="file"
              accept="image/*"
              capture={capture}
              className="hidden"
              onChange={(e) => {
                handleSelecionarFoto(tipo, e.target.files?.[0] || null);
                e.currentTarget.value = '';
              }}
            />
          );
        })
      )}

      {modalPreviewAberto && previewImagemSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                  Preview ({previewImagemSelecionada.tipo})
                </h3>
                <p className="text-xs text-slate-500">{formatarBadgeFoto(previewImagemSelecionada)}</p>
              </div>
              <button type="button" onClick={handleFecharPreview} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 sm:p-4 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImagemSelecionada.url} alt="Preview" className="w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {showModalFonteFoto && tipoFonteFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-4">
            <h3 className="text-base font-semibold text-slate-900">
              Enviar foto {tipoFonteFoto === 'frontal' ? 'frontal' : 'de perfil'}
            </h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
              {tipoFonteFoto === 'frontal'
                ? 'Corpo inteiro de frente, ereto, braços afastados, luz frontal e fundo simples — isso melhora o BodyScan.'
                : 'Corpo inteiro de lado (perfil verdadeiro), silhueta completa, sem esconder o abdome — isso melhora o BodyScan.'}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button type="button" onClick={() => handleEscolherOrigemFoto('camera')} className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 bg-emerald-600 text-white text-sm font-semibold">
                <Camera className="h-4 w-4" /> Tirar foto
              </button>
              <button type="button" onClick={() => handleEscolherOrigemFoto('galeria')} className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-slate-200 text-sm font-semibold">
                <ImageIcon className="h-4 w-4" /> Escolher da galeria
              </button>
              <button type="button" onClick={() => handleEscolherOrigemFoto('arquivos')} className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-slate-200 text-sm font-semibold">
                <Upload className="h-4 w-4" /> Abrir arquivos
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => { setShowModalFonteFoto(false); setTipoFonteFoto(null); }} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-medium">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <BodyScanModal
        aberto={modalBodyScanAberto}
        onFechar={() => setModalBodyScanAberto(false)}
        viewer="paciente"
        semanaAtual={semanaBodyScan}
        onLoad={async () => {
          const res = await fetchPublicPatientApi(`${apiRoot}/bodyscan`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Erro ao carregar BodyScan');
          const week = Number(json.week);
          setSemanaBodyScan(Number.isFinite(week) && week > 0 ? week : null);
          return Array.isArray(json.scans) ? (json.scans as BodyScanPublicView[]) : [];
        }}
        bioStore={{
          load: async () => {
            const res = await fetchPublicPatientApi(`${apiRoot}/bioimpedancia`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao carregar bioimpedância');
            return Array.isArray(json.registros) ? (json.registros as BioImpedanciaRegistro[]) : [];
          },
          save: async (registros) => {
            const res = await fetchPublicPatientApi(`${apiRoot}/bioimpedancia`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ registros }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Erro ao salvar bioimpedância');
          },
        }}
        onDiscoverHistorical={async () => {
          const res = await fetchPublicPatientApi(
            `${apiRoot}/bodyscan/backfill`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dryRun: true }),
            }
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Erro ao descobrir histórico');
          return {
            foundPhotoWeeks: Number(json.foundPhotoWeeks) || 0,
            weeksWithFrontAndSide: Number(json.weeksWithFrontAndSide) || 0,
            eligibleWeeks: Number(json.eligibleWeeks) || 0,
            alreadyCompleted: Number(json.alreadyCompleted) || 0,
            pendingGeneration: Number(json.pendingGeneration) || 0,
            consentAccepted: true,
            weeks: Array.isArray(json.weeks) ? json.weeks : undefined,
          } satisfies BodyScanBackfillSummary;
        }}
        onBackfillHistorical={async () => {
          const res = await fetchPublicPatientApi(
            `${apiRoot}/bodyscan/backfill`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            }
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Erro ao preparar BodyScan');
          return {
            summary: {
              foundPhotoWeeks: Number(json.foundPhotoWeeks) || 0,
              eligibleWeeks: Number(json.eligibleWeeks) || 0,
              alreadyCompleted: Number(json.alreadyCompleted) || 0,
              pendingGeneration: Number(json.pendingGeneration) || 0,
              generated: Number(json.generated) || 0,
              skipped: Number(json.skipped) || 0,
              failed: Number(json.failed) || 0,
              consentAccepted: true,
            },
            scans: Array.isArray(json.scans) ? (json.scans as BodyScanPublicView[]) : [],
          };
        }}
      />
    </div>
  );
}
