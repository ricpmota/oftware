'use client';

import React, { useEffect } from 'react';
import { applySystemColors } from '@/lib/systemColors/applySystemColors';
import {
  defaultSystemColorsMetadata,
  defaultSystemColorsTokens,
  SYSTEM_COLORS_STORAGE_KEY,
  type SystemColorsConfig,
  type SystemColorsTokens,
} from '@/lib/systemColors/systemColorsTokens';

function isHex(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v);
}

function isTokensShape(tokens: any): tokens is SystemColorsTokens {
  return (
    tokens &&
    typeof tokens === 'object' &&
    tokens.brand?.primary &&
    isHex(tokens.brand.primary) &&
    isHex(tokens.surface?.background) &&
    isHex(tokens.text?.primary) &&
    isHex(tokens.border?.default) &&
    isHex(tokens.state?.success) &&
    isHex(tokens.chart?.c1)
  );
}

function loadConfigFromLocalStorage(): SystemColorsConfig | null {
  try {
    const raw = localStorage.getItem(SYSTEM_COLORS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;

    // V1: apenas tokens
    if (isTokensShape(parsed)) {
      return { metadata: defaultSystemColorsMetadata, tokens: parsed };
    }

    // V2: { metadata, tokens }
    const tokens = parsed?.tokens;
    const metadata = parsed?.metadata ?? defaultSystemColorsMetadata;
    if (isTokensShape(tokens)) {
      return { metadata, tokens };
    }
    return null;
  } catch {
    return null;
  }
}

export default function SystemColorsCssVarsLoader() {
  useEffect(() => {
    const config = loadConfigFromLocalStorage();
    if (config?.tokens) {
      applySystemColors(config.tokens);
      return;
    }
    // Fallback seguro: sempre aplicar defaults (garante variáveis existirem)
    applySystemColors(defaultSystemColorsTokens);
  }, []);

  return null;
}

