'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { BarChart3, Camera, ChevronLeft, ChevronRight, Quote, X } from 'lucide-react';
import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';
import { db } from '@/lib/firebase';
import {
  ProgressPhotosCarouselModal,
  type FotoProgressoCarousel,
} from '@/components/progressPhotos/ProgressPhotosCarouselModal';
import { BodyScanModal } from '@/components/bodyscan/BodyScanModal';
import {
  backfillBodyScansForMetaAdminPatient,
  discoverBodyScansForMetaAdminPatient,
  loadBodyScansFromFirestoreClient,
} from '@/lib/bodyscan/loadBodyScansClient';
import {
  listDepoimentosSlidesFromPlano,
  temDepoimentosAssociadosAoPlano,
  type MetaAdminDepoimentoSlide,
} from '@/utils/conclusaoTratamentoHistorico';
import type { PacienteCompleto } from '@/types/obesidade';

export function useFotosCompartilhadasMedico(pacienteIds: string[]) {
  const idsKey = useMemo(() => [...new Set(pacienteIds.filter(Boolean))].sort().join(','), [pacienteIds]);
  const [mapa, setMapa] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setMapa({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDocs(
              query(
                collection(db, 'pacientes_completos', id, 'progressPhotos'),
                where('compartilharComMedico', '==', true),
                limit(1)
              )
            );
            return [id, !snap.empty] as const;
          } catch {
            return [id, false] as const;
          }
        })
      );
      if (cancelled) return;
      setMapa((prev) => {
        const next = { ...prev };
        for (const [id, tem] of entries) next[id] = tem;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const marcarTemFoto = useCallback((pacienteId: string, tem: boolean) => {
    setMapa((prev) => ({ ...prev, [pacienteId]: tem }));
  }, []);

  return { fotosPorPacienteId: mapa, marcarTemFoto };
}

export function usePacienteFotosCarouselModal(
  onTemFoto?: (pacienteId: string, tem: boolean) => void
) {
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fotos, setFotos] = useState<FotoProgressoCarousel[]>([]);
  const [bodyScanAberto, setBodyScanAberto] = useState(false);

  const abrir = useCallback((p: PacienteCompleto) => {
    setPaciente(p);
    setAberto(true);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    setPaciente(null);
    setFotos([]);
  }, []);

  useEffect(() => {
    if (!aberto || !paciente?.id) {
      setFotos([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'pacientes_completos', paciente.id, 'progressPhotos'),
            where('compartilharComMedico', '==', true)
          )
        );
        if (cancelled) return;
        const loaded = snap.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            const createdAtRaw = data.createdAt as
              | { toDate?: () => Date }
              | Date
              | string
              | undefined;
            const createdAtIso =
              createdAtRaw instanceof Date
                ? createdAtRaw.toISOString()
                : typeof createdAtRaw === 'string'
                  ? createdAtRaw
                  : typeof createdAtRaw?.toDate === 'function'
                    ? createdAtRaw.toDate().toISOString()
                    : undefined;
            return {
              id: d.id,
              tipo: data.tipo === 'perfil' ? 'perfil' : 'frontal',
              url: String(data.url || ''),
              semana: typeof data.semana === 'number' ? data.semana : undefined,
              dataAplicacao: data.dataAplicacao ? String(data.dataAplicacao) : undefined,
              createdAtIso,
            };
          })
          .filter((f) => !!f.url)
          .sort((a, b) => {
            const ta = new Date(a.createdAtIso || a.dataAplicacao || 0).getTime();
            const tb = new Date(b.createdAtIso || b.dataAplicacao || 0).getTime();
            return tb - ta;
          })
          .map(({ createdAtIso: _c, ...rest }) => rest);
        setFotos(loaded);
        onTemFoto?.(paciente.id, loaded.length > 0);
      } catch (error) {
        console.error('Erro ao carregar fotos compartilhadas:', error);
        if (!cancelled) setFotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aberto, paciente?.id, onTemFoto]);

  const openBodyScan = useCallback(() => {
    if (!paciente?.id) return;
    setAberto(false);
    setBodyScanAberto(true);
  }, [paciente?.id]);

  const modal = (
    <>
      <ProgressPhotosCarouselModal
        aberto={aberto}
        onFechar={fechar}
        titulo="Registro fotográfico"
        subtitulo={
          paciente
            ? paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente'
            : undefined
        }
        fotos={fotos}
        loading={loading}
        onOpenBodyScan={paciente?.id ? openBodyScan : undefined}
      />
      {paciente?.id ? (
        <BodyScanModal
          aberto={bodyScanAberto}
          onFechar={() => setBodyScanAberto(false)}
          viewerLabel="Visão profissional"
          viewer="profissional"
          pacienteId={paciente.id}
          onLoad={() => loadBodyScansFromFirestoreClient(paciente.id)}
          onDiscoverHistorical={() => discoverBodyScansForMetaAdminPatient(paciente.id)}
          onBackfillHistorical={() => backfillBodyScansForMetaAdminPatient(paciente.id)}
        />
      ) : null}
    </>
  );

  return { abrirFotos: abrir, fecharFotos: fechar, fotosModal: modal };
}

type DepoimentoModalState = {
  pacienteNome: string;
  paciente: PacienteCompleto;
};

