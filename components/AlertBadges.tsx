'use client';

import { TriangleAlert, Baby, FlaskConical, ShieldAlert, Activity } from 'lucide-react';

export type AlertType = 'MISSED_DOSE' | 'GI_SEVERE' | 'PREGNANCY_FLAG' | 'LAB_ABNORMAL' | 'MEN2_RISK';

interface AlertBadgesProps {
  alerts: AlertType[];
}

const alertConfig: Record<AlertType, { icon: any; label: string; color: string }> = {
  MISSED_DOSE: { 
    icon: TriangleAlert, 
    label: 'Dose perdida', 
    color: 'bg-red-100 text-red-700' 
  },
  GI_SEVERE: { 
    icon: Activity, 
    label: 'GI grave', 
    color: 'bg-orange-100 text-orange-700' 
  },
  PREGNANCY_FLAG: { 
    icon: Baby, 
    label: 'Gestação', 
    color: 'bg-pink-100 text-pink-700' 
  },
  LAB_ABNORMAL: { 
    icon: FlaskConical, 
    label: 'Lab anormal', 
    color: 'bg-yellow-100 text-yellow-700' 
  },
  MEN2_RISK: { 
    icon: ShieldAlert, 
    label: 'Risco MEN2', 
    color: 'bg-purple-100 text-purple-700' 
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
        const config = alertConfig[alert];
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

