// src/components/Controls/KeySelector.tsx

import React from 'react';
import type { KeyName, PitchClass } from '../../types';
import { KEY_TO_PITCH } from '../../lib/theory/scales';

interface KeySelectorProps {
  value: PitchClass;
  preferredTonicName?: KeyName;
  onChange: (pitch: PitchClass) => void;
}

const ALL_PITCHES: PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const TONIC_NAMES: KeyName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Selector circular de las 12 tónicas. */
export function KeySelector({ value, preferredTonicName, onChange }: KeySelectorProps): JSX.Element {
  return (
    <fieldset
      style={{ border: 'none', margin: 0, padding: 0 }}
      aria-label="Selector de tonalidad"
    >
      <legend style={legendStyle}>🎹 Tonalidad</legend>

      <div
        role="radiogroup"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(44px, 1fr))',
          gap: '0.4rem',
        }}
      >
        {ALL_PITCHES.map((pitch) => {
          const isSelected = pitch === value;
          const label = preferredTonicName && KEY_TO_PITCH[preferredTonicName] === pitch
            ? preferredTonicName
            : TONIC_NAMES[pitch];

          return (
            <button
              key={pitch}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(pitch)}
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: '0.6rem',
                border: isSelected ? '2px solid #4338ca' : '1px solid #d6d3d1',
                background: isSelected ? '#6366f1' : 'white',
                color: isSelected ? 'white' : '#292524',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const legendStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#57534e',
  marginBottom: '0.4rem',
  padding: 0,
};
