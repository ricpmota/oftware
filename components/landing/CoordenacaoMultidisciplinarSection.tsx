'use client';

import React, { useEffect, useState } from 'react';
import {
  Stethoscope,
  UtensilsCrossed,
  Dumbbell,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Target,
} from 'lucide-react';
import ProntuarioTimelinePreview from '@/components/landing/ProntuarioTimelinePreview';

const EQUIPE = [
  { icon: Stethoscope, label: 'Médico', angle: -90 },
  { icon: UtensilsCrossed, label: 'Nutricionista', angle: 150 },
  { icon: Dumbbell, label: 'Personal', angle: 30 },
];

const ACESSOS = [
  {
    icon: Stethoscope,
    label: 'Médico',
    desc: 'Seu consultório digital — leads, prontuário, calendário, financeiro e equipe reunidos, com a sua marca em cada detalhe.',
    descShort: 'Consultório digital completo, com a sua marca.',
  },
  {
    icon: UserCheck,
    label: 'Paciente',
    desc: 'Um app pensado para o dia a dia do tratamento: aplicações, exames, nutrição, treino e evolução — tudo onde o paciente já está.',
    descShort: 'Tratamento no bolso: app, exames, nutri e treino.',
  },
  {
    icon: UtensilsCrossed,
    label: 'Nutricionista',
    desc: 'Check-ins diários, cardápios alinhados à meta e visibilidade real da jornada nutricional — conectado ao que o médico conduz.',
    descShort: 'Check-ins, cardápio e evolução nutricional integrados.',
  },
  {
    icon: Dumbbell,
    label: 'Personal',
    desc: 'Treinos prescritos e acompanhados de perto, com adesão visível para médico, nutricionista e paciente — ninguém treina no escuro.',
    descShort: 'Treinos acompanhados, adesão visível para a equipe.',
  },
] as const;

