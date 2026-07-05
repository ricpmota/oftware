import { auth } from '@/lib/firebase';

export async function createWhiteLabelCrmAuthFetch(
  init?: RequestInit
): Promise<(url: string, requestInit?: RequestInit) => Promise<Response>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();

  return (url: string, requestInit?: RequestInit) =>
    fetch(url, {
      ...init,
      ...requestInit,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
        ...(requestInit?.headers || {}),
      },
    });
}

export async function whiteLabelCrmAuthFetch(url: string, init?: RequestInit) {
  const fetcher = await createWhiteLabelCrmAuthFetch();
  return fetcher(url, init);
}
