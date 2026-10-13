import { findMunicipality } from '@/lib/localizacao/brazilLocations';
import type { PatientLocationValue } from '@/lib/localizacao/patientLocationField';

export type ViaCepResposta = {
  cep?: string;
  logradouro?: string;
  localidade?: string;
  uf?: string;
};

export const VIA_CEP_CIDADE_NAO_RESOLVIDA = 'Confirme sua cidade na lista.';

export function resolverLocalizacaoViaCep(
  data: Pick<ViaCepResposta, 'localidade' | 'uf'>
): PatientLocationValue | null {
  const uf = data.uf?.trim();
  const localidade = data.localidade?.trim();
  if (!uf || !localidade) return null;
  const municipio = findMunicipality(uf, localidade);
  if (!municipio) return null;
  return {
    estado: municipio.uf,
    cidade: municipio.nome,
    codigoIbge: municipio.codigoIbge,
  };
}

/**
 * Aproveita CEP e logradouro. A cidade só entra se existir na base oficial.
 * Sem correspondência, não inventa codigoIbge e não trata o texto do ViaCEP como localização válida.
 */
export function aplicarViaCepNoEndereco<
  T extends {
    rua?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
    codigoIbge?: string;
  },
>(
  endereco: T | undefined,
  data: ViaCepResposta
): { endereco: T; localizacaoResolvida: boolean } {
  const base = {
    ...(endereco ?? ({} as T)),
    cep: data.cep?.replace(/\D/g, '') || endereco?.cep,
    rua: data.logradouro || endereco?.rua || '',
  };
  const localizacao = resolverLocalizacaoViaCep(data);
  if (!localizacao) {
    return {
      endereco: {
        ...base,
        estado: undefined,
        cidade: undefined,
        codigoIbge: undefined,
      },
      localizacaoResolvida: false,
    };
  }
  return {
    endereco: {
      ...base,
      estado: localizacao.estado,
      cidade: localizacao.cidade,
      codigoIbge: localizacao.codigoIbge,
    },
    localizacaoResolvida: true,
  };
}
