'use client';

import ChatIA from '@/components/ChatIA';

/**
 * Página dedicada ao chat (teste ou link direto).
 * A home também embute o mesmo componente em modo flutuante.
 */
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#0A1F44] text-[#E8EDED] flex flex-col items-center justify-center p-6">
      <h1 className="text-xl font-semibold mb-2">Chat Oftware</h1>
      <p className="text-sm text-[#E8EDED]/70 mb-8 text-center max-w-md">
        Use o botão no canto da tela para abrir o assistente.
      </p>
      <ChatIA userLabel="visitante" floatPosition="right" contextSurface="public" />
    </div>
  );
}
