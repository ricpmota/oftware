import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oftware - Sistema de Gestão Clínica Oftalmológica",
  description: "Sistema completo de assistência oftalmológica para médicos",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icones/oftware.png', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: '/icones/oftware.png',
  },
  other: {
    'google': 'notranslate',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Oftware',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#22c55e',
    'theme-color': '#22c55e',
    'application-name': 'Oftware',
    'msapplication-tap-highlight': 'no',
    'format-detection': 'telephone=no',
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Oftware',
  },
  openGraph: {
    title: 'Oftware - Sistema de Gestão Clínica Oftalmológica',
    description: 'Sistema completo de assistência oftalmológica para médicos',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary',
    title: 'Oftware - Sistema de Gestão Clínica Oftalmológica',
    description: 'Sistema completo de assistência oftalmológica para médicos',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Oftware" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#22c55e" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="application-name" content="Oftware" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Preload only critical resources */}
        <link rel="preload" as="image" href="/icones/oftware.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icones/oftware.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icones/oftware.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icones/oftware.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icones/oftware.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
