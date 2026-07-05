'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchPublicPatientApi, formatPublicPatientFetchError } from '@/lib/public/fetchPublicPatientApi';
import AplicacaoCheckInPageClient from '@/components/aplicacao/AplicacaoCheckInPageClient';
import AplicacaoMarcoZeroPageClient from '@/components/aplicacao/AplicacaoMarcoZeroPageClient';

export default function AplicacaoPageRouter() {
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [semana, setSemana] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicPatientApi(`/api/aplicacao/${encodeURIComponent(token)}/dados`)
      .then((res) => {
        if (!res.ok) throw new Error('Link inválido ou expirado');
        return res.json();
      })
      .then((data: { semana?: number }) => {
        setSemana(data.semana ?? 1);
        setErro(null);
      })
      .catch((err) => setErro(formatPublicPatientFetchError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{erro}</p>
          <p className="text-sm text-slate-500">
            Verifique se o link está correto ou entre em contato com seu médico.
          </p>
        </div>
      </div>
    );
  }

  if (semana === 1) {
    return <AplicacaoMarcoZeroPageClient />;
  }

  return <AplicacaoCheckInPageClient />;
}
