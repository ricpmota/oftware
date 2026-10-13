'use client';

import { useState } from 'react';
import { setMatchDiscoverable } from '@/services/matchSocialClient';

export function MatchDiscoveryOptIn({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    const next = !enabled;
    setSaving(true);
    try {
      const result = await setMatchDiscoverable(next);
      onChange(result.discoverable);
    } catch {
      onChange(enabled);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'Você está visível no Match' : 'Você não está visível no Match'}
        disabled={saving}
        onClick={() => void toggle()}
        className={`flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-colors ${
          enabled ? 'bg-[#4CCB7A]' : 'bg-white/30'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-[20px]' : 'translate-x-0'}`}
        />
      </button>
  );
}
