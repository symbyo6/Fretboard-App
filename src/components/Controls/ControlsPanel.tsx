// src/components/Controls/ControlsPanel.tsx

import React, { useEffect, useState } from 'react';
import type {
  PitchClass,
  KeyName,
  NotationPreference,
  DiatonicChordInfo,
  DegreeLabelMode,
} from '../../types';
import { KeySelector } from './KeySelector';
import { ScaleSelector } from './ScaleSelector';
import { DegreeSelector } from './DegreeSelector';
import { NotationAndChordToggles } from './NotationAndChordToggles';
import { getNoteName, getScaleById } from '../../lib/theory/scales';
import type { ChordVoicing, ChordVoicingType } from '../../lib/theory/chords';

export interface ControlsPanelProps {
  rootPitch: PitchClass;
  preferredTonicName?: KeyName;
  onRootPitchChange: (pitch: PitchClass) => void;
  scaleId: string;
  onScaleIdChange: (scaleId: string) => void;
  degree: number;
  onDegreeChange: (degree: number) => void;
  onChordSelect: (degree: number) => void;
  playingChordLabel?: string | null;
  playingTabPositions?: { string: number; fret: number }[];
  modeDegree: number;
  onModeDegreeChange: (degree: number) => void;
  modeDescriptions?: Record<number, string>;
  modeFamily: 'major' | 'harmonic-minor' | 'melodic-minor';
  onModeFamilyChange: (family: 'major' | 'harmonic-minor' | 'melodic-minor') => void;
  showChordFunctions: boolean;
  diatonicChords: DiatonicChordInfo[];
  fundamentalChordName: string;
  notation: NotationPreference;
  notationLabel: 'flats' | 'sharps' | 'none';
  extendedChords: boolean;
  onExtendedChordsChange: (value: boolean) => void;
  voicing: ChordVoicing;
  onVoicingChange: (value: ChordVoicing) => void;
  voicingType: ChordVoicingType;
  onVoicingTypeChange: (value: ChordVoicingType) => void;
  degreeLabelMode: DegreeLabelMode;
  onDegreeLabelModeChange: (mode: DegreeLabelMode) => void;
}

/** Detecta viewport angosto sin depender de hooks externos. */
function useIsCompactViewport(breakpointPx = 720): boolean {
  const [isCompact, setIsCompact] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false
  );

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < breakpointPx);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpointPx]);

  return isCompact;
}

/** Contenedor responsive de los controles principales de teoría. */
export function ControlsPanel({
  rootPitch,
  preferredTonicName,
  onRootPitchChange,
  scaleId,
  onScaleIdChange,
  degree,
  onDegreeChange,
  onChordSelect,
  playingChordLabel,
  playingTabPositions,
  modeDegree,
  onModeDegreeChange,
  modeDescriptions,
  modeFamily,
  onModeFamilyChange,
  showChordFunctions,
  diatonicChords,
  fundamentalChordName,
  notation,
  notationLabel,
  extendedChords,
  onExtendedChordsChange,
  voicing,
  onVoicingChange,
  voicingType,
  onVoicingTypeChange,
  degreeLabelMode,
  onDegreeLabelModeChange,
}: ControlsPanelProps): JSX.Element {
  const isCompact = useIsCompactViewport();
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowControls = !isCompact || isExpanded;

  useEffect(() => {
    if (isCompact) {
      // Reopen the compact panel when the viewport becomes narrow.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExpanded(true);
    }
  }, [isCompact]);

  const currentScaleName = getScaleById(scaleId)?.name ?? scaleId;
  const currentDegreeChord = diatonicChords.find((chord) => chord.degree === degree);
  const summaryLabel = `${getNoteName(rootPitch, notation)} ${currentScaleName} · ${
    currentDegreeChord?.romanNumeral ?? degree
  }`;

  return (
    <section
      aria-label="Panel de controles"
      style={{
        background: 'white',
        borderRadius: '0.9rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: shouldShowControls ? '0.9rem' : '0.5rem 0.9rem',
      }}
    >
      {isCompact && (
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={shouldShowControls}
          style={collapseButtonStyle}
        >
          <span>{summaryLabel}</span>
          <span style={{ fontSize: '0.8rem', color: '#78716c' }}>
            {isExpanded ? 'Ocultar' : 'Editar'}
          </span>
        </button>
      )}

      {shouldShowControls && (
        <div
          style={{
            display: isCompact ? 'flex' : 'grid',
            gridTemplateColumns: isCompact ? undefined : 'minmax(0, 1fr)',
            alignItems: 'start',
            gap: '1rem',
            marginTop: isCompact ? '0.75rem' : 0,
          }}
        >
          <KeySelector
            value={rootPitch}
            preferredTonicName={preferredTonicName}
            onChange={onRootPitchChange}
          />

          <ScaleSelector value={scaleId} onChange={onScaleIdChange} />

          <NotationAndChordToggles
            notation={notation}
            notationLabel={notationLabel}
            extendedChords={extendedChords}
            onExtendedChordsChange={onExtendedChordsChange}
            voicing={voicing}
            onVoicingChange={onVoicingChange}
            voicingType={voicingType}
            onVoicingTypeChange={onVoicingTypeChange}
          />

          {showChordFunctions && (
            <DegreeSelector
              chords={diatonicChords}
              value={degree}
              tonicName={fundamentalChordName}
              onChange={onDegreeChange}
              onChordSelect={onChordSelect}
              playingChordLabel={playingChordLabel}
              playingTabPositions={playingTabPositions}
              extendedChords={extendedChords}
              modeDegree={modeDegree}
              onModeDegreeChange={onModeDegreeChange}
              modeDescriptions={modeDescriptions}
              modeFamily={modeFamily}
              onModeFamilyChange={onModeFamilyChange}
              labelMode={degreeLabelMode}
              onLabelModeChange={onDegreeLabelModeChange}
            />
          )}
        </div>
      )}
    </section>
  );
}

const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  fontWeight: 700,
  fontSize: '0.95rem',
  color: '#292524',
  cursor: 'pointer',
};
