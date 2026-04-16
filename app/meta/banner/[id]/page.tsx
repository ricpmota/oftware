'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BannerService } from '@/services/bannerService';
import { Banner } from '@/types/banner';
import { ArrowLeft } from 'lucide-react';
import BannerRenderer from '@/components/BannerRenderer';

/** Mesmo fundo da home pública (www.oftware.com.br). */
const DEEP_BLUE = '#0A1F44';

export default function BannerPage() {
  const params = useParams();
  const router = useRouter();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBanner = async () => {
      if (params.id && typeof params.id === 'string') {
        try {
          const bannerData = await BannerService.getBannerById(params.id);
          setBanner(bannerData);
        } catch (error) {
          console.error('Erro ao carregar banner:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadBanner();
  }, [params.id]);

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ backgroundColor: DEEP_BLUE }}
      >
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-[#4CCB7A] border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (!banner) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col overflow-hidden"
        style={{ backgroundColor: DEEP_BLUE }}
      >
        <header className="shrink-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
        </header>
        <div className="flex-1 min-h-0 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#E8EDED] mb-4">Banner não encontrado</h1>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-colors shadow-lg hover:shadow-[#4CCB7A]/30"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col overflow-hidden text-[#E8EDED]"
      style={{ backgroundColor: DEEP_BLUE }}
    >
      <header className="shrink-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
      </header>

      <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col">
        <BannerRenderer
          patientMetaFrame
          fullBleed
          formato={banner.formato || (banner.conteudoJson ? 'json' : banner.conteudoHtml ? 'html' : 'json')}
          content={banner.conteudoJson}
          html={banner.conteudoHtml}
        />
      </div>
    </div>
  );
}
