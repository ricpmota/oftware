'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  badge?: {
    text: string;
    color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  };
  variation?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
    percentage?: boolean;
  };
  subtitle?: string;
}

export default function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  badge, 
  variation, 
  subtitle 
}: KpiCardProps) {
  const badgeColors = {
    green: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-slate-100 text-slate-700'
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-gray-600" />}
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        </div>
        {badge && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColors[badge.color]}`}>
            {badge.text}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        
        {variation && (
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold ${trendColors[variation.trend]}`}>
              {variation.trend === 'up' ? '↑' : variation.trend === 'down' ? '↓' : '→'} {variation.value}
              {variation.percentage && '%'}
            </span>
          </div>
        )}

        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

