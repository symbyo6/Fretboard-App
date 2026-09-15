import React from 'react';
import { useLanguage } from '../../i18n';
import type { ParsedChordToken } from '../../lib/theory/chordSequence';
import type { LinkedChordStep } from '../../lib/theory/voiceLeading';

interface ChordSequencePanelProps {
  value: string;
  onChange: (value: string) => void;
  analysis: ParsedChordToken[];
  linkedSequence: LinkedChordStep[];
  sequenceMode: 'diatonic' | 'linked';
  onSequenceModeChange: (mode: 'diatonic' | 'linked') => void;
  hasMixedChordTypes: boolean;
  onClear: () => void;
  linkedSequenceUnavailable: boolean;
}

export function ChordSequencePanel({ value, onChange, analysis, linkedSequence, sequenceMode, onSequenceModeChange, hasMixedChordTypes, onClear, linkedSequenceUnavailable }: ChordSequencePanelProps): JSX.Element {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const diatonicCount = analysis.filter((item) => item.status === 'diatonic').length;
  const hasChromatic = analysis.some((item) => item.status === 'chromatic');
  const hasInvalid = analysis.some((item) => item.status === 'invalid');

  return (
    <section aria-label={isEnglish ? 'Chord sequence' : 'Secuencia de acordes'} style={panelStyle}>
      <div style={headingStyle}>{isEnglish ? 'Linked chord sequence' : 'Secuencia de acordes enlazada'}</div>
      <div role="group" aria-label={isEnglish ? 'Sequence source' : 'Fuente de secuencia'} style={modeStyle}>
        {(['diatonic', 'linked'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={sequenceMode === mode}
            onClick={() => onSequenceModeChange(mode)}
            style={{ ...modeButtonStyle, background: sequenceMode === mode ? '#0f766e' : 'white', color: sequenceMode === mode ? 'white' : '#292524' }}
          >
            {mode === 'diatonic' ? (isEnglish ? 'Diatonic sequence' : 'Secuencia diatónica') : (isEnglish ? 'Linked sequence' : 'Secuencia enlazada')}
          </button>
        ))}
      </div>
      <label htmlFor="chord-sequence-input" style={labelStyle}>
        {isEnglish ? 'American chord symbols' : 'Cifrado americano'}
      </label>
      <input
        id="chord-sequence-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={isEnglish ? 'Dm7 - G7 - Cmaj7' : 'Dm7 - G7 - Cmaj7'}
        aria-label={isEnglish ? 'American chord sequence' : 'Secuencia de acordes en cifrado americano'}
        style={inputStyle}
      />
      <button type="button" onClick={onClear} style={clearButtonStyle}>
        {isEnglish ? 'Clear sequence' : 'Limpiar secuencia'}
      </button>
      {analysis.length > 0 && (
        <div style={analysisStyle}>
          {sequenceMode === 'diatonic' && (
            <div style={noticeStyle}>
              {isEnglish
                ? 'Sequence entered. Select Linked sequence to use these chords.'
                : 'Secuencia introducida. Selecciona Secuencia enlazada para usar estos acordes.'}
            </div>
          )}
          <div style={{ ...summaryStyle, color: hasInvalid || hasChromatic ? '#b45309' : '#166534' }}>
            {hasInvalid
              ? (isEnglish ? 'Invalid chord symbol' : 'Símbolo de acorde no válido')
              : hasChromatic
                ? `${diatonicCount}/${analysis.length} ${isEnglish ? 'diatonic chords; chromatic segment detected' : 'acordes diatónicos; segmento cromático detectado'}`
                : (isEnglish ? 'Fully diatonic sequence' : 'Secuencia completamente diatónica')}
          </div>
          {hasMixedChordTypes && (
            <div style={warningStyle}>
              {isEnglish
                ? 'Mixed triads and tetrads: linking is disabled until all chords use the same number of voices.'
                : 'La secuencia mezcla tríadas y tétradas: el enlace está deshabilitado hasta usar el mismo número de voces.'}
            </div>
          )}
          {sequenceMode === 'linked' && linkedSequenceUnavailable && !hasMixedChordTypes && !hasInvalid && (
            <div style={warningStyle}>
              {isEnglish
                ? 'No physical voicing fits this sequence with the current inversion, voicing, string group, and fret range. Try another group, voicing, or octave.'
                : 'Ninguna forma física acomoda esta secuencia con la inversión, voicing, grupo de cuerdas y rango actuales. Prueba otro grupo, voicing u octava.'}
            </div>
          )}
          <div style={chipsStyle}>
            {(sequenceMode === 'linked' ? linkedSequence : analysis).map((item, index) => {
              const token = 'token' in item ? item.token : item;
              const status = 'linkStatus' in item
                ? item.linkStatus === 'unavailable' ? 'invalid' : item.linkStatus === 'initial' || item.linkStatus === 'linked' ? 'diatonic' : 'chromatic'
                : item.status;
              const chord = 'chord' in item ? item.chord : item.chord;
              return (
              <span
                key={`${token.input}-${index}`}
                title={token.reason}
                style={{ ...chipStyle, borderColor: status === 'invalid' ? '#dc2626' : status === 'chromatic' ? '#d97706' : '#16a34a' }}
              >
                {token.input || '—'} {chord ? `· ${chord.romanLabel}` : ''}
                {token.status === 'diatonic'
                  ? (isEnglish ? ' · diatonic chord' : ' · acorde diatónico')
                  : token.rootIsDiatonic
                    ? (isEnglish ? ' · diatonic root / chromatic quality' : ' · raíz diatónica / especie cromática')
                    : token.status === 'chromatic'
                      ? (isEnglish ? ' · chromatic root and quality' : ' · raíz y especie cromáticas')
                      : ''}
                {'targetInversion' in item && item.targetInversion ? ` · inv. ${item.targetInversion}` : ''}
                {'delta' in item && item.delta ? ` · Δ${item.delta}` : ''}
              </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const panelStyle: React.CSSProperties = { padding: '1.8rem', border: '1px solid #d6d3d1', borderRadius: '0.9rem', background: '#fff' };
const headingStyle: React.CSSProperties = { fontSize: '3rem', lineHeight: 1.1, fontWeight: 700, color: '#292524', marginBottom: '1.2rem' };
const modeStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' };
const modeButtonStyle: React.CSSProperties = { minHeight: 96, padding: '0 1.5rem', border: '1px solid #d6d3d1', borderRadius: '0.7rem', cursor: 'pointer', fontSize: '2.1rem', fontWeight: 700 };
const labelStyle: React.CSSProperties = { display: 'block', color: '#57534e', fontSize: '2rem', fontWeight: 600, marginBottom: '0.6rem' };
const inputStyle: React.CSSProperties = { width: '100%', minHeight: 132, padding: '0 1.5rem', border: '2px solid #a8a29e', borderRadius: '0.7rem', fontSize: '2.7rem', color: '#292524' };
const analysisStyle: React.CSSProperties = { marginTop: '1.2rem' };
const summaryStyle: React.CSSProperties = { fontSize: '2rem', lineHeight: 1.2, fontWeight: 700, marginBottom: '0.8rem' };
const noticeStyle: React.CSSProperties = { marginBottom: '0.7rem', padding: '0.55rem 0.7rem', borderRadius: '0.45rem', background: '#eff6ff', color: '#1d4ed8', fontSize: '1.1rem', fontWeight: 600 };
const warningStyle: React.CSSProperties = { marginBottom: '0.7rem', padding: '0.55rem 0.7rem', borderRadius: '0.45rem', background: '#fff7ed', color: '#b45309', fontSize: '1.1rem', fontWeight: 700 };
const clearButtonStyle: React.CSSProperties = { marginTop: '0.7rem', minHeight: 42, padding: '0 0.8rem', border: '1px solid #a8a29e', borderRadius: '0.45rem', background: '#fff', color: '#57534e', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 };
const chipsStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.7rem' };
const chipStyle: React.CSSProperties = { padding: '0.65rem 1rem', border: '2px solid', borderRadius: '999px', background: '#fafaf9', fontSize: '1.7rem', color: '#44403c' };
