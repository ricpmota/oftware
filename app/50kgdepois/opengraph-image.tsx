import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = '50 KG DEPOIS — De 153 kg para 103 kg';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const coverPath = path.join(process.cwd(), 'public', '50kgdepois.jpeg');
  const coverBytes = await readFile(coverPath);
  const coverBase64 = `data:image/jpeg;base64,${coverBytes.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 42%, #14532d 100%)',
          padding: '36px 52px',
        }}
      >
        <img
          src={coverBase64}
          alt=""
          width={260}
          height={347}
          style={{
            borderRadius: 14,
            objectFit: 'cover',
            boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            marginLeft: 44,
            color: '#ffffff',
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 16,
              letterSpacing: 3,
              color: '#86efac',
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Uma história real · Uma transformação possível
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 58, fontWeight: 800, lineHeight: 1 }}>50 KG</span>
            <span style={{ fontSize: 48, fontWeight: 500, color: '#d4a574' }}>DEPOIS</span>
          </div>
          <div
            style={{
              marginTop: 18,
              alignSelf: 'flex-start',
              padding: '8px 14px',
              border: '2px solid #d4a574',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            DE 153 KG PARA 103 KG
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 19,
              lineHeight: 1.45,
              color: '#e2e8f0',
              maxWidth: 520,
            }}
          >
            A verdadeira história de disciplina, ciência e transformação de vida.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
