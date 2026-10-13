function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.4a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.1.1-1.78-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92s.73-2.07 1-2.35c.24-.28.64-.41 1.02-.41.12 0 .23 0 .33.01.3.01.45-.05.7.54.24.62.83 2.14.9 2.3.07.15.12.33.02.53-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.13-.28.27-.12.53.16.26.72 1.18 1.54 1.91 1.06.94 1.95 1.23 2.23 1.37.28.14.44.12.6-.07.16-.19.7-.81.88-1.09.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.46.21.53.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M14.5 3c.4 2.4 1.8 4.1 4.2 4.4v2.5c-1.4 0-2.7-.4-4.2-1.2v6.6c0 3.3-2.6 5.7-5.8 5.7S3 18.6 3 15.3c0-3.2 2.5-5.6 5.6-5.7v2.6c-1.6.1-2.9 1.4-2.9 3.1 0 1.7 1.4 3.1 3.1 3.1s3.1-1.4 3.1-3.1V3h2.6z" />
    </svg>
  );
}

const LINKS = [
  { key: 'whatsappUrl' as const, label: 'Abrir WhatsApp', Icon: WhatsAppIcon },
  { key: 'instagramUrl' as const, label: 'Abrir Instagram', Icon: InstagramIcon },
  { key: 'tiktokUrl' as const, label: 'Abrir TikTok', Icon: TikTokIcon },
];

export function MatchContactLinks({
  whatsappUrl,
  instagramUrl,
  tiktokUrl,
}: {
  whatsappUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
}) {
  const urls = { whatsappUrl, instagramUrl, tiktokUrl };
  const visible = LINKS.filter((item) => urls[item.key]);
  if (!visible.length) return null;

  return (
    <span className="inline-flex gap-1.5">
      {visible.map((item) => (
        <a
          key={item.key}
          href={urls[item.key]}
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <item.Icon />
        </a>
      ))}
    </span>
  );
}
