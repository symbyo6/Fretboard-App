import React from 'react';
import { useLanguage } from '../../i18n';
import type { ParsedChordToken } from '../../lib/theory/chordSequence';
import type { LinkedChordStep } from '../../lib/theory/voiceLeading';
import type { ProgressionStep } from '../../hooks/useProgression';

interface ChordSequencePanelProps {
  value: string;
  onChange: (value: string) => void;
  analysis: ParsedChordToken[];
  linkedSequence: LinkedChordStep[];
  sequenceMode: 'diatonic' | 'linked';
  onSequenceModeChange: (mode: 'diatonic' | 'linked') => void;
  playbackSteps: ProgressionStep[];
  activeStepIndex: number | null;
  isSequencePlaying: boolean;
  onStepPreview: (index: number) => void;
  hasMixedChordTypes: boolean;
  onClear: () => void;
  onTranspose: (semitones: number) => void;
  linkedSequenceUnavailable: boolean;
}

export function ChordSequencePanel({ value, onChange, analysis, linkedSequence, sequenceMode, onSequenceModeChange, playbackSteps, activeStepIndex, isSequencePlaying, onStepPreview, hasMixedChordTypes, onClear, onTranspose, linkedSequenceUnavailable }: ChordSequencePanelProps): JSX.Element {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const diatonicCount = analysis.filter((item) => item.status === 'diatonic').length;
  const hasChromatic = analysis.some((item) => item.status === 'chromatic');
  const hasInvalid = analysis.some((item) => item.status === 'invalid');

  return (
    <section className="sequence-workspace" aria-label={isEnglish ? 'Chord sequence' : 'Secuencia de acordes'} style={panelStyle}>
      <div className="sequence-panel-title" style={headingStyle}>{isEnglish ? 'Sequence mode' : 'Modo de secuencia'}</div>
      <div className="sequence-mode-group" role="group" aria-label={isEnglish ? 'Sequence source' : 'Fuente de secuencia'} style={modeStyle}>
        {(['diatonic', 'linked'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className="sequence-mode-button"
            aria-pressed={sequenceMode === mode}
            onClick={() => onSequenceModeChange(mode)}
            style={{ ...modeButtonStyle, background: sequenceMode === mode ? '#0f766e' : 'white', color: sequenceMode === mode ? 'white' : '#292524' }}
          >
            {mode === 'diatonic' ? (isEnglish ? 'Diatonic sequence' : 'Secuencia diatónica') : (isEnglish ? 'Linked sequence' : 'Secuencia enlazada')}
          </button>
        ))}
      </div>
      {sequenceMode === 'linked' && (
      <>
      <label className="sequence-input-label" htmlFor="chord-sequence-input" style={labelStyle}>
        {isEnglish ? 'American chord symbols' : 'Cifrado americano'}
      </label>
      <textarea
        className="sequence-chord-input"
        id="chord-sequence-input"
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=""
        aria-label={isEnglish ? 'American chord sequence' : 'Secuencia de acordes en cifrado americano'}
        style={inputStyle}
      />
      <button className="sequence-utility-button" type="button" onClick={onClear} style={clearButtonStyle}>
        {isEnglish ? 'Clear sequence' : 'Limpiar secuencia'}
      </button>
      <details className="sequence-transpose-menu">
        <summary className="sequence-utility-button sequence-transpose-trigger">
          {isEnglish ? 'Transpose' : 'Transportar'}
        </summary>
        <div className="sequence-transpose-options">
          {[1, -1].map((direction) => (
            <div className="sequence-transpose-direction" key={direction}>
              <div className="sequence-transpose-heading">
                {direction > 0
                  ? (isEnglish ? 'Transpose up (semitones)' : 'Subir (semitonos)')
                  : (isEnglish ? 'Transpose down (semitones)' : 'Bajar (semitonos)')}
              </div>
              <div className="sequence-transpose-option-grid">
                {Array.from({ length: 12 }, (_, index) => index + 1).map((amount) => {
                  const semitones = direction * amount;
                  const label = `${direction > 0 ? '+' : '-'}${amount}`;
                  const actionLabel = direction > 0
                    ? (isEnglish ? `Transpose up ${amount} semitones` : `Subir ${amount} semitonos`)
                    : (isEnglish ? `Transpose down ${amount} semitones` : `Bajar ${amount} semitonos`);
                  return (
                    <button
                      key={semitones}
                      className="sequence-transpose-option"
                      type="button"
                      aria-label={actionLabel}
                      title={actionLabel}
                      onClick={(event) => {
                        onTranspose(semitones);
                        const menu = event.currentTarget.closest('details');
                        if (menu) menu.open = false;
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
      {analysis.length > 0 && (
        <div className="sequence-analysis" style={analysisStyle}>
          <div className="sequence-analysis-summary" style={{ ...summaryStyle, color: hasInvalid || hasChromatic ? '#b45309' : '#166534' }}>
            {hasInvalid
              ? (isEnglish ? 'Invalid chord symbol' : 'Símbolo de acorde no válido')
              : hasChromatic
                ? `${diatonicCount}/${analysis.length} ${isEnglish ? 'diatonic chords; chromatic segment detected' : 'acordes diatónicos; segmento cromático detectado'}`
                : (isEnglish ? 'Fully diatonic sequence' : 'Secuencia completamente diatónica')}
          </div>
          {hasMixedChordTypes && (
            <div className="sequence-warning" style={warningStyle}>
              {isEnglish
                ? 'Mixed triads and tetrads: linking is disabled until all chords use the same number of voices.'
                : 'La secuencia mezcla tríadas y tétradas: el enlace está deshabilitado hasta usar el mismo número de voces.'}
            </div>
          )}
          {sequenceMode === 'linked' && linkedSequenceUnavailable && !hasMixedChordTypes && !hasInvalid && (
            <div className="sequence-warning" style={warningStyle}>
              {isEnglish
                ? 'No physical voicing fits this sequence with the current inversion, voicing, string group, and fret range. Try another group, voicing, or octave.'
                : 'Ninguna forma física acomoda esta secuencia con la inversión, voicing, grupo de cuerdas y rango actuales. Prueba otro grupo, voicing u octava.'}
            </div>
          )}
          <div className="sequence-chips" style={chipsStyle}>
            {(sequenceMode === 'linked' ? linkedSequence : analysis).map((item, index) => {
              const token = 'token' in item ? item.token : item;
              const status = 'linkStatus' in item
                ? item.linkStatus === 'unavailable' ? 'invalid' : item.linkStatus === 'initial' || item.linkStatus === 'linked' ? 'diatonic' : 'chromatic'
                : item.status;
              const chord = 'chord' in item ? item.chord : item.chord;
              const linkedInversion = playbackSteps[index]?.inversion ?? null;
              const details = [
                token.input,
                chord?.romanLabel,
                token.reason,
                linkedInversion ? `inversion ${linkedInversion}` : '',
                'delta' in item && item.delta ? `voice-leading delta ${item.delta}` : '',
              ].filter(Boolean).join(' · ');
              const playLabel = isEnglish
                ? `Play ${token.input || 'chord'}${linkedInversion ? `, linked inversion ${linkedInversion}` : ''}`
                : `Reproducir ${token.input || 'acorde'}${linkedInversion ? `, inversión enlazada ${linkedInversion}` : ''}`;
              const isActive = activeStepIndex === index;
              return (
              <button
                key={`${token.input}-${index}`}
                type="button"
                className="sequence-chip"
                aria-label={playLabel}
                aria-pressed={isActive}
                disabled={!playbackSteps[index] || isSequencePlaying}
                onClick={() => onStepPreview(index)}
                title={details}
                style={{
                  ...chipStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: !playbackSteps[index] || isSequencePlaying ? 'not-allowed' : 'pointer',
                  opacity: isSequencePlaying ? 0.6 : 1,
                  background: isActive ? '#dcfce7' : chipStyle.background,
                  color: isActive ? '#166534' : chipStyle.color,
                  boxShadow: isActive ? '0 0 0 2px #0f766e' : undefined,
                  borderColor: status === 'invalid' ? '#dc2626' : status === 'chromatic' ? '#d97706' : '#16a34a',
                }}
              >
                {token.input || '—'}
              </button>
              );
            })}
          </div>
          {sequenceMode === 'linked'
            && linkedSequence.length > 0
            && linkedSequence.every((step) => step.chord && !step.chord.isExtended)
            && (
              <div style={triadTableWrapperStyle}>
                <div style={triadTableTitleStyle}>
                  {isEnglish ? 'Triad table in use' : 'Tabla de tríadas en uso'}
                </div>
                <table style={triadTableStyle}>
                  <thead>
                    <tr>
                      <th style={triadHeaderStyle}>{isEnglish ? 'Transition' : 'Transición'}</th>
                      <th style={triadHeaderStyle}>Δ</th>
                      <th style={triadHeaderStyle}>{isEnglish ? 'Source inv.' : 'Inv. origen'}</th>
                      <th style={triadHeaderStyle}>{isEnglish ? 'Target inv.' : 'Inv. destino'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedSequence.map((step, index) => {
                      const previousStep = linkedSequence[index - 1];
                      const transition = previousStep?.chord && step.chord
                        ? `${previousStep.chord.romanLabel} → ${step.chord.romanLabel}`
                        : step.chord?.romanLabel ?? step.token.input;
                      return (
                        <tr key={`triad-row-${step.token.input}-${index}`}>
                          <td style={triadCellStyle}>{transition}</td>
                          <td style={triadCellStyle}>{step.delta ?? '—'}</td>
                          <td style={triadCellStyle}>{step.sourceInversion ?? '—'}</td>
                          <td style={triadCellStyle}>{step.targetInversion ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}
      </>
      )}
    </section>
  );
}

const panelStyle: React.CSSProperties = { flex: '0 0 auto', marginBottom: '0.45rem', padding: '0.55rem 0.7rem', border: '1px solid #d6d3d1', borderRadius: '0.5rem', background: '#fff' };
const headingStyle: React.CSSProperties = { fontSize: '1rem', lineHeight: 1.2, fontWeight: 700, color: '#292524', marginBottom: '0.35rem' };
const modeStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.45rem' };
const modeButtonStyle: React.CSSProperties = { minHeight: 38, padding: '0 0.75rem', border: '1px solid #d6d3d1', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700 };
const labelStyle: React.CSSProperties = { display: 'block', color: '#57534e', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' };
const inputStyle: React.CSSProperties = { display: 'block', width: '100%', minHeight: 64, padding: '0.4rem 0.55rem', border: '1px solid #a8a29e', borderRadius: '0.35rem', fontSize: '0.95rem', lineHeight: 1.3, color: '#292524', resize: 'vertical' };
const analysisStyle: React.CSSProperties = { marginTop: '0.45rem' };
const summaryStyle: React.CSSProperties = { fontSize: '0.9rem', lineHeight: 1.2, fontWeight: 700, marginBottom: '0.4rem' };
const warningStyle: React.CSSProperties = { marginBottom: '0.45rem', padding: '0.35rem 0.5rem', borderRadius: '0.35rem', background: '#fff7ed', color: '#b45309', fontSize: '0.8rem', fontWeight: 700 };
const clearButtonStyle: React.CSSProperties = { margin: '0.35rem 0.35rem 0 0', minHeight: 30, padding: '0 0.55rem', border: '1px solid #a8a29e', borderRadius: '0.35rem', background: '#fff', color: '#57534e', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 };
const chipsStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' };
const chipStyle: React.CSSProperties = { padding: '0.25rem 0.45rem', border: '1px solid', borderRadius: '0.35rem', background: '#fafaf9', fontSize: '0.78rem', color: '#44403c' };
const triadTableWrapperStyle: React.CSSProperties = { marginTop: '1rem', overflowX: 'auto' };
const triadTableTitleStyle: React.CSSProperties = { marginBottom: '0.45rem', color: '#57534e', fontSize: '1.15rem', fontWeight: 700 };
const triadTableStyle: React.CSSProperties = { width: '100%', minWidth: 420, borderCollapse: 'collapse', background: '#fafaf9', fontSize: '1rem' };
const triadHeaderStyle: React.CSSProperties = { padding: '0.5rem 0.65rem', border: '1px solid #d6d3d1', background: '#e7e5e4', color: '#44403c', textAlign: 'left', fontWeight: 700 };
const triadCellStyle: React.CSSProperties = { padding: '0.5rem 0.65rem', border: '1px solid #e7e5e4', color: '#57534e' };
