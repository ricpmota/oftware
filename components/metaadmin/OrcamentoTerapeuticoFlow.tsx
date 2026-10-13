'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ConfigurarValoresOrcamentoModal, {
  type ConfigOrcamentoFormValues,
} from '@/components/metaadmin/ConfigurarValoresOrcamentoModal';
import OrcamentoTerapeuticoModal from '@/components/metaadmin/OrcamentoTerapeuticoModal';
import { OrcamentoTerapeuticoConfigService } from '@/services/orcamentoTerapeuticoConfigService';
import type { PacienteCompleto } from '@/types/obesidade';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

type Props = {
  /** Fluxo ativo (usuário clicou em Orçamento). */
  active: boolean;
  medicoId: string | null | undefined;
  paciente: PacienteCompleto | null;
  onClose: () => void;
  onMessage?: (mensagem: string) => void;
};

export default function OrcamentoTerapeuticoFlow({
  active,
  medicoId,
  paciente,
  onClose,
  onMessage,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [config, setConfig] = useState<OrcamentoTerapeuticoConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showOrcamentoModal, setShowOrcamentoModal] = useState(false);
  const [modoConfigEdicao, setModoConfigEdicao] = useState(false);

  const onCloseRef = useRef(onClose);
  const onMessageRef = useRef(onMessage);
  onCloseRef.current = onClose;
  onMessageRef.current = onMessage;

  const pacienteId = paciente?.id?.trim() || '';
  const medicoIdTrim = medicoId?.trim() || '';

  const fecharTudo = useCallback(() => {
    setShowConfigModal(false);
    setShowOrcamentoModal(false);
    setModoConfigEdicao(false);
    setLoading(false);
    setSalvandoConfig(false);
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!active) {
      setShowConfigModal(false);
      setShowOrcamentoModal(false);
      setModoConfigEdicao(false);
      setLoading(false);
      return;
    }

    if (!medicoIdTrim) {
      onMessageRef.current?.('Perfil médico não encontrado. Não foi possível abrir o orçamento.');
      onCloseRef.current();
      return;
    }

    if (!pacienteId) {
      onCloseRef.current();
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const cfg = await OrcamentoTerapeuticoConfigService.getByMedico(medicoIdTrim);
        if (cancelled) return;
        setConfig(cfg);
        if (cfg) {
          setShowOrcamentoModal(true);
          setShowConfigModal(false);
        } else {
          setShowOrcamentoModal(false);
          setShowConfigModal(true);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração de orçamento:', error);
        if (!cancelled) {
          onMessageRef.current?.('Erro ao carregar configuração do orçamento.');
          onCloseRef.current();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, medicoIdTrim, pacienteId]);

  const salvarConfig = useCallback(
    async (values: ConfigOrcamentoFormValues, abrirOrcamentoApos: boolean) => {
      if (!medicoIdTrim) return;
      setSalvandoConfig(true);
      try {
        const isNew = !config;
        const saved = await OrcamentoTerapeuticoConfigService.save(medicoIdTrim, values, {
          isNew,
        });
        setConfig(saved);
        setShowConfigModal(false);
        setModoConfigEdicao(false);
        if (abrirOrcamentoApos) {
          setShowOrcamentoModal(true);
        }
        onMessageRef.current?.('Valores padrão do orçamento salvos.');
      } catch (error) {
        console.error('Erro ao salvar configuração de orçamento:', error);
        onMessageRef.current?.('Erro ao salvar configuração do orçamento.');
      } finally {
        setSalvandoConfig(false);
      }
    },
    [medicoIdTrim, config]
  );

  if (!active || !paciente) return null;

  return (
    <>
      {loading && !showOrcamentoModal && !showConfigModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-lg border border-slate-200">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-sm text-slate-700">Carregando orçamento…</span>
          </div>
        </div>
      )}

      {showOrcamentoModal && config && (
        <OrcamentoTerapeuticoModal
          open={showOrcamentoModal}
          paciente={paciente}
          config={config}
          onClose={fecharTudo}
          onEditarValoresPadrao={() => {
            setModoConfigEdicao(true);
            setShowConfigModal(true);
          }}
          onPlanoGerado={(msg) => onMessageRef.current?.(msg)}
        />
      )}

      <ConfigurarValoresOrcamentoModal
        open={showConfigModal}
        configAtual={config}
        salvando={salvandoConfig}
        titulo={
          modoConfigEdicao
            ? 'Editar Valores Padrão do Orçamento'
            : 'Configurar Valores do Orçamento'
        }
        subtitulo={
          modoConfigEdicao
            ? 'Alterações passam a valer para novos cálculos deste orçamento.'
            : 'Antes do primeiro orçamento, configure os valores usados no cálculo automático.'
        }
        botaoConfirmar={modoConfigEdicao ? 'Salvar e recalcular' : 'Salvar e continuar'}
        onClose={() => {
          if (modoConfigEdicao && config) {
            setShowConfigModal(false);
            setModoConfigEdicao(false);
            return;
          }
          fecharTudo();
        }}
        onSalvar={async (values) => {
          await salvarConfig(values, !modoConfigEdicao || !showOrcamentoModal);
        }}
      />
    </>
  );
}
