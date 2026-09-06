// src/components/Controls/NotationAndChordToggles.tsx

import React from 'react';
import type { NotationPreference } from '../../types';
import type { ChordVoicing, ChordVoicingType } from '../../lib/theory/chords';

interface NotationAndChordTogglesProps {
  notation: NotationPreference;
  onNotationChange: (notation: NotationPreference) => void;
  extendedChords: boolean;
  onExtendedChordsChange: (value: boolean) => void;
  voicing: ChordVoicing;
  onVoicingChange: (value: ChordVoicing) => void;
  voicingType: ChordVoicingType;
  onVoicingTypeChange: (value: ChordVoicingType) => void;
}

/** Controles compactos para notación y acordes extendidos. */
export function NotationAndChordToggles({
  notation,
  onNotationChange,
  extendedChords,
  onExtendedChordsChange,
  voicing,
  onVoicingChange,
  voicingType,
  onVoicingTypeChange,
}: NotationAndChordTogglesProps): JSX.Element {
  const voicingNumber = voicing === 'closed' ? 1 : Number(voicing.at(-1));

  const handleVoicingTypeChange = (type: ChordVoicingType) => {
    onVoicingTypeChange(type);
    if (type === 'closed') {
      onVoicingChange('closed');
    } else {
      onVoicingChange(`${type}-1` as ChordVoicing);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
      }}
    >
      <div
        role="radiogroup"
        aria-label="Preferencia de notación"
        style={{
          display: 'inline-flex',
          border: '1px solid #d6d3d1',
          borderRadius: '0.5rem',
          overflow: 'hidden',
        }}
      >
        {(['sharps', 'flats'] as NotationPreference[]).map((option) => {
          const isSelected = notation === option;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onNotationChange(option)}
              style={{
                minWidth: 60,
                minHeight: 40,
                border: 'none',
                background: isSelected ? '#6366f1' : 'white',
                color: isSelected ? 'white' : '#292524',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {option === 'sharps' ? '♯ Sostenidos' : '♭ Bemoles'}
            </button>
          );
        })}
      </div>

      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          minHeight: 44,
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#57534e',
        }}
      >
        <span
          role="switch"
          aria-checked={extendedChords}
          tabIndex={0}
          onClick={() => onExtendedChordsChange(!extendedChords)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onExtendedChordsChange(!extendedChords);
            }
          }}
          style={{
            position: 'relative',
            width: 44,
            height: 26,
            borderRadius: 999,
            background: extendedChords ? '#6366f1' : '#d6d3d1',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 3,
              left: extendedChords ? 21 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          />
        </span>
        Tétradas (7)
      </label>

      <div role="radiogroup" aria-label="Tipo de voicing" style={voicingTypeGroupStyle}>
        {(['closed', 'drop2', 'drop3'] as ChordVoicingType[]).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={voicingType === type}
            onClick={() => handleVoicingTypeChange(type)}
            style={{
              ...voicingTypeButtonStyle,
              background: voicingType === type ? '#0f766e' : 'white',
              color: voicingType === type ? 'white' : '#292524',
            }}
          >
            {type === 'closed' ? 'Cerrado' : type === 'drop2' ? 'Drop 2' : 'Drop 3'}
          </button>
        ))}
      </div>

      {voicingType !== 'closed' && (
        <label style={voicingLabelStyle}>
          Posición
          <select
            aria-label={`Posición ${voicingType}`}
            value={voicingNumber}
            onChange={(event) => onVoicingChange(`${voicingType}-${event.target.value}` as ChordVoicing)}
            style={voicingSelectStyle}
          >
            <option value={1}>1 (no inversión)</option>
            <option value={2}>2 (1a inversión)</option>
            <option value={3}>3 (2a inversión)</option>
            <option value={4}>4 (3a inversión)</option>
          </select>
        </label>
      )}
    </div>
  );
}

const voicingLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  minHeight: 44,
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#57534e',
};

const voicingSelectStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 0.4rem',
  border: '1px solid #d6d3d1',
  borderRadius: '0.4rem',
  background: 'white',
  color: '#292524',
};

const voicingTypeGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  border: '1px solid #d6d3d1',
  borderRadius: '0.5rem',
  overflow: 'hidden',
};

const voicingTypeButtonStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0 0.7rem',
  border: 'none',
  borderRight: '1px solid #d6d3d1',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
};
