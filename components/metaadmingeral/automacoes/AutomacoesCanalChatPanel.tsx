'use client';

import { useCallback, useState } from 'react';
import type { User } from 'firebase/auth';
import { ClipboardList, BadgeCheck, Wifi } from 'lucide-react';
import {
  AutomacoesInfoNote,
  AutomacoesPageHeader,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import CanalChatLogPanel from '@/components/metaadmingeral/automacoes/CanalChatLogPanel';
import CanalChatTemplatesSection from '@/components/metaadmingeral/automacoes/CanalChatTemplatesSection';
import CanalChatVerificacaoPanel from '@/components/metaadmingeral/automacoes/CanalChatVerificacaoPanel';
import WhatsappConnectionSection from '@/components/metaadmin/WhatsappConnectionSection';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';

type Props = {
  user: User | null;
};

type CanalChatAba = 'conexao' | 'log' | 'verificacao';

export default function AutomacoesCanalChatPanel({ user }: Props) {
  const [aba, setAba] = useState<CanalChatAba>('conexao');

  const getAuthToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  return (
    <div className="space-y-6">
      <AutomacoesPageHeader
        title="Canal Chat"
        subtitle="WhatsApp do sistema Oftware — boas-vindas, consultas, avisos ao médico e cobranças ao paciente."
      />

      <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setAba('conexao')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            aba === 'conexao'
              ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
              : 'text-[#E8EDED]/65 hover:text-[#E8EDED] hover:bg-white/5'
          }`}
        >
          <Wifi className="h-4 w-4" />
          Conexão
        </button>
        <button
          type="button"
          onClick={() => setAba('log')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            aba === 'log'
              ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
              : 'text-[#E8EDED]/65 hover:text-[#E8EDED] hover:bg-white/5'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Log
        </button>
        <button
          type="button"
          onClick={() => setAba('verificacao')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            aba === 'verificacao'
              ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
              : 'text-[#E8EDED]/65 hover:text-[#E8EDED] hover:bg-white/5'
          }`}
        >
          <BadgeCheck className="h-4 w-4" />
          Verificação
        </button>
      </div>

      {aba === 'conexao' ? (
        <div className="space-y-8">
          <AutomacoesInfoNote>
            <p>
              O <strong className="font-semibold text-[#E8EDED]">Telefone que recebe o aviso</strong> no
              lembrete do médico recebe a mensagem deste Canal Chat.
            </p>
            <p className="mt-2">
              Cobranças (avulsa e automática), boas-vindas ao tratamento, confirmação e lembretes de
              consulta também saem daqui. Sem link de relatório — o paciente deve contatar o médico.
            </p>
          </AutomacoesInfoNote>

          {user ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <WhatsappConnectionSection
                medicoId={CANAL_CHAT_OWNER_ID}
                getAuthToken={getAuthToken}
                apiBasePath="/api/metaadmingeral/canal-chat/whatsapp"
                conexaoOnly
                profileMissingMessage="Canal Chat indisponível. Recarregue a página e tente novamente."
              />
            </div>
          ) : (
            <p className="text-sm text-[#E8EDED]/60">Faça login para configurar o Canal Chat.</p>
          )}

          <CanalChatTemplatesSection user={user} />
        </div>
      ) : aba === 'log' ? (
        <CanalChatLogPanel user={user} />
      ) : (
        <CanalChatVerificacaoPanel user={user} />
      )}
    </div>
  );
}
