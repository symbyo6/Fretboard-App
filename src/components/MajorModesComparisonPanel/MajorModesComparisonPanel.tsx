import React, { useMemo, useState } from 'react';
import type { KeyName } from '../../types';
import { compareMajorModes, diffModes } from '../../lib/theory/compareModes';
import { MODE_LIBRARY, MODES_BY_BRIGHTNESS, type ModeId } from '../../lib/theory/modes';

interface MajorModesComparisonPanelProps {
  tonic: KeyName;
}

/** Compara los siete modos de la escala mayor y sus diferencias de intervalos. */
export function MajorModesComparisonPanel({ tonic }: MajorModesComparisonPanelProps): JSX.Element {
  const [modeA, setModeA] = useState<ModeId>('ionian');
  const [modeB, setModeB] = useState<ModeId>('lydian');
  const result = useMemo(() => compareMajorModes(tonic), [tonic]);
  const differences = useMemo(() => diffModes(tonic, modeA, modeB), [tonic, modeA, modeB]);

  return (
    <section style={panelStyle} role="region" aria-label="Comparación de modos mayores">
      <h3 style={headingStyle}>Modos mayores: rueda de brillo</h3>

      <div style={brightnessScrollStyle} aria-label="Selector de brillo modal">
        {MODES_BY_BRIGHTNESS.map((modeId) => {
          const isSelected = modeA === modeId;

          return (
            <button
              key={modeId}
              type="button"
              onClick={() => setModeA(modeId)}
              aria-pressed={isSelected}
              style={{
                ...brightnessButtonStyle,
                ...(isSelected ? selectedBrightnessButtonStyle : undefined),
              }}
            >
              {MODE_LIBRARY[modeId].name}
            </button>
          );
        })}
      </div>
      <p style={brightnessHintStyle}>Más oscuro: Locrio. Más brillante: Lidio.</p>

      <div style={tableScrollStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Modo</th>
              {[1, 2, 3, 4, 5, 6, 7].map((degree) => (
                <th key={degree} style={centerHeaderCellStyle}>{degree}</th>
              ))}
              <th style={headerCellStyle}>Nota característica</th>
            </tr>
          </thead>
          <tbody>
            {result.modes.map((mode) => (
              <tr key={mode.id} style={mode.id === modeA ? selectedRowStyle : undefined}>
                <td style={cellStyle}>{mode.name}</td>
                {mode.notes.map((note, index) => (
                  <td key={index} style={centerCellStyle}>{note}</td>
                ))}
                <td style={characteristicCellStyle}>
                  {mode.characteristicNote}: {mode.characteristicLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={comparisonControlsStyle}>
        <label style={selectLabelStyle}>
          Modo A
          <select
            value={modeA}
            onChange={(event) => setModeA(event.target.value as ModeId)}
            style={selectStyle}
          >
            {Object.values(MODE_LIBRARY).map((mode) => (
              <option key={mode.id} value={mode.id}>{mode.name}</option>
            ))}
          </select>
        </label>
        <span aria-hidden="true" style={versusStyle}>vs</span>
        <label style={selectLabelStyle}>
          Modo B
          <select
            value={modeB}
            onChange={(event) => setModeB(event.target.value as ModeId)}
            style={selectStyle}
          >
            {Object.values(MODE_LIBRARY).map((mode) => (
              <option key={mode.id} value={mode.id}>{mode.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={differencesStyle}>
        {differences.length === 0 ? (
          <p style={paragraphStyle}>Los modos son idénticos.</p>
        ) : (
          <ul style={differenceListStyle}>
            {differences.map((difference) => (
              <li key={difference.degree}>
                Grado {difference.degree}: <strong>{difference.noteA}</strong> ({MODE_LIBRARY[modeA].name})
                {' vs '}<strong>{difference.noteB}</strong> ({MODE_LIBRARY[modeB].name})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem',
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  color: '#292524',
  fontSize: '0.95rem',
  fontWeight: 700,
};

const brightnessScrollStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  overflowX: 'auto',
  paddingBottom: '0.15rem',
};

const brightnessButtonStyle: React.CSSProperties = {
  minHeight: '44px',
  flex: '0 0 auto',
  padding: '0.45rem 0.7rem',
  border: '1px solid #d6d3d1',
  borderRadius: '6px',
  background: '#f5f5f4',
  color: '#44403c',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 700,
};

const selectedBrightnessButtonStyle: React.CSSProperties = {
  borderColor: '#0f766e',
  background: '#0f766e',
  color: '#fff',
};

const brightnessHintStyle: React.CSSProperties = {
  margin: 0,
  color: '#78716c',
  fontSize: '0.75rem',
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: '46rem',
  borderCollapse: 'collapse',
  fontSize: '0.78rem',
};

const headerCellStyle: React.CSSProperties = {
  padding: '0.45rem',
  borderBottom: '1px solid #d6d3d1',
  color: '#57534e',
  textAlign: 'left',
};

const centerHeaderCellStyle: React.CSSProperties = {
  ...headerCellStyle,
  textAlign: 'center',
};

const cellStyle: React.CSSProperties = {
  padding: '0.45rem',
  borderBottom: '1px solid #e7e5e4',
  color: '#292524',
};

const centerCellStyle: React.CSSProperties = {
  ...cellStyle,
  textAlign: 'center',
};

const characteristicCellStyle: React.CSSProperties = {
  ...cellStyle,
  color: '#0f766e',
  fontWeight: 700,
};

const selectedRowStyle: React.CSSProperties = {
  background: '#f0fdfa',
};

const comparisonControlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

const selectLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  color: '#57534e',
  fontSize: '0.75rem',
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  minHeight: '40px',
  padding: '0.35rem 0.5rem',
  border: '1px solid #a8a29e',
  borderRadius: '5px',
  background: '#fff',
  color: '#292524',
};

const versusStyle: React.CSSProperties = {
  paddingBottom: '0.65rem',
  color: '#78716c',
  fontSize: '0.8rem',
  fontWeight: 700,
};

const differencesStyle: React.CSSProperties = {
  color: '#44403c',
  fontSize: '0.8rem',
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
};

const differenceListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '1.25rem',
  lineHeight: 1.6,
};
