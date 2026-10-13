'use client';

import PageLoadingScreen from '@/components/landing/PageLoadingScreen';

type Props = {
  backgroundColor?: string;
  spinnerClassName?: string;
  messageClassName?: string;
  message?: string;
};

/** Tela de espera enquanto o portal verifica se o usuário já tem cadastro no sistema. */
export default function CadastroVerificacaoScreen({
  backgroundColor = '#0A1F44',
  spinnerClassName = 'text-[#4CCB7A]',
  messageClassName = 'text-[#E8EDED]/80',
  message = 'Verificando seu cadastro...',
}: Props) {
  return (
    <PageLoadingScreen
      backgroundColor={backgroundColor}
      spinnerClassName={spinnerClassName}
      messageClassName={messageClassName}
      message={message}
    />
  );
}
