'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { connectDoctorSignatureProvider } from '@/lib/metaadmin/connectDoctorSignatureProvider';
import {
  canConnectSignatureProvider,
  doctorSignatureProviderFormFromStored,
  findDoctorSignatureProviderOption,
  getDoctorSignatureProviderGroups,
} from '@/lib/metaadmin/doctorSignatureProviders';
import { isBryCompatiblePscProvider } from '@/lib/signature/providers/bryPscNameMap';
import type { DoctorSignatureProviderConfig } from '@/types/doctorSignatureProvider';
import { DEFAULT_DOCTOR_SIGNATURE_PROVIDER_FORM } from '@/types/doctorSignatureProvider';
import { MedicoService } from '@/services/medicoService';

export type BrySignatureSessionReconnectPanelProps = {
  onClose: () => void;
  medicoId?: string;
  providerConfig?: DoctorSignatureProviderConfig | null;
};

function initialPscProviderFromConfig(
  providerConfig?: DoctorSignatureProviderConfig | null
): string {
  const form = providerConfig
    ? doctorSignatureProviderFormFromStored(providerConfig)
    : { ...DEFAULT_DOCTOR_SIGNATURE_PROVIDER_FORM };
  if (form.provider && form.provider !== 'none' && isBryCompatiblePscProvider(form.provider)) {
    return form.provider;
  }
  return '';
}

export default function BrySignatureSessionReconnectPanel({
  onClose,
  medicoId,
  providerConfig,
}: BrySignatureSessionReconnectPanelProps) {
  const [connecting, setConnecting] = useState(false);
  const [resolvingMedicoId, setResolvingMedicoId] = useState(false);
  const [resolvedMedicoId, setResolvedMedicoId] = useState<string | undefined>(() =>
    medicoId?.trim() || undefined
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pscProvider, setPscProvider] = useState(() => initialPscProviderFromConfig(providerConfig));

  useEffect(() => {
    const fromProp = medicoId?.trim();
    if (fromProp) {
      setResolvedMedicoId(fromProp);
      return;
    }

    let cancelled = false;
    setResolvingMedicoId(true);
    void (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const medico = await MedicoService.getMedicoByUserId(user.uid);
        if (!cancelled && medico?.id?.trim()) {
          setResolvedMedicoId(medico.id.trim());
        }
      } finally {
        if (!cancelled) setResolvingMedicoId(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [medicoId]);

  const pscProviderGroups = useMemo(
    () =>
      getDoctorSignatureProviderGroups().filter((g) =>
        g.options.some((o) => o.providerCategory === 'cloud_certificate')
      ),
    []
  );

  const pscOptions = useMemo(
    () => pscProviderGroups.flatMap((g) => g.options),
    [pscProviderGroups]
  );

  useEffect(() => {
    const initial = initialPscProviderFromConfig(providerConfig);
    if (initial) {
      setPscProvider(initial);
      return;
    }
    if (pscOptions[0]?.provider) {
      setPscProvider(pscOptions[0].provider);
    }
  }, [providerConfig, pscOptions]);

  const form = useMemo(
    () => ({
      ...DEFAULT_DOCTOR_SIGNATURE_PROVIDER_FORM,
      provider: pscProvider,
    }),
    [pscProvider]
  );

  const connectGate = canConnectSignatureProvider(form);
  const selectedOption = findDoctorSignatureProviderOption(pscProvider);

  const handleReconnect = useCallback(async () => {
    const id = resolvedMedicoId?.trim();
    if (!id) {
      setErrorMessage('Identificador do médico indisponível. Atualize a página e tente novamente.');
      return;
    }

    const gate = canConnectSignatureProvider(form);
    if (!gate.ok) {
      setErrorMessage(gate.reason ?? 'Selecione um certificado em nuvem.');
      return;
    }

    setErrorMessage(null);
    setConnecting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setErrorMessage('Faça login para autorizar a sessão de assinatura.');
        return;
      }

      const authToken = await user.getIdToken();
      const returnUrl = typeof window !== 'undefined' ? window.location.href : undefined;

      const result = await connectDoctorSignatureProvider({
        providerId: form.provider,
        form,
        medicoId: id,
        timestamps: {
          updatedAt: serverTimestamp(),
          connectedAt: serverTimestamp(),
        },
        returnUrl,
        authToken,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      if (result.mode === 'redirect') {
        window.location.href = result.authorizationUrl;
        return;
      }

      onClose();
    } catch (e) {
      console.error('[bry_session_reconnect]', e);
      setErrorMessage(
        e instanceof Error ? e.message : 'Não foi possível iniciar a autorização da sessão.'
      );
    } finally {
      setConnecting(false);
    }
  }, [resolvedMedicoId, form, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bry-session-reconnect-title"
      className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={connecting}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      <h3
        id="bry-session-reconnect-title"
        className="text-lg font-semibold text-gray-900 dark:text-white pr-8"
      >
        Sessão de assinatura expirada
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-4">
        Escolha o certificado em nuvem e autorize uma nova sessão no app do provedor (SafeID, VIDaaS,
        BirdID, etc.).
      </p>

      <div className="mb-4">
        <label
          htmlFor="bry-reconnect-psc-provider"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Certificado em nuvem (PSC)
        </label>
        <select
          id="bry-reconnect-psc-provider"
          value={pscProvider}
          onChange={(e) => setPscProvider(e.target.value)}
          disabled={connecting}
          className="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
        >
          {!pscProvider && <option value="">Selecione o provedor</option>}
          {pscProviderGroups.map((group) => (
            <optgroup key={group.groupLabel} label={group.groupLabel}>
              {group.options.map((opt) => (
                <option key={opt.provider} value={opt.provider}>
                  {opt.providerLabel}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {selectedOption && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Será aberto o fluxo de autorização do {selectedOption.providerLabel}, como em Meu Perfil.
          </p>
        )}
      </div>

      {!connectGate.ok && pscProvider && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          {connectGate.reason}
        </p>
      )}

      {errorMessage && (
        <p
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={connecting || resolvingMedicoId || !resolvedMedicoId || !connectGate.ok}
          onClick={() => void handleReconnect()}
          title={!connectGate.ok ? connectGate.reason : undefined}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {connecting || resolvingMedicoId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {connecting
            ? 'Redirecionando...'
            : resolvingMedicoId
              ? 'Carregando...'
              : 'Autorizar nova sessão'}
        </button>
        <button
          type="button"
          disabled={connecting}
          onClick={onClose}
          className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
