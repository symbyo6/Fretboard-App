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

      <div role="radiogroup" aria-label="Tipo de inversiones" style={voicingTypeGroupStyle}>
        <span style={voicingTypeLabelStyle}>Tipo de inversiones</span>
        {(['closed', 'drop2', 'drop3'] as ChordVoicingType[]).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={voicingType === type}
            disabled={type !== 'closed' && !extendedChords}
            onClick={() => handleVoicingTypeChange(type)}
            style={{
              ...voicingTypeButtonStyle,
              background: voicingType === type ? '#0f766e' : 'white',
              color: voicingType === type ? 'white' : '#292524',
              cursor: type !== 'closed' && !extendedChords ? 'not-allowed' : 'pointer',
              opacity: type !== 'closed' && !extendedChords ? 0.5 : 1,
            }}
          >
            {type === 'closed' ? 'Cerrado' : type === 'drop2' ? 'Drop 2' : 'Drop 3'}
          </button>
        ))}
      </div>

      <div
        role={voicingType === 'closed' ? undefined : 'radiogroup'}
        aria-label={voicingType === 'closed' ? undefined : `Inversiones ${voicingType}`}
        style={voicingPositionsStyle}
      >
        <span style={voicingLabelStyle}>Inversiones</span>
        {voicingType === 'closed' ? (
          <span style={closedVoicingHintStyle}>Cerrado no tiene inversiones</span>
        ) : (
          <>
            <button
              type="button"
              aria-label="Subir a la próxima inversión"
              title="Próxima inversión"
              onClick={() => {
                const nextPosition = (voicingNumber % 4) + 1;
                onVoicingChange(`${voicingType}-${nextPosition}` as ChordVoicing);
              }}
              style={voicingStepButtonStyle}
            >
              ↑
            </button>
            {[1, 2, 3, 4].map((position) => {
              const isSelected = voicingNumber === position;

              return (
                <button
                  key={position}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${voicingType} posición ${position}`}
                  onClick={() => onVoicingChange(`${voicingType}-${position}` as ChordVoicing)}
                  style={{
                    ...voicingPositionButtonStyle,
                    background: isSelected ? '#0f766e' : 'white',
                    color: isSelected ? 'white' : '#292524',
                    borderColor: isSelected ? '#0f766e' : '#d6d3d1',
                  }}
                >
                  {position}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Bajar a la inversión anterior"
              title="Inversión anterior"
              onClick={() => {
                const previousPosition = ((voicingNumber + 2) % 4) + 1;
                onVoicingChange(`${voicingType}-${previousPosition}` as ChordVoicing);
              }}
              style={voicingStepButtonStyle}
            >
              ↓
            </button>
          </>
        )}
      </div>
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

const voicingPositionsStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
};

const voicingPositionButtonStyle: React.CSSProperties = {
  minWidth: 38,
  minHeight: 38,
  border: '1px solid',
  borderRadius: '0.4rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const voicingStepButtonStyle: React.CSSProperties = {
  minWidth: 38,
  minHeight: 38,
  border: '1px solid #d6d3d1',
  borderRadius: '0.4rem',
  background: 'white',
  color: '#292524',
  fontSize: '1.1rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const closedVoicingHintStyle: React.CSSProperties = {
  color: '#78716c',
  fontSize: '0.78rem',
  fontStyle: 'italic',
};

const voicingTypeGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid #d6d3d1',
  borderRadius: '0.5rem',
  overflow: 'hidden',
};

const voicingTypeLabelStyle: React.CSSProperties = {
  padding: '0 0.6rem',
  color: '#57534e',
  fontSize: '0.8rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
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
