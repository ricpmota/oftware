'use client';

import type { AlertaType } from '@/types/obesidade';
import type { LucideIcon } from 'lucide-react';
import {
  TriangleAlert,
  Baby,
  FlaskConical,
  ShieldAlert,
  Activity,
  Info,
  Stethoscope,
  Droplets,
  Candy,
  Waves,
  Wrench,
} from 'lucide-react';

interface AlertBadgesProps {
  /** Strings vindas do Firestore / alertEngine — pode incluir todos os `AlertaType`. */
  alerts: AlertaType[] | string[];
}

const alertConfig: Record<AlertaType, { icon: LucideIcon; label: string; color: string }> = {
  MISSED_DOSE: {
    icon: TriangleAlert,
    label: 'Dose perdida',
    color: 'bg-red-100 text-red-700',
  },
  GI_MILD: {
    icon: Info,
    label: 'GI leve',
    color: 'bg-blue-100 text-blue-800',
  },
  GI_SEVERE: {
    icon: Activity,
    label: 'GI grave',
    color: 'bg-orange-100 text-orange-700',
  },
  PREGNANCY_FLAG: {
    icon: Baby,
    label: 'Gestação',
    color: 'bg-pink-100 text-pink-700',
  },
  MEN2_RISK: {
    icon: ShieldAlert,
    label: 'Risco MEN2',
    color: 'bg-purple-100 text-purple-700',
  },
  PANCREATITIS_SUSPECTED: {
    icon: Stethoscope,
    label: 'Pancreatite (suspeita)',
    color: 'bg-red-100 text-red-800',
  },
  RENAL_DECLINE: {
    icon: Droplets,
    label: 'Função renal',
    color: 'bg-amber-100 text-amber-800',
  },
  HYPOGLYCEMIA_RISK: {
    icon: Candy,
    label: 'Risco hipoglicemia',
    color: 'bg-orange-100 text-orange-800',
  },
  LAB_ABNORMAL: {
    icon: FlaskConical,
    label: 'Lab anormal',
    color: 'bg-yellow-100 text-yellow-700',
  },
  EDEMA_SEVERE: {
    icon: Waves,
    label: 'Edema grave',
    color: 'bg-rose-100 text-rose-800',
  },
  TECHNICAL_EVENT: {
    icon: Wrench,
    label: 'Evento técnico',
    color: 'bg-slate-100 text-slate-700',
  },
};

/**
 * Componente que renderiza badges de alertas clínicos
 */
export function AlertBadges({ alerts }: AlertBadgesProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {alerts.map((alert, index) => {
        const config = alertConfig[alert as AlertaType];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <span
            key={index}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
          >
            <Icon size={14} />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

