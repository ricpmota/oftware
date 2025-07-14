'use client';

import React from 'react';

export default function HomePage() {
  return (
    <html>
      <head>
        <title>Oftware - Teste</title>
      </head>
      <body>
        <h1>Oftware está funcionando!</h1>
        <p>Se você está vendo esta página, o deploy foi bem-sucedido.</p>
        <p>Timestamp: {new Date().toISOString()}</p>
      </body>
    </html>
  );
} 