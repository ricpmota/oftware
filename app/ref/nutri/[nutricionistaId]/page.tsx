'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { NutricionistaService } from '@/services/nutricionistaService';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { MedicoService } from '@/services/medicoService';
import { Medico } from '@/types/medico';
import { UtensilsCrossed, Stethoscope, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function ReferralNutriPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const nutricionistaId = params.nutricionistaId as string;
  const medicoId = searchParams.get('medicoId');

  const [nutricionista, setNutricionista] = useState<NutricionistaDoc | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!nutricionistaId || !medicoId) {
        setError('Link inválido. Parâmetros faltando.');
        setLoading(false);
        return;
      }

      try {
        // Buscar nutricionista
        const nutri = await NutricionistaService.getNutricionistaByUserId(nutricionistaId);
        if (!nutri) {
          setError('Link inválido ou expirado. Nutricionista não encontrado.');
          setLoading(false);
          return;
        }

        // Validar nutricionista
        if (!nutri.isVerificado || nutri.status !== 'ativo') {
          setError('Link inválido ou expirado. Nutricionista não está ativo.');
          setLoading(false);
          return;
        }

        // Validar que médico está vinculado
        if (!nutri.medicoVinculadoIds.includes(medicoId)) {
          setError('Link inválido. Médico não está vinculado a este nutricionista.');
          setLoading(false);
          return;
        }

        // Buscar médico
        const medicoData = await MedicoService.getMedicoById(medicoId);
        if (!medicoData) {
          setError('Link inválido ou expirado. Médico não encontrado.');
          setLoading(false);
          return;
        }

        // Validar médico
        if (!medicoData.isVerificado || medicoData.status !== 'ativo') {
          setError('Link inválido ou expirado. Médico não está ativo.');
          setLoading(false);
          return;
        }

        setNutricionista(nutri);
        setMedico(medicoData);
      } catch (error) {
        console.error('Erro ao carregar dados do referral:', error);
        setError('Erro ao carregar informações. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [nutricionistaId, medicoId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Se já estiver logado, redirecionar para /meta com parâmetros de referral
      if (firebaseUser && nutricionista && medico) {
        router.push(`/meta?ref=nutri&nutriId=${nutricionistaId}&medicoId=${medicoId}`);
      }
    });

    return () => unsubscribe();
  }, [nutricionista, medico, nutricionistaId, medicoId, router]);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });

      await signInWithPopup(auth, provider);
      // O redirecionamento será feito pelo useEffect quando o user mudar
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado pelo usuário.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup bloqueado pelo navegador. Permita popups para este site.');
      } else {
        setError('Erro ao fazer login com Google. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !nutricionista || !medico) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link Inválido</h2>
          <p className="text-gray-600 mb-6">{error || 'Link inválido ou expirado.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-4 mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-700 p-4 rounded-xl">
              <UtensilsCrossed size={32} className="text-white" />
            </div>
            <div className="flex items-center">
              <ArrowRight size={24} className="text-gray-400" />
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-xl">
              <Stethoscope size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Você foi encaminhado por {nutricionista.nome}
          </h1>
          <p className="text-gray-600 mb-4">
            Nutricionista verificada e ativa
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Médico Recomendado</h3>
              <p className="text-blue-800">
                {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                CRM {medico.crm.estado} {medico.crm.numero}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> O acompanhamento médico é obrigatório. Este link apenas facilita seu encaminhamento.
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Entrar com Google para iniciar</span>
            </>
          )}
        </button>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Ao continuar, você será redirecionado para solicitar acompanhamento com o médico recomendado.
          </p>
        </div>
      </div>
    </div>
  );
}
