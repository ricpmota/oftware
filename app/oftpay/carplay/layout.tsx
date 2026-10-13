import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OftPay',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function OftpayCarplayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