const MOCKUPS_MEDICO = [
  {
    image: '/Mockups/1.png',
    title: 'Pipeline que converte interesse em paciente',
    titleShort: 'Leads que viram acompanhamento',
    desc: 'Cada lead entra no seu pipeline de qualificação. Você acompanha contatos, avança etapas e transforma interesse em acompanhamento de verdade — sem ninguém sumir no meio do caminho.',
    descShort: 'Qualifique leads e transforme interesse em paciente acompanhado — sem perder ninguém.',
  },
  {
    image: '/Mockups/2.png',
    title: 'Visão clínica que não fica na consulta',
    titleShort: 'Pacientes sempre à mão',
    desc: 'Enquanto o paciente vive o dia a dia, você enxerga quem precisa de atenção. Evolução, alertas e histórico clínico reunidos para agir no momento certo.',
    descShort: 'Evolução, alertas e histórico reunidos para decidir na hora certa.',
  },
  {
    image: '/Mockups/3.png',
    title: 'Calendário que organiza a operação inteira',
    titleShort: 'Agenda que organiza tudo',
    desc: 'Sua operação deixa de depender de memória. Aplicações, pagamentos, lembretes, aniversários — tudo num calendário que organiza a rotina da clínica.',
    descShort: 'Aplicações, pagamentos, lembretes e aniversários numa agenda só.',
  },
  {
    image: '/Mockups/4.png',
    title: 'Financeiro integrado ao tratamento',
    titleShort: 'Financeiro sem planilha',
    desc: 'Saúde financeira e clínica no mesmo lugar. Acompanhe receitas e inadimplência sem abrir outra ferramenta — o tratamento e o negócio caminham juntos.',
    descShort: 'Receitas e inadimplência no mesmo ambiente do acompanhamento clínico.',
  },
  {
    image: '/Mockups/5.png',
    title: 'Prontuário mobile, sem amarras de escritório',
    titleShort: 'Clínica onde você estiver',
    desc: 'Consultório, hospital ou viagem: seu prontuário vai com você. Edite pacientes, condutas e registros sem estar preso à mesa do escritório.',
    descShort: 'Edite pacientes e condutas de qualquer lugar — sem depender do consultório.',
  },
  {
    image: '/Mockups/6.png',
    title: 'Equipe conectada, paciente compartilhado',
    titleShort: 'Nutri e personal na mesma jornada',
    desc: 'Monte sua rede de confiança. Vincule nutricionistas e personal trainers, compartilhe pacientes com controle — cada um vê o que importa para o seu papel, no mesmo prontuário.',
    descShort: 'Compartilhe pacientes com nutri e personal — cada um vê o que precisa.',
  },
  {
    image: '/Mockups/7.png',
    title: 'Aplicações no automático',
    titleShort: 'Lembrete que vira adesão',
    desc: 'Todo dia, seu paciente recebe o lembrete certo — com link direto para registrar a aplicação. Você ganha adesão; ele ganha simplicidade.',
    descShort: 'Lembrete diário com link: menos esquecimento, mais adesão.',
  },
  {
    image: '/Mockups/8.png',
    title: 'Página de aplicações com a sua marca',
    titleShort: 'Aplicações com sua identidade',
    desc: 'O paciente preenche a aplicação num ambiente com a sua cara: logo, cores e identidade White Label. Continuidade com a marca que ele já confia.',
    descShort: 'Paciente registra aplicações num link personalizado com a sua marca.',
  },
  {
    image: '/Mockups/16.png',
    title: 'Identidade visual da sua página White Label',
    titleShort: 'Sua marca, do jeito que você quer',
    desc: 'Edite logo, cores e identidade visual da página pública do médico. O paciente entra num ambiente que parece seu — não genérico.',
    descShort: 'Personalize logo e cores da sua página White Label.',
  },
  {
    image: '/Mockups/17.png',
    title: 'Meu Link — a porta de entrada do tratamento',
    titleShort: 'Seu link, seu primeiro contato',
    desc: 'Encaminhe sua página para o paciente iniciar o tratamento e preencher a anamnese inicial — antes mesmo da primeira consulta presencial.',
    descShort: 'Link para o paciente começar o tratamento e a anamnese inicial.',
  },
  {
    image: '/Mockups/18.png',
    title: 'Assinatura digital integrada',
    titleShort: 'Prescrição e exames assinados',
    desc: 'Prescrições automáticas e solicitações de exames laboratoriais e de imagem com assinatura digital — validade jurídica sem burocracia extra.',
    descShort: 'Prescrições e pedidos de exame com assinatura digital automática.',
  },
  {
    image: '/Mockups/19.png',
    title: 'Protocolos prontos, um clique e assina',
    titleShort: 'Protocolo salvo, receita na hora',
    desc: 'Prescrições e protocolos já salvos no seu catálogo: selecione, confirme e a receita sai assinada digitalmente — sem redigir tudo de novo.',
    descShort: 'Protocolos salvos — um clique e a prescrição já sai assinada.',
  },
  {
    image: '/Mockups/20.png',
    title: 'Exames laboratoriais com IA',
    titleShort: 'Pedido de exame e leitura por IA',
    desc: 'Edite e solicite exames laboratoriais com um clique. Quando o resultado chega, a IA lê e organiza automaticamente — menos tempo em planilha, mais tempo com o paciente.',
    descShort: 'Solicite exames com um clique; a IA lê os resultados automaticamente.',
  },
] as const;

