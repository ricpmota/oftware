'use client';

import { useCallback, useEffect, useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { connectDoctorSignatureProvider } from '@/lib/metaadmin/connectDoctorSignatureProvider';
import {
  canConnectSignatureProvider,
  doctorSignatureProviderCategoryLabel,
  doctorSignatureProviderStatusLabel,
  findDoctorSignatureProviderOption,
  getDoctorSignatureProviderGroups,
  isPhysicalCertificateProvider,
  isProviderSelectableInProfile,
} from '@/lib/metaadmin/doctorSignatureProviders';
import {
  doctorSignatureProviderBadgeClass,
  doctorSignatureProviderBadgeLabel,
  getConnectionButtonConfig,
  resolveDisplayedConnectionStatus,
} from '@/lib/metaadmin/doctorSignatureProviderConnectionUi';
import { resolveBrySignatureSessionDisplay } from '@/lib/metaadmin/brySignatureSessionDisplay';
import { usesBryCloudSigning } from '@/lib/signature/providers/bryPscNameMap';
import type {
  DoctorSignatureProvider,
  DoctorSignatureProviderFormState,
} from '@/types/doctorSignatureProvider';

type Props = {
  value: DoctorSignatureProviderFormState;
  onChange: (value: DoctorSignatureProviderFormState) => void;
  stored?: DoctorSignatureProvider | null;
  medicoId?: string | null;
  disabled?: boolean;
  onProviderConfigSaved?: (config: DoctorSignatureProvider) => void;
  onNotify?: (message: string) => void;
  /** Token Firebase para OAuth BRy Cloud (server-side). */
  getAuthToken?: () => Promise<string | null>;
};

export default function DoctorSignatureProviderSection({
  value,
  onChange,
  stored,
  medicoId,
  disabled,
  onProviderConfigSaved,
  onNotify,
  getAuthToken,
}: Props) {
  const [connecting, setConnecting] = useState(false);
  const [connectFeedback, setConnectFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const selected = findDoctorSignatureProviderOption(value.provider);
  const legacyPhysicalSelected = isPhysicalCertificateProvider(value.provider);
  const connectionStatus = resolveDisplayedConnectionStatus(value.provider, stored);
  const signatureSession =
    stored && usesBryCloudSigning(stored)
      ? resolveBrySignatureSessionDisplay(stored.connection)
      : null;
  const buttonConfig = getConnectionButtonConfig(connectionStatus, signatureSession);
  const connectGate = canConnectSignatureProvider(value);
  const legacyProviderSelected =
    value.provider !== 'none' && !isProviderSelectableInProfile(value.provider);
  const connectButtonDisabled =
    disabled || connecting || !connectGate.ok || legacyProviderSelected;
  const providerGroups = getDoctorSignatureProviderGroups();

  const handleProviderSelect = useCallback(
    (newProvider: string) => {
      onChange({ ...value, provider: newProvider });
    },
    [onChange, value]
  );

  const handleConnectClick = useCallback(async () => {
    const gate = canConnectSignatureProvider(value);
    if (!gate.ok) {
      const text = gate.reason ?? 'Não foi possível conectar.';
      setConnectFeedback({ type: 'error', text });
      onNotify?.(text);
      return;
    }

    setConnectFeedback(null);
    setConnecting(true);
    try {
      const returnUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/metaadmin` : undefined;

      const authToken = getAuthToken ? await getAuthToken() : undefined;

      const result = await connectDoctorSignatureProvider({
        providerId: value.provider,
        form: value,
        medicoId: medicoId?.trim() ?? '',
        timestamps: {
          updatedAt: serverTimestamp(),
          connectedAt: serverTimestamp(),
        },
        returnUrl,
        authToken: authToken ?? undefined,
      });

      if (!result.ok) {
        setConnectFeedback({ type: 'error', text: result.error });
        onNotify?.(result.error);
        return;
      }

      if (result.mode === 'redirect') {
        setConnectFeedback({
          type: 'success',
          text: 'Redirecionando para autorização do provedor...',
        });
        window.location.href = result.authorizationUrl;
        return;
      }

      onProviderConfigSaved?.(result.config);
      setConnectFeedback({ type: 'success', text: result.successMessage });
      onNotify?.(result.successMessage);
    } catch (e) {
      console.error('Erro ao conectar provedor de assinatura:', e);
      const text = 'Erro ao conectar provedor de assinatura.';
      setConnectFeedback({ type: 'error', text });
      onNotify?.(text);
    } finally {
      setConnecting(false);
    }
  }, [value, medicoId, onNotify, onProviderConfigSaved, getAuthToken]);

  useEffect(() => {
    setConnectFeedback(null);
  }, [value.provider]);

  return (
    <div className="md:col-span-2 mt-2 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Assinatura Digital</h3>

      {(legacyPhysicalSelected || legacyProviderSelected) && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            {stored?.providerLabel
              ? `O provedor salvo (“${stored.providerLabel}”) não está disponível para conexão no Oftware. `
              : 'O provedor salvo não está disponível para conexão no Oftware. '}
            Selecione um provedor abaixo e clique em Conectar provedor.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="doctor-signature-provider" className="block text-sm font-medium text-gray-700 mb-2">
          Provedor de assinatura
        </label>
        <select
          id="doctor-signature-provider"
          value={value.provider}
          onChange={(e) => handleProviderSelect(e.target.value)}
          disabled={disabled || connecting}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {legacyProviderSelected && (
            <optgroup label="Provedor salvo (substitua)">
              <option value={value.provider}>
                {stored?.providerLabel ?? selected?.providerLabel ?? value.provider} — não disponível
              </option>
            </optgroup>
          )}
          {providerGroups.map((group) => (
            <optgroup key={group.groupLabel} label={group.groupLabel}>
              {group.options.map((opt) => (
                <option key={opt.provider} value={opt.provider}>
                  {opt.providerLabel}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {selected && value.provider !== 'none' && (
          <p className="mt-2 text-xs text-gray-500">
            Categoria: {doctorSignatureProviderCategoryLabel(selected.providerCategory)}
            {' · '}
            Preferência: {doctorSignatureProviderStatusLabel(connectionStatus)}
          </p>
        )}
      </div>

      {value.provider === 'other' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="custom-provider-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome do provedor *
            </label>
            <input
              id="custom-provider-name"
              type="text"
              value={value.customProviderName}
              onChange={(e) => onChange({ ...value, customProviderName: e.target.value })}
              disabled={disabled || connecting}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Ex.: Nome da empresa ou serviço"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="custom-provider-url" className="block text-sm font-medium text-gray-700 mb-2">
              URL / site
            </label>
            <input
              id="custom-provider-url"
              type="url"
              value={value.customProviderUrl}
              onChange={(e) => onChange({ ...value, customProviderUrl: e.target.value })}
              disabled={disabled || connecting}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="https://"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="custom-provider-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Observação (opcional)
            </label>
            <textarea
              id="custom-provider-notes"
              rows={2}
              value={value.customProviderNotes}
              onChange={(e) => onChange({ ...value, customProviderNotes: e.target.value })}
              disabled={disabled || connecting}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Informações adicionais sobre o provedor"
            />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-sm font-medium text-gray-700">Status da conexão</span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doctorSignatureProviderBadgeClass(connectionStatus)}`}
          >
            {doctorSignatureProviderBadgeLabel(connectionStatus)}
          </span>
        </div>

        {buttonConfig.helperText && connectGate.ok && (
          <p className="text-sm text-gray-600 mb-3">{buttonConfig.helperText}</p>
        )}

        {connectionStatus === 'connected' && signatureSession?.active && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            <p className="font-medium">Sessão de assinatura ativa</p>
            <p className="mt-1">
              Documentos assinados nesta sessão: {signatureSession.usedDocuments}/
              {signatureSession.maxDocuments}
            </p>
            <p className="mt-1 text-green-800">
              Validade da sessão: até {signatureSession.expiresAtLabel}
            </p>
          </div>
        )}

        {connectionStatus === 'connected' && signatureSession?.expired && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Sessão de assinatura expirada</p>
            <p className="mt-1">
              Autorize uma nova sessão para continuar assinando prescrições sem repetir o fluxo a
              cada documento enquanto a sessão estiver válida.
            </p>
          </div>
        )}

        {!connectGate.ok && value.provider !== 'none' && (
          <p className="text-sm text-amber-800 mb-3">{connectGate.reason}</p>
        )}

        {connectFeedback && (
          <p
            className={`text-sm mb-3 rounded-md px-3 py-2 border ${
              connectFeedback.type === 'error'
                ? 'text-red-800 bg-red-50 border-red-200'
                : 'text-green-800 bg-green-50 border-green-200'
            }`}
            role={connectFeedback.type === 'error' ? 'alert' : 'status'}
          >
            {connectFeedback.text}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleConnectClick()}
          disabled={connectButtonDisabled}
          title={connectButtonDisabled && connectGate.reason ? connectGate.reason : undefined}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? 'Conectando...' : buttonConfig.label}
        </button>
      </div>
    </div>
  );
}
