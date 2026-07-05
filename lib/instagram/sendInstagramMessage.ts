function getMetaSendMessageUrl(accountId: string): string {
  return `https://graph.facebook.com/v25.0/${accountId}/messages`;
}

export async function sendInstagramMessage(
  recipientId: string,
  text: string,
): Promise<boolean> {
  if (!recipientId || !text.trim()) {
    console.error('[instagram/send] recipientId or text is empty');
    return false;
  }

  const accessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    console.error('[instagram/send] Missing META_PAGE_ACCESS_TOKEN');
    return false;
  }

  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID?.trim();
  if (!accountId) {
    console.error('[instagram/send] Missing META_INSTAGRAM_ACCOUNT_ID');
    return false;
  }

  console.log('[instagram/send] Using access token', {
    accessTokenLength: accessToken.length,
    accessTokenPrefix: accessToken.slice(0, 6),
    accountId,
  });

  try {
    const response = await fetch(getMetaSendMessageUrl(accountId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    const rawBody = await response.text();
    let responseBody: unknown = rawBody;

    try {
      responseBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      responseBody = rawBody;
    }

    if (!response.ok) {
      console.error('[instagram/send] Meta API error', {
        accessTokenLength: accessToken.length,
        accessTokenPrefix: accessToken.slice(0, 6),
        accountId,
        status: response.status,
        body: responseBody,
      });
      return false;
    }

    console.log('[instagram/send] Meta API success', {
      accessTokenLength: accessToken.length,
      accessTokenPrefix: accessToken.slice(0, 6),
      accountId,
      status: response.status,
      recipientId,
      body: responseBody,
    });
    return true;
  } catch (error) {
    console.error('[instagram/send] Network error', error);
    return false;
  }
}
