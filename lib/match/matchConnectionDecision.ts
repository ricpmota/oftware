export type PairState = {
  blocked: boolean;
  connectionActive: boolean;
  requestStatus?: string | null;
  requestFromUid?: string | null;
};

export type ConnectDecision =
  | { action: 'create_interest' }
  | { action: 'accept' }
  | { action: 'noop'; result: 'already_sent' | 'already_connected' | 'blocked' };

/**
 * Um toque em Conectar.
 * ignored e cancelled não são interesse ativo: um novo toque reabre o pedido.
 * pending do outro lado vira aceite e conexão, sem segundo clique.
 */
export function decideConnect(uid: string, state: PairState & { requestToUid?: string | null }): ConnectDecision {
  if (state.blocked) return { action: 'noop', result: 'blocked' };
  if (state.connectionActive) return { action: 'noop', result: 'already_connected' };
  const status = state.requestStatus;
  if (!status || status === 'ignored' || status === 'cancelled') return { action: 'create_interest' };
  if (status === 'pending' && state.requestFromUid === uid) return { action: 'noop', result: 'already_sent' };
  if (status === 'pending' && state.requestToUid === uid) return { action: 'accept' };
  if (status === 'accepted') return { action: 'accept' };
  return { action: 'create_interest' };
}

export type ResponseDecision =
  | { action: 'ignore' }
  | { action: 'accept'; createConnection: boolean }
  | { action: 'reject'; code: 'missing' | 'forbidden' };

export function decideResponse(
  uid: string,
  request: { toUid?: string | null; status?: string | null } | null,
  action: 'accept' | 'ignore',
  connectionActive: boolean
): ResponseDecision {
  if (!request) return { action: 'reject', code: 'missing' };
  if (request.toUid !== uid || request.status !== 'pending') return { action: 'reject', code: 'forbidden' };
  if (action === 'ignore') return { action: 'ignore' };
  return { action: 'accept', createConnection: !connectionActive };
}
