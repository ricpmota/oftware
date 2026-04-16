'use client';

import React from 'react';
import type { BannerContent } from '@/types/banner';

type Props = {
  content?: BannerContent;      // JSON (recomendado)
  html?: string;                // legado
  formato?: 'json' | 'html';     // hint opcional
  /** Shell Oftware (home): fundo deep blue, cartão claro — sem wrapper branco full-viewport. */
  patientMetaFrame?: boolean;
  /** Conteúdo colado às bordas (lateral e vertical), ex.: /meta/banner/[id]. */
  fullBleed?: boolean;
};

const safe = (v?: string) => (typeof v === 'string' ? v : '');

function HeadingTag({ level, children }: { level?: 1|2|3|4|5|6; children: React.ReactNode }) {
  const L = level ?? 2;
  const Tag = (`h${L}` as keyof JSX.IntrinsicElements);
  return <Tag>{children}</Tag>;
}

export default function BannerRenderer({
  content,
  html,
  formato = 'json',
  patientMetaFrame = false,
  fullBleed = false,
}: Props) {
  // Detectar formato automaticamente se não especificado
  const formatoDetectado = formato || (content ? 'json' : html ? 'html' : 'json');
  
  // Parsear content se for string (caso venha serializado)
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Erro ao parsear content no BannerRenderer:', e);
      parsedContent = undefined;
    }
  }
  
  // Se o banner está em JSON, renderiza via sections.
  // Verificar se content é um objeto válido com sections
  const hasValidJsonContent = parsedContent && 
    typeof parsedContent === 'object' && 
    parsedContent !== null &&
    'sections' in parsedContent && 
    Array.isArray(parsedContent.sections) && 
    parsedContent.sections.length > 0;
    
  if (formatoDetectado === 'json' && hasValidJsonContent) {
    const styles = parsedContent.styles ?? {};
    const bleed = patientMetaFrame && fullBleed;

    const wrapperStyle: React.CSSProperties = patientMetaFrame
      ? {
          backgroundColor: styles.backgroundColor ?? 'transparent',
          color: styles.textColor,
          fontFamily: styles.fontFamily ?? 'Arial, sans-serif',
          width: '100%',
          padding: bleed ? 0 : '18px 14px',
          boxSizing: 'border-box',
        }
      : {
          backgroundColor: styles.backgroundColor ?? '#ffffff',
          color: styles.textColor ?? '#111827',
          fontFamily: styles.fontFamily ?? 'Arial, sans-serif',
          width: '100%',
          minHeight: '100vh',
          padding: '18px 14px',
          boxSizing: 'border-box',
        };

    const innerStyle: React.CSSProperties = patientMetaFrame
      ? {
          maxWidth: bleed ? '100%' : styles.maxWidth ?? '900px',
          margin: bleed ? 0 : '0 auto',
          borderRadius: bleed ? 0 : 18,
          padding: bleed ? 0 : '18px 16px',
          boxShadow: bleed ? 'none' : '0 18px 45px rgba(15,23,42,0.10)',
        }
      : {
          maxWidth: styles.maxWidth ?? '900px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 18,
          padding: '18px 16px',
          boxShadow: '0 18px 45px rgba(15,23,42,0.10)',
        };

    return (
      <div
        style={wrapperStyle}
        className={
          patientMetaFrame
            ? `text-[#E8EDED] min-h-full w-full ${bleed ? 'flex flex-col flex-1' : ''}`
            : undefined
        }
      >
        <div
          style={innerStyle}
          className={
            patientMetaFrame
              ? bleed
                ? 'bg-white text-gray-900 border-0 shadow-none rounded-none min-h-full w-full flex-1'
                : 'bg-white text-gray-900 border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.35)]'
              : undefined
          }
        >
          {parsedContent.sections.map((sec, idx) => {
            const s = (sec.style ?? {}) as React.CSSProperties;

            switch (sec.type) {
              case 'heading':
                return (
                  <div key={idx} style={{ margin: s.margin ?? '0.75rem 0' }}>
                    <HeadingTag level={sec.level}>
                      <span style={{ ...(s as any) }}>{safe(sec.heading)}</span>
                    </HeadingTag>
                  </div>
                );

              case 'text':
                return (
                  <p
                    key={idx}
                    style={{
                      margin: s.margin ?? '0.75rem 0',
                      padding: s.padding,
                      textAlign: s.textAlign,
                      fontSize: s.fontSize,
                      backgroundColor: s.backgroundColor,
                      color: s.color ?? (s as any).textColor,
                      borderRadius: s.backgroundColor ? 14 : undefined,
                      ...s
                    }}
                  >
                    {safe(sec.text)}
                  </p>
                );

              case 'image':
                return (
                  <div key={idx} style={{ textAlign: (s as any).textAlign ?? 'center', margin: s.margin ?? '1rem 0' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safe(sec.imageUrl)}
                      alt={safe(sec.imageAlt)}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 16,
                        display: 'inline-block'
                      }}
                    />
                  </div>
                );

              case 'list':
                return (
                  <ul
                    key={idx}
                    style={{
                      margin: s.margin ?? '0.75rem 0',
                      padding: s.padding ?? '0.75rem 1.25rem',
                      backgroundColor: s.backgroundColor,
                      borderRadius: s.backgroundColor ? 14 : undefined,
                      color: s.color ?? (s as any).textColor,
                      ...s
                    }}
                  >
                    {(sec.items ?? []).map((it, i) => (
                      <li key={i} style={{ margin: '0.4rem 0' }}>
                        {it}
                      </li>
                    ))}
                  </ul>
                );

              case 'button': {
                const styleMap: Record<string, React.CSSProperties> = {
                  primary: { background: 'linear-gradient(135deg,#7b2cff,#ff5b3c)', color: '#fff' },
                  secondary: { background: '#111827', color: '#fff' },
                  outline: { background: 'transparent', border: '1px solid #d1d5db', color: '#111827' }
                };

                const btnStyle = styleMap[sec.buttonStyle ?? 'primary'];

                return (
                  <div key={idx} style={{ textAlign: (s as any).textAlign ?? 'center', margin: s.margin ?? '1rem 0' }}>
                    <a
                      href={safe(sec.buttonLink)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '12px 18px',
                        borderRadius: 999,
                        fontWeight: 700,
                        fontSize: 14,
                        ...btnStyle
                      }}
                    >
                      {safe(sec.buttonText)}
                    </a>
                  </div>
                );
              }

              case 'video':
                return (
                  <div key={idx} style={{ textAlign: (s as any).textAlign ?? 'center', margin: s.margin ?? '1rem 0' }}>
                    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
                      <iframe
                        src={safe(sec.videoUrl)}
                        title="Vídeo"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );

              case 'divider':
                return <hr key={idx} style={{ margin: s.margin ?? '1.25rem 0', border: 0, borderTop: '1px solid #e5e7eb' }} />;

              default:
                // Se vier algo desconhecido, não renderiza (seguro).
                return null;
            }
          })}
        </div>
      </div>
    );
  }

  // Legado: HTML
  if (formatoDetectado === 'html' && html) {
    const htmlBleed = patientMetaFrame && fullBleed;
    return (
      <div
        style={{
          width: '100%',
          minHeight: patientMetaFrame && !fullBleed ? undefined : htmlBleed ? '100%' : '100vh',
          background: patientMetaFrame ? 'transparent' : '#f6f3ff',
          padding: htmlBleed ? 0 : '18px 14px',
        }}
        className={
          patientMetaFrame
            ? `text-[#E8EDED] ${htmlBleed ? 'min-h-full flex-1' : ''}`
            : undefined
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Fallback (não "imprime" o JSON!)
  return (
    <div
      style={{ padding: patientMetaFrame && fullBleed ? 0 : 16 }}
      className={
        patientMetaFrame
          ? `text-[#E8EDED]/80 ${fullBleed ? 'min-h-full flex-1' : ''}`
          : undefined
      }
    >
      <p style={patientMetaFrame ? undefined : { color: '#6b7280' }}>Conteúdo indisponível.</p>
    </div>
  );
}
