import { describe, expect, it } from 'vitest';
import {
  getConnectionButtonConfig,
  resolveDisplayedConnectionStatus,
} from '@/lib/metaadmin/doctorSignatureProviderConnectionUi';
import {
  buildDoctorSignatureProviderPayload,
  canConnectSignatureProvider,
} from '@/lib/metaadmin/doctorSignatureProviders';
import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';

describe('resolveDisplayedConnectionStatus', () => {
  it('provider none → not_configured e botão desabilitado', () => {
    expect(resolveDisplayedConnectionStatus('none', null)).toBe('not_configured');
    expect(getConnectionButtonConfig('not_configured').disabled).toBe(true);
    expect(getConnectionButtonConfig('not_configured').label).toBe('Conectar provedor');
  });

  it('provider real pendente → integração pendente', () => {
    expect(resolveDisplayedConnectionStatus('bry', null)).toBe('selected_pending_integration');
    const btn = getConnectionButtonConfig('selected_pending_integration');
    expect(btn.disabled).toBe(false);
    expect(btn.label).toBe('Conectar provedor');
  });

  it('provider connected no storage → badge verde e Reconectar', () => {
    const stored = {
      provider: 'sandbox_mock' as const,
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox' as const,
      status: 'connected' as const,
    };
    expect(resolveDisplayedConnectionStatus('sandbox_mock', stored)).toBe('connected');
    expect(getConnectionButtonConfig('connected').label).toBe('Reconectar');
    expect(isSignatureProviderConnected(stored)).toBe(true);
  });

  it('status ausente no Firestore com mesmo provedor → integração pendente e botão ativo', () => {
    const stored = {
      provider: 'bry_cloud',
      providerLabel: 'BRy Cloud',
      providerCategory: 'signature_platform' as const,
    };
    expect(resolveDisplayedConnectionStatus('bry_cloud', stored)).toBe('selected_pending_integration');
    expect(getConnectionButtonConfig('selected_pending_integration').disabled).toBe(false);
  });

  it('trocar de sandbox connected para outro → selected_pending_integration', () => {
    const stored = {
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox',
      status: 'connected' as const,
      connectedAt: new Date(),
    };
    expect(resolveDisplayedConnectionStatus('vidas_valid', stored)).toBe('selected_pending_integration');

    const saved = buildDoctorSignatureProviderPayload(
      { provider: 'vidas_valid', customProviderName: '', customProviderUrl: '', customProviderNotes: '' },
      new Date(),
      { preserveConnectionFrom: stored }
    );
    expect(saved.status).toBe('selected_pending_integration');
    expect(saved.connectedAt).toBeUndefined();
  });
});

describe('canConnectSignatureProvider', () => {
  it('sandbox não exige campos extras', () => {
    expect(
      canConnectSignatureProvider({
        provider: 'sandbox_mock',
        customProviderName: '',
        customProviderUrl: '',
        customProviderNotes: '',
      }).ok
    ).toBe(true);
  });

  it('other exige nome', () => {
    expect(
      canConnectSignatureProvider({
        provider: 'other',
        customProviderName: '',
        customProviderUrl: '',
        customProviderNotes: '',
      }).ok
    ).toBe(false);
  });
});

describe('buildDoctorSignatureProviderPayload sandbox connected', () => {
  it('preserva connected ao salvar mesmo provedor', () => {
    const prev = {
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox' as const,
      status: 'connected' as const,
      connectedAt: new Date('2024-01-01'),
    };
    const next = buildDoctorSignatureProviderPayload(
      {
        provider: 'sandbox_mock',
        customProviderName: '',
        customProviderUrl: '',
        customProviderNotes: '',
      },
      new Date(),
      { preserveConnectionFrom: prev }
    );
    expect(next.status).toBe('connected');
    expect(next.connectedAt).toEqual(prev.connectedAt);
  });
});
