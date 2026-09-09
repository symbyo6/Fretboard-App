// src/components/Controls/NotationAndChordToggles.tsx

import React from 'react';
import type { ChordVoicing, ChordVoicingType } from '../../lib/theory/chords';

interface NotationAndChordTogglesProps {
  notationLabel: 'flats' | 'sharps' | 'none';
}

export interface InversionControlsProps {
  voicing: ChordVoicing;
  onVoicingChange: (value: ChordVoicing) => void;
  onVoicingChangeSilent?: (value: ChordVoicing) => void;
  onInversionStep?: (direction: 1 | -1) => void;
  voicingType: ChordVoicingType;
  onVoicingTypeChange: (value: ChordVoicingType) => void;
  extendedChords: boolean;
  onExtendedChordsChange: (value: boolean) => void;
  onOctaveStep?: (direction: 1 | -1) => void;
  canOctaveUp?: boolean;
  canOctaveDown?: boolean;
}

/** Controles compactos para notación y acordes extendidos. */
export function NotationAndChordToggles({
  notationLabel,
}: NotationAndChordTogglesProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
      }}
    >
      <span
        aria-label="Armadura de la tonalidad"
        style={notationIndicatorStyle}
      >
        {notationLabel === 'flats'
          ? '♭ Armadura: Bemoles'
          : notationLabel === 'sharps'
            ? '♯ Armadura: Sostenidos'
            : 'Armadura: ninguna'}
      </span>

    </div>
  );
}

export function InversionControls({
  voicing,
  onVoicingChange,
  onVoicingChangeSilent,
  onInversionStep,
  voicingType,
  onVoicingTypeChange,
  extendedChords,
  onExtendedChordsChange,
  onOctaveStep,
  canOctaveUp = true,
  canOctaveDown = true,
}: InversionControlsProps): JSX.Element {
  const voicingNumber = voicing === 'closed' ? 1 : Number(voicing.at(-1));
  const inversionCount = extendedChords ? 4 : 3;
  const handleVoicingTypeChange = (type: ChordVoicingType) => {
    onVoicingTypeChange(type);
    onVoicingChange(type === 'closed' ? 'closed' : `${type}-1` as ChordVoicing);
  };

  return (
    <div style={inversionControlsStyle}>
      <div role="radiogroup" aria-label="Tipo de inversiones" style={voicingTypeGroupStyle}>
        <div role="radiogroup" aria-label="Tipo de acorde" style={chordTypeGroupStyle}>
          {([false, true] as const).map((isTetrad) => (
            <button
              key={isTetrad ? 'tetrad' : 'triad'}
              type="button"
              role="radio"
              aria-checked={extendedChords === isTetrad}
              onClick={() => onExtendedChordsChange(isTetrad)}
              style={{
                ...chordTypeButtonStyle,
                background: extendedChords === isTetrad ? '#6366f1' : 'white',
                color: extendedChords === isTetrad ? 'white' : '#292524',
              }}
            >
              {isTetrad ? 'Tétrada (7)' : 'Tríada'}
            </button>
          ))}
        </div>
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
              opacity: type !== 'closed' && !extendedChords ? 0.5 : 1,
            }}
          >
            {type === 'closed' ? 'Cerrado' : type === 'drop2' ? 'Drop 2' : 'Drop 3'}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label={`Inversiones ${voicingType}`} style={voicingPositionsStyle}>
        <span style={voicingLabelStyle}>Inversiones</span>
        <button type="button" aria-label="Subir a la próxima inversión" onClick={() => onInversionStep?.(1)} style={voicingStepButtonStyle}>↑</button>
        {Array.from({ length: inversionCount }, (_, index) => index + 1).map((position) => (
          <button
            key={position}
            type="button"
            role="radio"
            aria-checked={voicingNumber === position}
            aria-label={`${voicingType} posición ${position}`}
            onClick={() => (onVoicingChangeSilent ?? onVoicingChange)(`${voicingType}-${position}` as ChordVoicing)}
            style={{ ...voicingPositionButtonStyle, background: voicingNumber === position ? '#0f766e' : 'white', color: voicingNumber === position ? 'white' : '#292524' }}
          >
            {position}
          </button>
        ))}
        <button type="button" aria-label="Bajar a la inversión anterior" onClick={() => onInversionStep?.(-1)} style={voicingStepButtonStyle}>↓</button>
      </div>
      <div role="group" aria-label="Cambiar octava de la inversión" style={voicingPositionsStyle}>
        <span style={voicingLabelStyle}>Octava</span>
        <button
          type="button"
          aria-label="Subir una octava"
          onClick={() => onOctaveStep?.(1)}
          disabled={!canOctaveUp}
          style={{ ...voicingStepButtonStyle, opacity: canOctaveUp ? 1 : 0.5, cursor: canOctaveUp ? 'pointer' : 'not-allowed' }}
        >
          ↑8
        </button>
        <button
          type="button"
          aria-label="Bajar una octava"
          onClick={() => onOctaveStep?.(-1)}
          disabled={!canOctaveDown}
          style={{ ...voicingStepButtonStyle, opacity: canOctaveDown ? 1 : 0.5, cursor: canOctaveDown ? 'pointer' : 'not-allowed' }}
        >
          ↓8
        </button>
      </div>
    </div>
  );
}

const inversionControlsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.75rem',
};

const chordTypeGroupStyle: React.CSSProperties = {
  display: 'inline-flex',
  border: '1px solid #d6d3d1',
  borderRadius: '0.5rem',
  overflow: 'hidden',
};

const chordTypeButtonStyle: React.CSSProperties = {
  minHeight: 58,
  padding: '0 1.2rem',
  border: 'none',
  borderRight: '1px solid #d6d3d1',
  fontSize: '1.35rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const notationIndicatorStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 58,
  padding: '0 1.2rem',
  border: '1px solid #d6d3d1',
  borderRadius: '0.5rem',
  background: '#f8fafc',
  color: '#57534e',
  fontSize: '1.35rem',
  fontWeight: 700,
};

const voicingLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  minHeight: 58,
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#57534e',
};

const voicingPositionsStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
};

const voicingPositionButtonStyle: React.CSSProperties = {
  minWidth: 'clamp(50px, 10vw, 60px)',
  minHeight: 'clamp(50px, 10vw, 60px)',
  border: '1px solid',
  borderRadius: '0.4rem',
  fontSize: '1.35rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const voicingStepButtonStyle: React.CSSProperties = {
  minWidth: 'clamp(50px, 10vw, 60px)',
  minHeight: 'clamp(50px, 10vw, 60px)',
  border: '1px solid #d6d3d1',
  borderRadius: '0.4rem',
  background: 'white',
  color: '#292524',
  fontSize: 'clamp(1.35rem, 4.2vw, 1.6rem)',
  fontWeight: 700,
  cursor: 'pointer',
};

const voicingTypeGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  border: '1px solid #d6d3d1',
  borderRadius: '0.5rem',
  overflow: 'visible',
};

const voicingTypeLabelStyle: React.CSSProperties = {
  padding: '0 0.8rem',
  color: '#57534e',
  fontSize: '1.35rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const voicingTypeButtonStyle: React.CSSProperties = {
  minHeight: 'clamp(50px, 10vw, 60px)',
  padding: '0 clamp(0.6rem, 2.4vw, 1.1rem)',
  border: 'none',
  borderRight: '1px solid #d6d3d1',
  fontWeight: 700,
  fontSize: 'clamp(1.1rem, 3.6vw, 1.35rem)',
  cursor: 'pointer',
};