const MOCKUPS_PACIENTE = [
  {
    image: '/Mockups/9.png',
    title: 'O tratamento na palma da mão',
    titleShort: 'Tudo na palma da mão',
    desc: 'Entre uma consulta e outra, o paciente sabe o que fazer. Próximos passos, evolução e orientações reunidos para manter o ritmo do tratamento.',
    descShort: 'Próximos passos e evolução sempre à mão, entre uma consulta e outra.',
  },
  {
    image: '/Mockups/10.png',
    title: 'Exames, imagens e prescrições acessíveis',
    titleShort: 'Exames e receitas na hora',
    desc: 'Chega de pedir "manda de novo no Zap". Laboratoriais, laudos de imagem e prescrições digitais disponíveis quando o paciente precisa consultar.',
    descShort: 'Exames, laudos e receitas quando precisar — sem caçar PDF no WhatsApp.',
  },
  {
    image: '/Mockups/11.png',
    title: 'Aplicações e evolução visual',
    titleShort: 'Cada foto conta a evolução',
    desc: 'Registre aplicações e fotos de evolução ao longo do caminho. O progresso deixa de ser feeling — vira história documentada, visível para toda a equipe.',
    descShort: 'Aplicações registradas e fotos que mostram a evolução de verdade.',
  },
  {
    image: '/Mockups/12.png',
    title: 'Nutricionista ao lado, todos os dias',
    titleShort: 'Nutri presente no dia a dia',
    desc: 'Nutrição deixa de ser só a consulta quinzenal. Check-ins, orientações e acompanhamento contínuo conectados à jornada que o médico conduz.',
    descShort: 'Check-in diário e orientação nutricional integrados ao tratamento.',
  },
  {
    image: '/Mockups/13.png',
    title: 'Cardápio na medida da meta',
    titleShort: 'Cardápio alinhado à meta',
    desc: 'Sozinho ou junto com o nutricionista, o paciente monta um cardápio na medida: peso atual, meta de perda e protocolo médico alinhados.',
    descShort: 'Plano alimentar calibrado pelo peso e pela meta — com ou sem o nutri.',
  },
  {
    image: '/Mockups/14.png',
    title: 'ChatNutri com análise inteligente',
    titleShort: 'Foto do prato, macros na hora',
    desc: 'Tirou foto do prato? Proteínas, carboidratos e gorduras calculados na hora — compartilhados com quem orienta a nutrição, sem planilha nem chute.',
    descShort: 'Foto da refeição, macros calculados e nutricionista na conversa.',
  },
  {
    image: '/Mockups/15.png',
    title: 'Treino montado e acompanhado',
    titleShort: 'Treino com acompanhamento real',
    desc: 'Rotinas montadas com o personal ou de forma autônoma, com acompanhamento diário. Exercício integrado ao tratamento — médico, nutri e paciente enxergam a adesão.',
    descShort: 'Treino com o personal ou sozinho — adesão visível para toda a equipe.',
  },
] as const;

type PerfilTab = 'medico' | 'paciente';

function preloadMockupImages(images: readonly string[]) {
  images.forEach((src) => {
    const img = new window.Image();
    img.src = src;
  });
}

function hubPosition(angleDeg: number, radiusPct: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: `${50 + radiusPct * Math.cos(rad)}%`,
    top: `${50 + radiusPct * Math.sin(rad)}%`,
  };
}

