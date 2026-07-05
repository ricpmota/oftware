'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { fetchPublicPatientApi } from '@/lib/public/fetchPublicPatientApi';

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
  defaultAberto?: boolean;
};

export default function AplicacaoFotosEvolucaoSection({ token, defaultAberto = true }: Props) {
  const [fotoFrontalAtual, setFotoFrontalAtual] = useState<FotoProgresso | null>(null);
  const [fotoPerfilAtual, setFotoPerfilAtual] = useState<FotoProgresso | null>(null);
  const [historicoFrontal, setHistoricoFrontal] = useState<FotoProgresso[]>([]);
  const [historicoPerfil, setHistoricoPerfil] = useState<FotoProgresso[]>([]);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [previewImagemSelecionada, setPreviewImagemSelecionada] = useState<FotoProgresso | null>(null);
  const [compartilhamentoMedico, setCompartilhamentoMedico] = useState(true);
  const [uploadEmAndamentoFrontal, setUploadEmAndamentoFrontal] = useState(false);
  const [uploadEmAndamentoPerfil, setUploadEmAndamentoPerfil] = useState(false);
  const [erroFotos, setErroFotos] = useState<string | null>(null);
  const [fotosDetalhesAbertos, setFotosDetalhesAbertos] = useState(defaultAberto);
  const [fotoTabAtiva, setFotoTabAtiva] = useState<'frontal' | 'perfil'>('frontal');
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

  const atualizarHistoricos = (fotos: FotoProgresso[]) => {
    const frontal = ordenarFotos(fotos.filter((f) => f.tipo === 'frontal'));
    const perfil = ordenarFotos(fotos.filter((f) => f.tipo === 'perfil'));
    setHistoricoFrontal(frontal);
    setHistoricoPerfil(perfil);
    setFotoFrontalAtual(frontal[0] || null);
    setFotoPerfilAtual(perfil[0] || null);
  };

  const carregarHistoricoFotos = async () => {
    if (!token) return;
    try {
      const res = await fetchPublicPatientApi(`/api/aplicacao/${encodeURIComponent(token)}/fotos`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar histórico de fotos');
      const fotos = Array.isArray(json.fotos) ? (json.fotos as FotoProgresso[]) : [];
      setApplicationIdFotos(typeof json.applicationId === 'string' ? json.applicationId : null);
      atualizarHistoricos(fotos);
      if (typeof json.compartilharComMedico === 'boolean') {
        setCompartilhamentoMedico(Boolean(json.compartilharComMedico));
      }
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : 'Erro ao carregar histórico de fotos');
    }
  };

  useEffect(() => {
    if (!token) return;
    carregarHistoricoFotos();
  }, [token]);

  const salvarMetadataFoto = async (tipo: 'frontal' | 'perfil', file: File): Promise<FotoProgresso> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    formData.append('compartilharComMedico', String(compartilhamentoMedico));
    const res = await fetch(`/api/aplicacao/${token}/fotos`, {
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
        setFotoFrontalAtual(next[0] || foto);
      } else {
        const next = ordenarFotos([foto, ...historicoPerfil.filter((f) => f.id !== foto.id)]);
        setHistoricoPerfil(next);
        setFotoPerfilAtual(next[0] || foto);
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
    setDeletandoFotoId(foto.id);
    setErroFotos(null);
    try {
      const res = await fetch(`/api/aplicacao/${token}/fotos?photoId=${encodeURIComponent(foto.id)}`, {
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
      const res = await fetch(`/api/aplicacao/${token}/fotos/compartilhamento`, {
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

  const renderTab = (tipo: 'frontal' | 'perfil') => {
    const atual = tipo === 'frontal' ? fotoFrontalAtual : fotoPerfilAtual;
    const historico = tipo === 'frontal' ? historicoFrontal : historicoPerfil;
    const uploadEmAndamento = tipo === 'frontal' ? uploadEmAndamentoFrontal : uploadEmAndamentoPerfil;
    const bloqueio = tipo === 'frontal' ? bloqueioUploadFrontalSemanaAtual : bloqueioUploadPerfilSemanaAtual;
    const dica =
      tipo === 'frontal'
        ? 'Fique de frente, com postura natural e corpo centralizado.'
        : 'Fique de lado, mantendo o corpo inteiro visível no enquadramento.';

    return (
      <>
        <div className="mt-3 flex items-start justify-between gap-2">
          <p className="text-xs text-slate-600">{dica}</p>
          {uploadEmAndamento ? <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" /> : null}
        </div>
        {atual ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
            <button type="button" onClick={() => handleAbrirPreview(atual)} className="w-full overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={atual.url} alt={`Foto ${tipo}`} className="w-full h-44 object-cover" />
            </button>
            {!atual.id.startsWith('tmp-') ? (
              <button
                type="button"
                onClick={() => handleExcluirFoto(atual)}
                disabled={deletandoFotoId === atual.id}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs font-semibold hover:bg-red-100 disabled:opacity-60"
              >
                {deletandoFotoId === atual.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Excluir foto da semana
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => handleAbrirModalFonteFoto(tipo)}
            disabled={uploadEmAndamento || bloqueio}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-sm font-semibold transition-colors"
          >
            <Upload className="h-4 w-4" />
            Enviar foto {tipo === 'frontal' ? 'frontal' : 'de perfil'}
          </button>
          {bloqueio ? (
            <p className="mt-2 text-[11px] text-amber-700">
              Você já registrou a foto {tipo === 'frontal' ? 'frontal' : 'de perfil'} desta semana.
            </p>
          ) : null}
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">
            Histórico {tipo}
          </p>
          {historico.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {historico.map((foto) => (
                <button
                  key={foto.id}
                  type="button"
                  onClick={() => handleAbrirPreview(foto)}
                  className="shrink-0 w-24 rounded-lg border border-slate-200 overflow-hidden bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.url} alt="Miniatura" className="w-full h-20 object-cover" />
                  <span className="block px-1.5 py-1 text-[10px] font-medium text-slate-600 bg-slate-50">
                    {formatarBadgeFoto(foto)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center">
              <ImageIcon className="h-4 w-4 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-medium text-slate-700">Nenhuma foto registrada ainda</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setFotosDetalhesAbertos((v) => !v)}
        className="w-full px-1 py-1 flex items-center justify-between"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Camera className="h-4 w-4" />
          </span>
          Fotos do seu progresso
        </span>
        {fotosDetalhesAbertos ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {fotosDetalhesAbertos && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleAtualizarCompartilhamento(!compartilhamentoMedico)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 flex items-center gap-3"
          >
            <span className="flex-1 text-left text-sm font-medium text-slate-800 leading-snug">
              Permitir que minha equipe médica visualize minhas fotos
            </span>
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                compartilhamentoMedico ? 'bg-emerald-500 border-emerald-500' : 'bg-red-600 border-red-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white border border-slate-300 shadow-md transition-transform mt-0.5 ${
                  compartilhamentoMedico ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
              {(['frontal', 'perfil'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFotoTabAtiva(tab)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold border transition-all ${
                    fotoTabAtiva === tab
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  Foto {tab}
                </button>
              ))}
            </div>
            {fotoTabAtiva === 'frontal' ? renderTab('frontal') : renderTab('perfil')}
          </div>
        </div>
      )}

      {erroFotos ? (
        <p className="text-xs font-medium text-red-600 rounded-xl bg-red-50 border border-red-100 px-3 py-2">{erroFotos}</p>
      ) : null}

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
    </div>
  );
}
