// src/components/Controls/AudioUnlockBanner.tsx

import React from 'react';

interface AudioUnlockBannerProps {
  isUnlocked: boolean;
  onUnlock: () => void;
}

/** Aviso no bloqueante para activar el audio tras un gesto del usuario. */
export function AudioUnlockBanner({
  isUnlocked,
  onUnlock,
}: AudioUnlockBannerProps): JSX.Element | null {
  if (isUnlocked) return null;

  return (
    <button
      type="button"
      onClick={onUnlock}
      style={{
        minHeight: 44,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderRadius: '0.6rem',
        border: '1px dashed #f59e0b',
        background: '#fffbeb',
        color: '#92400e',
        fontSize: '0.82rem',
        fontWeight: 600,
        cursor: 'pointer',
        marginBottom: '0.5rem',
      }}
    >
      Toca aquí para activar el sonido
    </button>
  );
}
