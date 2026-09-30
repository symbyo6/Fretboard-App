import { useLanguage } from '../../i18n';
// src/components/Controls/KeySelector.tsx

import React from 'react';
import type { KeyName, PitchClass } from '../../types';

interface KeySelectorProps {
  value: PitchClass;
  preferredTonicName?: KeyName;
  useEnharmonicTonicName: boolean;
  onTonicNamePreferenceChange: (useEnharmonic: boolean) => void;
  onChange: (pitch: PitchClass) => void;
}

const SHARP_TONIC_NAMES: KeyName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TONIC_NAMES: KeyName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Selector desplegable de las 12 tónicas. */
export function KeySelector({
  value,
  useEnharmonicTonicName,
  onTonicNamePreferenceChange,
  onChange,
}: KeySelectorProps): JSX.Element {
  const { t } = useLanguage();
  return (
    <fieldset
      style={{ border: 'none', margin: 0, padding: 0 }}
      aria-label={t('tonality')}
    >
      <legend style={legendStyle}>🎹 {t('tonality')}</legend>

      <button
        type="button"
        aria-pressed={useEnharmonicTonicName}
        aria-label={t('enharmonicName')}
        onClick={() => onTonicNamePreferenceChange(!useEnharmonicTonicName)}
        className={useEnharmonicTonicName ? 'enharmonic-toggle-active' : undefined}
        style={{
          ...enharmonicToggleStyle,
          background: useEnharmonicTonicName ? '#0f766e' : 'white',
          borderColor: useEnharmonicTonicName ? '#0f766e' : '#d6d3d1',
          color: useEnharmonicTonicName ? 'white' : '#57534e',
        }}
      >
        <span aria-hidden="true">♯/♭</span>
        <span>{t('enharmonicName')}</span>
      </button>

      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as PitchClass)}
        aria-label={t('tonality')}
        style={selectStyle}
      >
        {(useEnharmonicTonicName ? SHARP_TONIC_NAMES : FLAT_TONIC_NAMES).map((label, pitch) => (
          <option key={pitch} value={pitch}>{label}</option>
        ))}
      </select>
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

const enharmonicToggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  width: '100%',
  marginBottom: '0.55rem',
  minHeight: 58,
  padding: '0 1.2rem',
  border: '1px solid #d6d3d1',
  borderRadius: '0.6rem',
  fontWeight: 700,
  fontSize: '1.35rem',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 88,
  borderRadius: '0.5rem',
  border: '1px solid #d6d3d1',
  padding: '0 1.2rem',
  fontSize: '1.8rem',
  background: 'white',
  color: '#292524',
  cursor: 'pointer',
};
