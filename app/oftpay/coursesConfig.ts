/**
 * Configuração dos cursos disponíveis no OftPay.
 * Vídeos serão carregados do Cloud Storage (path a ser configurado).
 */
export type OftPayCourseTheme = 'blue' | 'purple';

export interface OftPayCourse {
  id: string;
  name: string;
  description: string;
  /** Caminho no bucket GCS (ex: "oftreview 2023", "PROPEDEUTICS") */
  storagePath?: string;
  /** URL da imagem do card (opcional) */
  imageUrl?: string;
  /** Cor de destaque do curso (azul para Oftreview, roxo para Propedeutics) */
  theme?: OftPayCourseTheme;
}

export const OFTPAY_COURSES: OftPayCourse[] = [
  {
    id: 'oftreview',
    name: 'Oftreview',
    description: 'Revisão de vídeos com planejador, cronograma e acompanhamento de progresso. Mesmo conteúdo do oftreview, com vídeos em nuvem.',
    storagePath: 'oftreview 2023', // Pasta no bucket: oftware/oftreview 2023/
    theme: 'blue',
  },
  {
    id: 'propedeutics',
    name: 'Propedeutics',
    description: 'Propedeutica com vídeos, apostilas por assunto e cronograma. Conteúdo em OFTWARE/PROPEDEUTICS.',
    storagePath: 'PROPEDEUTICS', // Pasta no bucket: oftware/PROPEDEUTICS/
    theme: 'purple',
  },
  {
    id: 'laudo-exames',
    name: 'Laudo Exames',
    description:
      'Laudo guiado: marque achados no mapa de retina e gere o texto do laudo de mapeamento (OD/OE).',
    theme: 'blue',
  },
];

export function getCourseById(id: string): OftPayCourse | undefined {
  return OFTPAY_COURSES.find((c) => c.id === id);
}
