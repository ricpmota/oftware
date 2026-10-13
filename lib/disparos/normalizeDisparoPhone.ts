/** Normalização de telefones importados no Disparos. Não usa o Canal Chat. */

export const DISPAROS_BRAZIL_DDI = '55';

/** Valor inicial do campo visível na importação. O usuário pode trocar. */
export const DISPAROS_DEFAULT_DDD = '83';

const BRAZIL_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export type DisparoPhoneOutcome = 'empty' | 'valido' | 'falta_ddd' | 'invalido';

export type DisparoPhoneOptions = {
  defaultDdd?: string | null;
};

export type NormalizedDisparoPhone = {
  original: string;
  normalized: string | null;
  display: string | null;
  outcome: DisparoPhoneOutcome;
  usedDefaultDdd: boolean;
  alreadyHadDdd: boolean;
  alreadyHadCountry: boolean;
};

export function cleanDisparoPhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isBrazilDdd(value: string): boolean {
  return BRAZIL_DDDS.has(value);
}

export function formatDisparoPhoneDisplay(canonical: string): string {
  if (canonical.startsWith(DISPAROS_BRAZIL_DDI) && canonical.length === 13) {
    const ddd = canonical.slice(2, 4);
    const local = canonical.slice(4);
    return `+55 ${ddd} ${local.slice(0, 5)}-${local.slice(5)}`;
  }
  if (canonical.startsWith(DISPAROS_BRAZIL_DDI) && canonical.length === 12) {
    const ddd = canonical.slice(2, 4);
    const local = canonical.slice(4);
    return `+55 ${ddd} ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return canonical ? `+${canonical}` : '';
}

function emptyPhone(original: string): NormalizedDisparoPhone {
  return {
    original,
    normalized: null,
    display: null,
    outcome: 'empty',
    usedDefaultDdd: false,
    alreadyHadDdd: false,
    alreadyHadCountry: false,
  };
}

function result(
  original: string,
  partial: Omit<NormalizedDisparoPhone, 'original'>,
): NormalizedDisparoPhone {
  return { original, ...partial };
}

function validCanonical(
  original: string,
  canonical: string,
  flags: { usedDefaultDdd?: boolean; alreadyHadDdd?: boolean; alreadyHadCountry?: boolean },
): NormalizedDisparoPhone {
  return result(original, {
    normalized: canonical,
    display: formatDisparoPhoneDisplay(canonical),
    outcome: 'valido',
    usedDefaultDdd: flags.usedDefaultDdd === true,
    alreadyHadDdd: flags.alreadyHadDdd === true,
    alreadyHadCountry: flags.alreadyHadCountry === true,
  });
}

function invalid(original: string): NormalizedDisparoPhone {
  return result(original, {
    normalized: null,
    display: null,
    outcome: 'invalido',
    usedDefaultDdd: false,
    alreadyHadDdd: false,
    alreadyHadCountry: false,
  });
}

function missingDdd(original: string): NormalizedDisparoPhone {
  return result(original, {
    normalized: null,
    display: null,
    outcome: 'falta_ddd',
    usedDefaultDdd: false,
    alreadyHadDdd: false,
    alreadyHadCountry: false,
  });
}

function isMobileLocal(local: string): boolean {
  return local.length === 9 && local.startsWith('9');
}

function isLandlineLocal(local: string): boolean {
  return local.length === 8 && /^[2-5]/.test(local);
}

function configuredDdd(options?: DisparoPhoneOptions): string | null {
  const digits = cleanDisparoPhoneDigits(options?.defaultDdd ?? '');
  return isBrazilDdd(digits) ? digits : null;
}

/**
 * Uma única normalização para CSV, Telefone 2 e opt-out.
 * `original` volta intacto. `normalized` é o canônico, quando existe.
 */
export function normalizeDisparoPhone(
  original: string,
  options?: DisparoPhoneOptions,
): NormalizedDisparoPhone {
  const digits = cleanDisparoPhoneDigits(original);
  if (!digits) return emptyPhone(original);

  const defaultDdd = configuredDdd(options);
  const preserved = original;

  if (digits.length === 13 && digits.startsWith(DISPAROS_BRAZIL_DDI)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (isBrazilDdd(ddd) && isMobileLocal(local)) {
      return validCanonical(preserved, digits, { alreadyHadCountry: true });
    }
    return invalid(preserved);
  }

  if (digits.length === 12 && digits.startsWith(DISPAROS_BRAZIL_DDI)) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (isBrazilDdd(ddd) && isLandlineLocal(local)) {
      return validCanonical(preserved, digits, { alreadyHadCountry: true });
    }
    return invalid(preserved);
  }

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (isBrazilDdd(ddd) && isMobileLocal(local)) {
      return validCanonical(preserved, `${DISPAROS_BRAZIL_DDI}${digits}`, { alreadyHadDdd: true });
    }
    return invalid(preserved);
  }

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (isBrazilDdd(ddd) && isLandlineLocal(local)) {
      return validCanonical(preserved, `${DISPAROS_BRAZIL_DDI}${digits}`, { alreadyHadDdd: true });
    }
    return invalid(preserved);
  }

  if (digits.length === 9 || digits.length === 8) {
    if (!defaultDdd) return missingDdd(preserved);
    const localOk = digits.length === 9 ? isMobileLocal(digits) : isLandlineLocal(digits);
    if (!localOk) return invalid(preserved);
    return validCanonical(preserved, `${DISPAROS_BRAZIL_DDI}${defaultDdd}${digits}`, {
      usedDefaultDdd: true,
    });
  }

  return invalid(preserved);
}
