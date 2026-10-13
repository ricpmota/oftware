/** Sessão e dono exclusivos do módulo Disparos. Não reutilizar outras sessões. */
export const DISPAROS_WHATSAPP_OWNER = 'disparos';

export const DISPAROS_WHATSAPP_SESSION_ID = 'system_disparos';

export const DISPAROS_OWNER_ID = DISPAROS_WHATSAPP_OWNER;

export const DISPAROS_SESSION_ID = DISPAROS_WHATSAPP_SESSION_ID;

export const DISPAROS_MENU_ID = 'disparos';

/** Rotas exclusivas do WhatsApp de Disparos. O browser fala só com estas APIs. */
export const DISPAROS_WHATSAPP_ROUTES = {
  status: '/api/metaadmingeral/disparos/whatsapp/status',
  startSession: '/api/metaadmingeral/disparos/whatsapp/start-session',
  disconnect: '/api/metaadmingeral/disparos/whatsapp/disconnect',
} as const;

/** Piso operacional do intervalo da campanha, em minutos. O worker futuro é quem espera. */
export const DISPAROS_MIN_INTERVAL_MINUTES = 1;

export const DISPAROS_DEFAULT_INTERVAL_MINUTES = 2;

export const DISPAROS_MAX_INTERVAL_MINUTES = 180;

/** O envio genérico existente recusa texto acima deste tamanho. */
export const DISPAROS_MESSAGE_MAX_LENGTH = 1024;

export const DISPAROS_PAGE_SIZE = 25;

export const DISPAROS_MAX_CSV_ROWS = 50_000;

export const DISPAROS_IMPORTS_COLLECTION = 'disparos_importacoes';

export const DISPAROS_CAMPAIGNS_COLLECTION = 'disparos_campanhas';

export const DISPAROS_OPT_OUT_COLLECTION = 'disparos_opt_out';

export const DISPAROS_CONTACTS_SUBCOLLECTION = 'contatos';

export const DISPAROS_ITEMS_SUBCOLLECTION = 'itens';

export const DISPAROS_PHONES_SUBCOLLECTION = 'telefones';

/** Tamanho de cada gravação. Não limita a lista: a campanha continua até o último contato. */
export const DISPAROS_WRITE_CHUNK = 120;

export const DISPAROS_POLL_MS = 15_000;

/** Lease do item em processamento. Expirado, a política decide se volta ou vai para revisão. */
export const DISPAROS_ITEM_LEASE_MS = 2 * 60 * 1000;

export const DISPAROS_ROUTES = {
  imports: '/api/metaadmingeral/disparos/importacoes',
  campaigns: '/api/metaadmingeral/disparos/campanhas',
} as const;
