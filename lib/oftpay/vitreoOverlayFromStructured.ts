import type { RetinaMeiosOpticos, RetinaVitreoFindings } from '@/types/oftpay/retinaMap';

/** Deriva overlay visual do mapa a partir dos campos estruturados de vítreo. */
export function vitreoToMeiosOpticos(vitreo: RetinaVitreoFindings): RetinaMeiosOpticos | null {
  if (vitreo.hemorragia_vitrea === 'leve') return 'hemorragia_vitrea_leve';
  if (vitreo.hemorragia_vitrea === 'moderada') return 'hemorragia_vitrea_moderada';
  if (vitreo.hemorragia_vitrea === 'intensa') return 'hemorragia_vitrea_densa';
  if (vitreo.opacidades_vitreas) return 'opacidades_moderadas';
  if (vitreo.dpv_completo || vitreo.dpv_parcial) return 'opacidades_leves';
  if (vitreo.transparente) return 'transparentes';
  return null;
}
