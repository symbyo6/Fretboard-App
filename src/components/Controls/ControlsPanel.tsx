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
import { useLanguage } from '../../i18n';
import { ChordSequencePanel } from './ChordSequencePanel';
import type { ParsedChordToken } from '../../lib/theory/chordSequence';
import type { LinkedChordStep } from '../../lib/theory/voiceLeading';

export interface ControlsPanelProps {
  rootPitch: PitchClass;
  preferredTonicName?: KeyName;
  useEnharmonicTonicName: boolean;
  onTonicNamePreferenceChange: (useEnharmonic: boolean) => void;
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
  degreeLabelMode: DegreeLabelMode;
  onDegreeLabelModeChange: (mode: DegreeLabelMode) => void;
  isMuted: boolean;
  onToggleMuted: () => void;
  chordSequence: string;
  onChordSequenceChange: (value: string) => void;
  analyzedChordSequence: ParsedChordToken[];
  linkedChordSequence: LinkedChordStep[];
  sequenceMode: 'diatonic' | 'linked';
  onSequenceModeChange: (mode: 'diatonic' | 'linked') => void;
  hasMixedChordTypes: boolean;
  onClearChordSequence: () => void;
  onTransposeChordSequence: () => void;
  linkedSequenceUnavailable: boolean;
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
  useEnharmonicTonicName,
  onTonicNamePreferenceChange,
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
  degreeLabelMode,
  onDegreeLabelModeChange,
  isMuted,
  onToggleMuted,
  chordSequence,
  onChordSequenceChange,
  analyzedChordSequence,
  linkedChordSequence,
  sequenceMode,
  onSequenceModeChange,
  hasMixedChordTypes,
  onClearChordSequence,
  onTransposeChordSequence,
  linkedSequenceUnavailable,
}: ControlsPanelProps): JSX.Element {
  const isCompact = useIsCompactViewport();
  const { language, setLanguage, t } = useLanguage();
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
      aria-label={language === 'es' ? 'Panel de controles' : 'Controls panel'}
      style={{
        background: 'white',
        borderRadius: '0.9rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: shouldShowControls ? '0.9rem' : '0.5rem 0.9rem',
      }}
    >
      <div style={languageRowStyle}>
        <span>{t('language')}</span>
        <div role="group" aria-label={t('language')} style={languageSwitchStyle}>
          {(['es', 'en'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={language === option}
              onClick={() => setLanguage(option)}
              style={{
                ...languageButtonStyle,
                background: language === option ? '#0f766e' : 'white',
                color: language === option ? 'white' : '#292524',
              }}
            >
              {option === 'es' ? t('spanish') : t('english')}
            </button>
          ))}
        </div>
      </div>
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
            useEnharmonicTonicName={useEnharmonicTonicName}
            onTonicNamePreferenceChange={onTonicNamePreferenceChange}
            onChange={onRootPitchChange}
          />

          <ScaleSelector value={scaleId} onChange={onScaleIdChange} muted={sequenceMode === 'linked'} />

          <ChordSequencePanel
            value={chordSequence}
            onChange={onChordSequenceChange}
            analysis={analyzedChordSequence}
            linkedSequence={linkedChordSequence}
            hasMixedChordTypes={hasMixedChordTypes}
            onClear={onClearChordSequence}
            onTranspose={onTransposeChordSequence}
            linkedSequenceUnavailable={linkedSequenceUnavailable}
            sequenceMode={sequenceMode}
            onSequenceModeChange={onSequenceModeChange}
          />

          <NotationAndChordToggles
            notationLabel={notationLabel}
          />

          {showChordFunctions && (
            <DegreeSelector
              chords={diatonicChords}
              value={degree}
              tonicName={sequenceMode === 'linked' ? '' : fundamentalChordName}
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
              isMuted={isMuted}
              onToggleMuted={onToggleMuted}
              scaleControlsMuted={sequenceMode === 'linked'}
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

const languageRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '0.65rem',
  color: '#57534e',
  fontSize: '0.8rem',
  fontWeight: 600,
};

const languageSwitchStyle: React.CSSProperties = {
  display: 'inline-flex',
  border: '1px solid #d6d3d1',
  borderRadius: '0.45rem',
  overflow: 'hidden',
};

const languageButtonStyle: React.CSSProperties = {
  minHeight: 32,
  padding: '0 0.65rem',
  border: 'none',
  borderRight: '1px solid #d6d3d1',
  cursor: 'pointer',
  fontSize: '0.76rem',
  fontWeight: 700,
};
