'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { PacienteService } from '@/services/pacienteService';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PacienteCompleto } from '@/types/obesidade';
import NutriContent from '@/components/NutriContent';
import {
  ChevronLeft,
  TrendingUp,
  User,
  Scale,
  AlertCircle,
} from 'lucide-react';

export default function MetanutriNutriPacientePage() {
  const router = useRouter();
  const params = useParams();
  const pacienteId = params?.pacienteId as string | undefined;

  const [user, setUser] = useState<{ uid: string; email?: string } | null>(null);
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [acessoNegado, setAcessoNegado] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email || undefined });
      } else {
        router.push('/');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user?.uid || !pacienteId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setAcessoNegado(false);

        const [pacienteData, vinculos] = await Promise.all([
          PacienteService.getPacienteById(pacienteId),
          PacienteNutricionistaService.listPacientesVisiveisByNutri(user.uid),
        ]);

        if (cancelled) return;

        if (!pacienteData) {
          setAcessoNegado(true);
          setPaciente(null);
          return;
        }

        const temAcesso = vinculos.some(
          (v) =>
            v.paciente?.id === pacienteId ||
            v.pacienteId === pacienteId ||
            v.paciente?.userId === pacienteId
        );

        if (!temAcesso) {
          setAcessoNegado(true);
          setPaciente(null);
          return;
        }

        setPaciente(pacienteData);
      } catch (e) {
        console.error(e);
        if (!cancelled) setAcessoNegado(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, pacienteId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando acompanhamento nutricional...</p>
        </div>
      </div>
    );
  }

  if (acessoNegado || !paciente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso não permitido</h1>
          <p className="text-gray-600 mb-6">Você não tem permissão para acessar o acompanhamento deste paciente.</p>
          <button
            onClick={() => router.push('/metanutri')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
          >
            <ChevronLeft size={20} />
            Voltar ao Metanutri
          </button>
        </div>
      </div>
    );
  }

  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const evolucao = paciente.evolucaoSeguimento || [];
  const ultimoPeso = evolucao.length > 0
    ? [...evolucao].sort((a, b) => ((b.weekIndex ?? 0) - (a.weekIndex ?? 0)))[0]?.peso
    : medidasIniciais?.peso;
  const pesoInicial = medidasIniciais?.peso ?? evolucao.find((e) => e.weekIndex === 1)?.peso;
  const variacaoPeso = ultimoPeso && pesoInicial ? ultimoPeso - pesoInicial : null;
  const nomePaciente = paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header fixo */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/metanutri')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                title="Voltar ao Metanutri"
              >
                <ChevronLeft size={22} />
                <span className="hidden sm:inline font-medium">Voltar</span>
              </button>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{nomePaciente}</h1>
                  <p className="text-sm text-gray-500">Acompanhamento Nutricional</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <Scale className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-gray-500">Peso atual</p>
                  <p className="text-sm font-bold text-gray-900">
                    {ultimoPeso != null ? `${ultimoPeso.toFixed(1)} kg` : '—'}
                  </p>
                </div>
              </div>
              {variacaoPeso != null && (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm ${
                    variacaoPeso < 0
                      ? 'bg-green-50 border-green-200'
                      : variacaoPeso > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <TrendingUp
                    className={`w-5 h-5 ${
                      variacaoPeso < 0 ? 'text-green-600' : variacaoPeso > 0 ? 'text-amber-600' : 'text-gray-600'
                    }`}
                  />
                  <div>
                    <p className="text-xs text-gray-500">Variação</p>
                    <p
                      className={`text-sm font-bold ${
                        variacaoPeso < 0 ? 'text-green-700' : variacaoPeso > 0 ? 'text-amber-700' : 'text-gray-700'
                      }`}
                    >
                      {variacaoPeso > 0 ? '+' : ''}
                      {variacaoPeso.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <NutriContent paciente={paciente} setPaciente={setPaciente} modoNutricionista />
        </div>
      </main>
    </div>
  );
}
