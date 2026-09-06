// src/components/Layout/LandscapeNudge.tsx

import React from 'react';

/** Aviso compacto para orientar la vista apaisada en pantallas estrechas. */
export function LandscapeNudge(): JSX.Element {
  return (
    <p
      style={{
        margin: 0,
        padding: '0.5rem 0.65rem',
        borderRadius: '0.4rem',
        background: '#f5f5f4',
        color: '#57534e',
        fontSize: '0.75rem',
      }}
    >
      Gira el dispositivo para ver más trastes a la vez.
    </p>
  );
}
