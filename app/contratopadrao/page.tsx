import type { Metadata } from 'next';
import ContratoPadraoEditor from '@/components/contratopadrao/ContratoPadraoEditor';

export const metadata: Metadata = {
  title: 'Contrato padrão — Médico × Paciente',
  robots: { index: false, follow: false },
};

export default function ContratoPadraoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src="/logo-icone.png" alt="Oftware" className="h-8 w-8" />
          <span className="text-sm font-semibold text-gray-700">Oftware — Contrato padrão</span>
        </div>
      </header>
      <main className="px-4 py-8 max-w-6xl mx-auto">
        <ContratoPadraoEditor />
      </main>
    </div>
  );
}
