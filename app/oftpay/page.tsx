'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { OFTPAY_COURSES } from './coursesConfig';
import { BookOpen, Video, User as UserIcon, ChevronDown, ClipboardList } from 'lucide-react';

function OftPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allowedCourseIds, setAllowedCourseIds] = useState<string[] | null>(null);
  const [questoesEnabled, setQuestoesEnabled] = useState<boolean | null>(null);
  const [accessStartAt, setAccessStartAt] = useState<number | null>(null);
  const [accessEndAt, setAccessEndAt] = useState<number | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchParams.get('sessionEnded') === '1') {
      setLoginError('Você entrou em outro dispositivo. Faça login novamente.');
      router.replace('/oftpay', { scroll: false });
    }
  }, [searchParams, router]);

  // Fechar menu ao clicar fora (antes dos early returns para manter ordem dos hooks)
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const revalidateSession = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/oftpay/allowed-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAllowedCourseIds(Array.isArray(data.allowedCourseIds) ? data.allowedCourseIds : []);
        setQuestoesEnabled(Boolean(data.questoesEnabled));
        setAccessStartAt(typeof data.accessStartAt === 'number' ? data.accessStartAt : null);
        setAccessEndAt(typeof data.accessEndAt === 'number' ? data.accessEndAt : null);
        setLoginError(null);
      } else {
        if (res.status === 401 && typeof data.error === 'string' && data.error.includes('outro dispositivo')) {
          await signOut(auth);
          setLoginError('Você entrou em outro dispositivo. Faça login novamente.');
          return false;
        }
        setAllowedCourseIds([]);
        setQuestoesEnabled(false);
        setAccessStartAt(null);
        setAccessEndAt(null);
      }
      return true;
    } catch {
      setAllowedCourseIds([]);
      return true;
    }
  };

  // Registrar login e carregar cursos permitidos + revalidação periódica (sessão única)
  useEffect(() => {
    if (!user) {
      setAllowedCourseIds(null);
      setQuestoesEnabled(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        await fetch('/api/oftpay/register-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        });
        if (cancelled) return;
        await revalidateSession(user);
      } catch {
        if (!cancelled) setAllowedCourseIds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Revalidar sessão a cada 25s e quando a aba ganha foco (para encerrar sessão antiga ao logar em outro dispositivo)
  useEffect(() => {
    if (!user) return;
    const recheck = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const ok = await revalidateSession(u);
      if (!ok) return; // sessão encerrada, signOut foi chamado
    };
    const interval = setInterval(recheck, 25000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  const hasAccess = (courseId: string) =>
    allowedCourseIds === null || allowedCourseIds.includes(courseId);
  const hasQuestoesAccess = questoesEnabled === true;
  const noCoursesLiberados = allowedCourseIds !== null && allowedCourseIds.length === 0;
  const nothingLiberado = noCoursesLiberados && !hasQuestoesAccess;

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      console.error('Erro ao fazer login:', error);
      const err = error as { code?: string };
      if (err.code === 'auth/popup-closed-by-user') {
        setLoginError('Login cancelado.');
      } else if (err.code === 'auth/popup-blocked') {
        setLoginError('Popup bloqueado. Permita popups para este site.');
      } else {
        setLoginError('Erro ao fazer login com Google. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Erro ao sair:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Não logado: tela de login
  if (!user) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">OftPay</h1>
          <p className="text-center text-gray-600 mb-8">
            Faça login com sua conta Google para acessar os cursos.
          </p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </>
            )}
          </button>
          {loginError && (
            <p className="mt-4 text-sm text-red-600 text-center">{loginError}</p>
          )}
        </div>
      </div>
    );
  }

  const formatVigencia = (): { texto: string; dias?: number } => {
    if (accessEndAt == null) return { texto: 'Sem limite' };
    const endDate = new Date(accessEndAt);
    const texto = `Até ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const dias = Math.ceil((endDate.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
    return { texto, dias };
  };

  // Logado: lista de cursos (estilo app)
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">OftPay</h1>
        <div className="relative flex items-center" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Menu do usuário"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Foto do perfil"
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-600" />
              </div>
            )}
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName || 'Usuário'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email ?? ''}</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <p className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Recursos com acesso</p>
                {allowedCourseIds != null && (allowedCourseIds.length > 0 || hasQuestoesAccess) ? (
                  <ul className="px-2">
                    {OFTPAY_COURSES.filter((c) => allowedCourseIds.includes(c.id)).map((course) => {
                      const vig = formatVigencia();
                      const diasTexto = vig.dias !== undefined
                        ? vig.dias > 0
                          ? `${vig.dias} ${vig.dias === 1 ? 'dia' : 'dias'} para expirar`
                          : vig.dias === 0
                            ? 'Expira hoje'
                            : 'Expirado'
                        : null;
                      return (
                        <li key={course.id} className="flex flex-col gap-0.5 px-2 py-2 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-800">{course.name}</span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{vig.texto}</span>
                          </div>
                          {diasTexto && <span className="text-xs text-amber-600">{diasTexto}</span>}
                        </li>
                      );
                    })}
                    {hasQuestoesAccess && (
                      <li className="flex flex-col gap-0.5 px-2 py-2 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-800">Banco de Questões</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{formatVigencia().texto}</span>
                        </div>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="px-4 py-2 text-sm text-gray-500">Nenhum recurso liberado.</p>
                )}
              </div>
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowUserMenu(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Cursos disponíveis</h2>
        <p className="text-gray-600 mb-6">Escolha um curso para começar.</p>

        {nothingLiberado && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm mb-6">
            Nenhum curso ou recurso liberado para sua conta. Entre em contato com o administrador para solicitar acesso.
          </div>
        )}

        {/* Mobile: estilo app — ícone colorido se liberado, cinza se desativado */}
        <div className="flex flex-wrap justify-center gap-10 md:hidden">
          {OFTPAY_COURSES.map((course) => {
            const liberado = hasAccess(course.id);
            const isPurple = course.theme === 'purple';
            const iconBg = liberado
              ? isPurple
                ? 'bg-purple-100 text-purple-600 active:bg-purple-600 active:text-white'
                : 'bg-blue-100 text-blue-600 active:bg-blue-600 active:text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed';
            const content = (
              <>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-md transition-colors ${iconBg}`}>
                  <BookOpen className="w-10 h-10" />
                </div>
                <span className={`text-sm font-medium text-center max-w-[100px] ${liberado ? 'text-gray-800' : 'text-gray-400'}`}>
                  {course.name}
                </span>
              </>
            );
            if (liberado) {
              return (
                <Link key={course.id} href={`/oftpay/curso/${course.id}`} className="group flex flex-col items-center gap-3 touch-manipulation">
                  {content}
                </Link>
              );
            }
            return (
              <div key={course.id} className="flex flex-col items-center gap-3 cursor-not-allowed opacity-80" title="Curso não liberado para sua conta">
                {content}
              </div>
            );
          })}
          {(() => {
            const liberado = hasQuestoesAccess;
            const iconBg = liberado
              ? 'bg-emerald-100 text-emerald-600 active:bg-emerald-600 active:text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed';
            const content = (
              <>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-md transition-colors ${iconBg}`}>
                  <ClipboardList className="w-10 h-10" />
                </div>
                <span className={`text-sm font-medium text-center max-w-[100px] ${liberado ? 'text-gray-800' : 'text-gray-400'}`}>
                  Banco de Questões
                </span>
              </>
            );
            if (liberado) {
              return (
                <Link key="questoes" href="/oftpay/questoes" className="group flex flex-col items-center gap-3 touch-manipulation">
                  {content}
                </Link>
              );
            }
            return (
              <div key="questoes" className="flex flex-col items-center gap-3 cursor-not-allowed opacity-80" title="Banco de Questões não liberado para sua conta">
                {content}
              </div>
            );
          })()}
        </div>

        {/* Desktop: cards — colorido se liberado, cinza se desativado */}
        <div className="hidden md:grid gap-4 sm:grid-cols-2">
          {OFTPAY_COURSES.map((course) => {
            const liberado = hasAccess(course.id);
            const isPurple = course.theme === 'purple';
            const cardBorder = liberado ? (isPurple ? 'hover:border-purple-200' : 'hover:border-blue-200') : '';
            const iconBg = liberado
              ? isPurple ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-600' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400';
            const titleHover = liberado ? (isPurple ? 'group-hover:text-purple-600' : 'group-hover:text-blue-600') : '';
            const linkColor = liberado ? (isPurple ? 'text-purple-600 group-hover:underline' : 'text-blue-600 group-hover:underline') : 'text-gray-400';
            const baseClasses = `group block rounded-xl bg-white border border-gray-200 p-6 shadow-sm ${liberado ? 'hover:shadow-md ' + cardBorder : 'opacity-80 cursor-not-allowed'} transition-all`;
            const inner = (
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${iconBg} ${liberado ? 'group-hover:text-white' : ''}`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold transition-colors ${liberado ? `text-gray-900 ${titleHover}` : 'text-gray-500'}`}>
                    {course.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {course.description}
                  </p>
                  <span className={`inline-block mt-3 text-sm font-medium ${linkColor}`}>
                    {liberado ? 'Acessar curso →' : 'Não liberado'}
                  </span>
                </div>
              </div>
            );
            if (liberado) {
              return (
                <Link key={course.id} href={`/oftpay/curso/${course.id}`} className={baseClasses}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={course.id} className={baseClasses} title="Curso não liberado para sua conta">
                {inner}
              </div>
            );
          })}
          {(() => {
            const liberado = hasQuestoesAccess;
            const cardBorder = liberado ? 'hover:border-emerald-200' : '';
            const iconBg = liberado
              ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600'
              : 'bg-gray-100 text-gray-400';
            const titleHover = liberado ? 'group-hover:text-emerald-600' : '';
            const linkColor = liberado ? 'text-emerald-600 group-hover:underline' : 'text-gray-400';
            const baseClasses = `group block rounded-xl bg-white border border-gray-200 p-6 shadow-sm ${liberado ? 'hover:shadow-md ' + cardBorder : 'opacity-80 cursor-not-allowed'} transition-all`;
            const inner = (
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${iconBg} ${liberado ? 'group-hover:text-white' : ''}`}>
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold transition-colors ${liberado ? `text-gray-900 ${titleHover}` : 'text-gray-500'}`}>
                    Banco de Questões
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    Simulados personalizados por tópico e acompanhamento de desempenho.
                  </p>
                  <span className={`inline-block mt-3 text-sm font-medium ${linkColor}`}>
                    {liberado ? 'Acessar banco →' : 'Não liberado'}
                  </span>
                </div>
              </div>
            );
            if (liberado) {
              return (
                <Link key="questoes" href="/oftpay/questoes" className={baseClasses}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key="questoes" className={baseClasses} title="Banco de Questões não liberado para sua conta">
                {inner}
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}

export default function OftPayPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    }>
      <OftPayContent />
    </Suspense>
  );
}
