export type SystemColorsTokens = {
  brand: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: {
      from: string;
      via?: string;
      to: string;
    };
  };
  surface: {
    background: string;
    card: string;
    modal: string;
    sidebar: string;
    navbar: string;
  };
  text: {
    primary: string;
    secondary: string;
    inverse: string;
  };
  border: {
    default: string;
    focus: string;
  };
  state: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  chart: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
  };
};

export type SystemColorsMetadata = {
  name: string;
  version: string;
  notes: string;
  updatedAt: string | null;
};

export type SystemColorsConfig = {
  metadata: SystemColorsMetadata;
  tokens: SystemColorsTokens;
};

export const SYSTEM_COLORS_STORAGE_KEY = 'oftware_system_colors_tokens_v1';

export const defaultSystemColorsTokens: SystemColorsTokens = {
  brand: {
    primary: '#16a34a',
    secondary: '#2563eb',
    accent: '#7c3aed',
    gradient: { from: '#7c3aed', via: '#2563eb', to: '#f97316' },
  },
  surface: {
    background: '#ffffff',
    card: '#ffffff',
    modal: '#ffffff',
    sidebar: '#ffffff',
    navbar: '#ffffff',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    inverse: '#ffffff',
  },
  border: {
    default: '#e5e7eb',
    focus: '#22c55e',
  },
  state: {
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#2563eb',
  },
  chart: {
    c1: '#059669',
    c2: '#2563eb',
    c3: '#f59e0b',
    c4: '#dc2626',
    c5: '#7c3aed',
  },
};

export const defaultSystemColorsMetadata: SystemColorsMetadata = {
  name: 'Osoftware Atual',
  version: '1.0.0',
  notes: '',
  updatedAt: null,
};

