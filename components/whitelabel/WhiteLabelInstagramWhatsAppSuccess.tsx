'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { whiteLabelProfissaoToFounderContact } from '@/lib/whiteLabel/whiteLabelInstagramFlow';
import type { WhiteLabelProfissao } from '@/lib/whiteLabel/profissao';

type Props = {
  profissao: WhiteLabelProfissao;
  nome: string;
};

export default function WhiteLabelInstagramWhatsAppSuccess({ profissao, nome }: Props) {
  const whatsappUrl = getInstagramFounderWhatsAppUrl(whiteLabelProfissaoToFounderContact(profissao));
  const firstName = nome.trim().split(/\s+/)[0] || nome;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold">Questionário enviado!</h1>
            </div>

            <div className="px-6 py-6 space-y-4 text-center">
              <p className="text-sm text-slate-600 leading-relaxed">
                Obrigado{firstName ? `, ${firstName}` : ''}! Recebemos suas respostas. Agora é só abrir o
                WhatsApp e falar com o Dr. Ricardo — ele responde pessoalmente.
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-emerald-400 px-4 py-3.5 text-sm font-semibold text-[#04210f] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Abrir WhatsApp com Dr. Ricardo
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