export default function CoordenacaoMultidisciplinarSection() {
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilTab>('medico');
  const [slideIndex, setSlideIndex] = useState(0);

  const mockups = perfilAtivo === 'medico' ? MOCKUPS_MEDICO : MOCKUPS_PACIENTE;
  const slideAtual = mockups[slideIndex];

  useEffect(() => {
    preloadMockupImages(mockups.map((m) => m.image));
  }, [mockups]);

  useEffect(() => {
    const otherTab = perfilAtivo === 'medico' ? MOCKUPS_PACIENTE : MOCKUPS_MEDICO;
    const timer = window.setTimeout(() => {
      preloadMockupImages(otherTab.map((m) => m.image));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [perfilAtivo]);

  const trocarPerfil = (perfil: PerfilTab) => {
    setPerfilAtivo(perfil);
    setSlideIndex(0);
  };

  const irSlide = (next: number) => {
    if (next < 0 || next >= mockups.length) return;
    setSlideIndex(next);
  };

  return (
    <section
      id="multidisciplinar"
      className="scroll-mt-[80px] py-20 md:py-28 lg:py-32 bg-white border-t border-[#E5E7EB] relative overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 60% 45% at 30% 50%, rgba(34, 197, 94, 0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl mb-12 md:mb-16">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-[#16A34A] mb-5">
            Coordenação multidisciplinar
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1D1D1D] leading-[1.1] tracking-tight mb-6">
            O tratamento não acontece sozinho.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-[#5A5A5A] leading-relaxed">
            <span className="md:hidden">
              Médico, nutricionista, personal e paciente — mesma jornada, mesma timeline, continuidade de verdade
              entre consultas.
            </span>
            <span className="hidden md:inline">
              Em programas de obesidade e medicina metabólica, ninguém caminha sozinho. A Oftware reúne médico,
              nutricionista, personal e paciente num único ecossistema — com prontuário compartilhado, timeline única
              e continuidade real entre uma consulta e outra.
            </span>
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="flex flex-col items-center mx-auto w-full max-w-[460px] lg:max-w-none">
            <div className="relative w-full max-w-[460px] aspect-square">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400" aria-hidden>
                <circle cx="200" cy="200" r="118" fill="none" stroke="rgba(34, 197, 94, 0.25)" strokeWidth="1.5" strokeDasharray="6 8" />
                {EQUIPE.map(({ angle, label }) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <line
                      key={label}
                      x1="200"
                      y1="200"
                      x2={200 + 118 * Math.cos(rad)}
                      y2={200 + 118 * Math.sin(rad)}
                      stroke="url(#multidiscLineGrad)"
                      strokeWidth="2"
                      strokeOpacity="0.65"
                      strokeLinecap="round"
                    />
                  );
                })}
                <defs>
                  <linearGradient id="multidiscLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#16A34A" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
                    boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <UserCheck className="w-10 h-10 md:w-11 md:h-11 text-white" />
                </div>
                <p className="mt-3 text-sm md:text-base font-semibold text-[#1D1D1D]">Paciente</p>
              </div>

              {EQUIPE.map(({ icon: Icon, label, angle }) => {
                const pos = hubPosition(angle, 38);
                return (
                  <div
                    key={label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
                    style={pos}
                  >
                    <div className="w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-2xl flex items-center justify-center border border-[#E5E7EB] bg-white shadow-sm">
                      <Icon className="w-7 h-7 text-[#16A34A]" />
                    </div>
                    <p className="mt-2 text-xs md:text-sm font-medium text-center text-[#5A5A5A] max-w-[100px]">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full min-w-0">
            <ProntuarioTimelinePreview />
          </div>
        </div>

        <div className="mt-12 md:mt-16 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F7] p-8 md:p-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#16A34A] mb-4 block">
            Diferencial
          </span>
          <p className="text-lg sm:text-xl md:text-2xl font-semibold text-[#1D1D1D] leading-snug mb-4">
            Enquanto outras plataformas conectam apenas médico e paciente, a Oftware conecta toda a equipe
            responsável pela evolução do paciente.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-[#5A5A5A] leading-relaxed mb-8">
            <span className="md:hidden">
              Prescrever é só o começo. O resultado vem quando nutrição, exercício, aplicações e adesão caminham
              juntos — mês após mês.
            </span>
            <span className="hidden md:inline">
              Porque prescrever é só o começo. O resultado de verdade vem quando nutrição, exercício, aplicações e
              adesão caminham juntos — mês após mês, consulta após consulta. A Oftware existe para sustentar essa
              jornada inteira.
            </span>
          </p>

          <div className="flex items-start gap-3 rounded-xl border border-[#22C55E]/20 bg-white p-4 md:p-5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-sm md:text-base font-semibold text-[#1D1D1D] mb-1">
                Um objetivo. Quatro portas de entrada.
              </p>
              <p className="text-sm md:text-base text-[#5A5A5A] leading-relaxed">
                <span className="md:hidden">
                  Cada um entra pelo seu ambiente — mas todos olham para o mesmo paciente e o mesmo resultado.
                </span>
                <span className="hidden md:inline">
                  Médico, paciente, nutricionista e personal entram por portas diferentes, com ferramentas feitas para
                  cada um — mas todos olham para o mesmo lugar: a evolução de quem está no centro do tratamento.
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
            {ACESSOS.map(({ icon: Icon, label, desc, descShort }) => (
              <div
                key={label}
                className="rounded-xl border border-[#E5E7EB] bg-white p-4 md:p-5 text-center"
              >
                <div className="w-11 h-11 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#16A34A]" />
                </div>
                <p className="text-sm font-semibold text-[#1D1D1D] mb-1">{label}</p>
                <p className="text-xs text-[#5A5A5A] leading-relaxed">
                  <span className="md:hidden">{descShort}</span>
                  <span className="hidden md:inline">{desc}</span>
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">
              Veja na prática
            </p>
            <p className="text-sm text-[#5A5A5A] mb-5 leading-relaxed">
              <span className="md:hidden">
                Cada tela pensada para quem usa — sem perder a visão compartilhada da equipe.
              </span>
              <span className="hidden md:inline">
                Do consultório ao app do paciente — cada tela foi desenhada para quem usa, sem sacrificar a visão
                compartilhada da equipe.
              </span>
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => trocarPerfil('medico')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  perfilAtivo === 'medico'
                    ? 'bg-[#16A34A] text-white shadow-sm shadow-[#22C55E]/20'
                    : 'border border-[#E5E7EB] bg-white text-[#5A5A5A] hover:border-[#22C55E]/40'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                Portal do médico
              </button>
              <button
                type="button"
                onClick={() => trocarPerfil('paciente')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  perfilAtivo === 'paciente'
                    ? 'bg-[#16A34A] text-white shadow-sm shadow-[#22C55E]/20'
                    : 'border border-[#E5E7EB] bg-white text-[#5A5A5A] hover:border-[#22C55E]/40'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                App do paciente
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="relative flex items-center justify-center w-full min-h-[420px] md:min-h-[480px]">
                {mockups.map((slide, i) => (
                  <img
                    key={slide.image}
                    src={slide.image}
                    alt={i === slideIndex ? slide.title : ''}
                    aria-hidden={i !== slideIndex}
                    decoding="async"
                    loading={i <= 1 ? 'eager' : 'lazy'}
                    fetchPriority={i === slideIndex ? 'high' : 'low'}
                    className={`w-full max-w-[240px] md:max-w-[280px] h-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${
                      i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  />
                ))}
              </div>

              <div className="flex flex-col justify-between min-h-0 md:min-h-[320px]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#16A34A] mb-2">
                    {slideIndex + 1} de {mockups.length}
                  </p>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1D1D1D] mb-3">
                    <span className="md:hidden">{slideAtual.titleShort}</span>
                    <span className="hidden md:inline">{slideAtual.title}</span>
                  </h3>
                  <p className="text-sm md:text-base text-[#5A5A5A] leading-relaxed">
                    <span className="md:hidden">{slideAtual.descShort}</span>
                    <span className="hidden md:inline">{slideAtual.desc}</span>
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => irSlide(slideIndex - 1)}
                      disabled={slideIndex === 0}
                      className="w-10 h-10 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#1D1D1D] hover:border-[#22C55E]/40 hover:bg-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => irSlide(slideIndex + 1)}
                      disabled={slideIndex === mockups.length - 1}
                      className="w-10 h-10 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#1D1D1D] hover:border-[#22C55E]/40 hover:bg-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Próximo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1.5 flex-1 min-w-0 max-w-[220px] sm:max-w-none">
                    {mockups.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIndex(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === slideIndex ? 'w-6 bg-[#16A34A]' : 'w-2 bg-[#E5E7EB] hover:bg-[#22C55E]/40'
                        }`}
                        aria-label={`Ir para slide ${i + 1}`}
                        aria-current={i === slideIndex ? 'step' : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
