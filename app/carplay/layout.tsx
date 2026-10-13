import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OftPay CarPlay',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function CarplayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
