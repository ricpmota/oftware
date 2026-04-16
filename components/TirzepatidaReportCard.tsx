'use client';

import type { RelatorioTirzepatidaResponse } from '@/types/relatoriosTirzepatida';

function formatDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export interface TirzepatidaReportCardProps {
  data: RelatorioTirzepatidaResponse;
  dateStart: string;
  dateEnd: string;
  /** If true, render at full 1080x1350 for export; if false, scale for preview */
  exportSize?: boolean;
  className?: string;
}

export default function TirzepatidaReportCard({ data, dateStart, dateEnd, exportSize = false, className = '' }: TirzepatidaReportCardProps) {
  const periodText = `${formatDate(dateStart)} – ${formatDate(dateEnd)}`;
  const medianaDisplay = data.medianaPerdaPesoPercent > 0 ? `–${data.medianaPerdaPesoPercent}%` : `${data.medianaPerdaPesoPercent}%`;
  const m4 = data.mediana4SemanasPercent != null && data.mediana4SemanasPercent > 0 ? `–${data.mediana4SemanasPercent}%` : (data.mediana4SemanasPercent === 0 ? '—' : `${data.mediana4SemanasPercent}%`);
  const m8 = data.mediana8SemanasPercent != null && data.mediana8SemanasPercent > 0 ? `–${data.mediana8SemanasPercent}%` : (data.mediana8SemanasPercent === 0 ? '—' : `${data.mediana8SemanasPercent}%`);
  const m12 = data.mediana12SemanasPercent != null && data.mediana12SemanasPercent > 0 ? `–${data.mediana12SemanasPercent}%` : (data.mediana12SemanasPercent === 0 ? '—' : `${data.mediana12SemanasPercent}%`);

  const isExport = exportSize;
  const px = (v: number) => (isExport ? v : Math.round(v / 3));
  const GRADIENT_HEADER = 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #312e81 100%)';
  const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return (
    <div
      className={className}
      style={{
        width: isExport ? 1080 : '100%',
        maxWidth: isExport ? 1080 : 360,
        height: isExport ? 1350 : 'auto',
        minHeight: isExport ? 1350 : 450,
        background: '#fafafa',
        borderRadius: isExport ? 24 : 12,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily,
      }}
    >
      {/* —— HEADER (gradient) —— */}
      <div
        style={{
          background: GRADIENT_HEADER,
          padding: `${px(28)}px ${px(40)}px ${px(24)}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: px(6),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12), marginBottom: px(4) }}>
          <img
            src="/icones/oftware.png"
            alt="Oftware"
            width={isExport ? 36 : 28}
            height={isExport ? 36 : 28}
            style={{ display: 'block', borderRadius: 8 }}
          />
          <span
            style={{
              fontSize: px(14),
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.95)',
            }}
          >
            OFTWARE
          </span>
        </div>
        <div style={{ fontSize: px(22), fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          Resultados do acompanhamento metabólico
        </div>
        <div style={{ fontSize: px(14), color: 'rgba(255,255,255,0.85)' }}>
          Tirzepatida + suporte médico
        </div>
        <div style={{ fontSize: px(12), color: 'rgba(255,255,255,0.7)' }}>
          Período analisado: {periodText}
        </div>
      </div>

      {/* —— CONTEÚDO —— */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: px(32),
          display: 'flex',
          flexDirection: 'column',
          gap: px(20),
        }}
      >
        {/* BLOCO A — AMOSTRA (3 mini cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: px(16),
          }}
        >
          {[
            { icon: '👥', label: 'Pacientes', value: String(data.totalPacientes) },
            { icon: '⏱', label: 'Tempo mediano', value: `${data.semanasMedianasAcompanhamento} sem` },
            { icon: '💉', label: 'Aplicações médias', value: data.aplicacoesMediasPorPaciente.toFixed(1).replace('.', ',') },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: '#fff',
                borderRadius: px(12),
                padding: px(16),
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: px(20), marginBottom: px(4) }}>{item.icon}</div>
              <div style={{ fontSize: px(24), fontWeight: 700, color: '#0f172a' }}>{item.value}</div>
              <div style={{ fontSize: px(11), color: '#64748b', marginTop: px(2) }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* BLOCO B — HERO (resultado principal) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: px(16),
            padding: px(28),
            boxShadow: '0 10px 40px -10px rgba(15,23,42,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ fontSize: px(12), fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.8)', marginBottom: px(8) }}>
            MEDIANA DE PERDA DE PESO
          </div>
          <div style={{ fontSize: px(56), fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {medianaDisplay}
          </div>
          <div style={{ display: 'flex', gap: px(24), marginTop: px(16), flexWrap: 'wrap' }}>
            <span style={{ fontSize: px(15), color: 'rgba(255,255,255,0.9)' }}>≥5% → {data.percentualPacientesMaior5}%</span>
            <span style={{ fontSize: px(15), color: 'rgba(255,255,255,0.9)' }}>≥10% → {data.percentualPacientesMaior10}%</span>
          </div>
        </div>

        {/* BLOCO C — MARCOS DE TEMPO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: px(12),
          }}
        >
          {[
            { label: '4 semanas', value: m4 },
            { label: '8 semanas', value: m8 },
            { label: '12 semanas', value: m12 },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: '#f8fafc',
                borderRadius: px(10),
                padding: `${px(12)}px ${px(14)}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ fontSize: px(12), color: '#64748b' }}>{item.label}</span>
              <span style={{ fontSize: px(14), fontWeight: 600, color: '#0f172a' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* BLOCO D — ADERÊNCIA (progress-style) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(16) }}>
          {[
            { label: 'Continuidade ≥8 semanas', pct: data.percentualPacientes8Semanas },
            { label: 'Continuidade ≥12 semanas', pct: data.percentualPacientes12Semanas },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: px(11), color: '#64748b' }}>
                <span>{item.label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.pct}%</span>
              </div>
              <div
                style={{
                  height: px(8),
                  background: '#e2e8f0',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${item.pct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ (box cinza) */}
        <div
          style={{
            background: '#f1f5f9',
            borderRadius: px(12),
            padding: px(14),
            marginTop: 'auto',
            flexShrink: 0,
          }}
        >
          {data.totalPacientes < 30 && (
            <div style={{ fontSize: px(10), fontWeight: 600, color: '#475569', marginBottom: px(4) }}>
              Amostra pequena (N &lt; 30). Resultados apenas informativos.
            </div>
          )}
          <div style={{ fontSize: px(9), color: '#64748b', lineHeight: 1.45 }}>
            Resultados variam conforme perfil clínico, adesão, alimentação, atividade física e comorbidades. Dados agregados e anonimizados. Não há garantia de resultados individuais. Conteúdo informativo e educativo.
          </div>
        </div>
      </div>
    </div>
  );
}