export function PacienteDepoimentoLeituraModal({
  state,
  onFechar,
  overlayClassName = 'z-[65]',
}: {
  state: DepoimentoModalState | null;
  onFechar: () => void;
  /** Sobrepõe o overlay (ex.: modal de tratamento mobile). */
  overlayClassName?: string;
}) {
  const slides = useMemo<MetaAdminDepoimentoSlide[]>(() => {
    if (!state) return [];
    return listDepoimentosSlidesFromPlano(
      (state.paciente.planoTerapeutico || null) as Record<string, unknown> | null
    );
  }, [state]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [state?.paciente.id]);

  if (!state) return null;
  const slide = slides[idx] || null;
  const n = slides.length;

  return (
    <div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/50 p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="depoimento-prof-titulo"
      onClick={onFechar}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-amber-200 dark:border-amber-800/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-950/40">
          <h2
            id="depoimento-prof-titulo"
            className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 min-w-0 pr-2"
          >
            <Quote className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
            Depoimento{n > 1 ? 's' : ''}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-5rem)]">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Paciente:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{state.pacienteNome}</span>
          </p>
          {n > 1 && slide ? (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setIdx((i) => (i - 1 + n) % n)}
                className="rounded-full p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                aria-label="Depoimento anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                {idx + 1} / {n}
              </span>
              <button
                type="button"
                onClick={() => setIdx((i) => (i + 1) % n)}
                className="rounded-full p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                aria-label="Próximo depoimento"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
          {slide ? (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    slide.origem === 'atual'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                      : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {slide.origem === 'atual' ? 'Conclusão atual' : 'Tratamento anterior'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{slide.labelData}</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                {slide.texto}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Nenhum depoimento encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type IconTone = 'default' | 'onLightCard' | 'onDarkCard';

export function PacienteCardMediaIcons({
  paciente,
  temFoto,
  onOpenGrafico,
  onOpenFotos,
  onOpenDepoimento,
  size = 18,
  tone = 'default',
  className = '',
  showDepoimento = true,
  officialIcons = false,
}: {
  paciente: PacienteCompleto;
  temFoto?: boolean;
  onOpenGrafico: () => void;
  onOpenFotos: () => void;
  onOpenDepoimento?: () => void;
  size?: number;
  tone?: IconTone;
  className?: string;
  showDepoimento?: boolean;
  /** Calendário: ícones oficiais do Método. Os demais cards permanecem com Lucide. */
  officialIcons?: boolean;
}) {
  const temDepoimento = temDepoimentosAssociadosAoPlano(
    (paciente.planoTerapeutico || null) as Record<string, unknown> | null
  );
  const btnBase =
    tone === 'onLightCard' || tone === 'onDarkCard' ? 'p-1.5 rounded-md' : 'p-1 rounded-md';
  const graficoCls =
    tone === 'onLightCard'
      ? `${btnBase} text-[#0A1F44] hover:bg-[#0A1F44]/10`
      : tone === 'onDarkCard'
        ? `${btnBase} text-[#E8EDED] hover:bg-white/10`
        : `${btnBase} text-blue-600 hover:bg-blue-50`;
  const fotoAtivaCls =
    tone === 'onLightCard'
      ? `${btnBase} text-[#0A1F44] hover:bg-[#0A1F44]/10`
      : tone === 'onDarkCard'
        ? `${btnBase} text-[#E8EDED] hover:bg-white/10`
        : `${btnBase} text-violet-600 hover:bg-violet-50`;
  const fotoInativaCls =
    tone === 'onDarkCard'
      ? `${btnBase} text-[#E8EDED]/40`
      : `${btnBase} text-gray-400`;
  const depAtivaCls = `${btnBase} text-pink-600 hover:bg-pink-50`;
  const depInativaCls = `${btnBase} text-gray-300`;

  const officialBtn = 'inline-flex shrink-0 items-center justify-center transition-transform hover:scale-[1.04]';

  return (
    <div className={`flex items-center flex-shrink-0 ${officialIcons ? '' : 'gap-0.5'} ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenGrafico();
        }}
        className={officialIcons ? officialBtn : graficoCls}
        title="Gráfico e registros do paciente"
        aria-label="Gráfico e registros do paciente"
      >
        {officialIcons ? <MetodoEmagrecerIcon icon="grafico" size={size} /> : <BarChart3 size={size} />}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenFotos();
        }}
        className={officialIcons ? (temFoto ? officialBtn : 'inline-flex shrink-0 items-center justify-center') : temFoto ? fotoAtivaCls : fotoInativaCls}
        title="Registro fotográfico compartilhado"
        aria-label="Registro fotográfico compartilhado"
      >
        {officialIcons ? (
          <MetodoEmagrecerIcon icon="fotografia" variant={temFoto ? 'active' : 'inactive'} size={size} />
        ) : (
          <Camera size={size} />
        )}
      </button>
      {showDepoimento ? (
        temDepoimento && onOpenDepoimento ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDepoimento();
            }}
            className={depAtivaCls}
            title="Ver depoimento do paciente"
            aria-label="Ver depoimento do paciente"
          >
            <Quote size={size} />
          </button>
        ) : (
          <span className={depInativaCls} title="Sem depoimento" aria-label="Sem depoimento">
            <Quote size={size} />
          </span>
        )
      ) : null}
    </div>
  );
}

export { temDepoimentosAssociadosAoPlano };
