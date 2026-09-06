// src/components/Controls/ShapeComparisonControls.tsx

import React from 'react';
import type { CagedShapeId, NpsDegree, PitchClass } from '../../types';
import type { ShapeSelection } from '../../lib/shapes/shapeComparison';
import { CAGED_SHAPE_ORDER } from '../../lib/shapes/caged';
import { NPS_DEGREES } from '../../lib/shapes/npsShapes';
import { CAGED_SHAPE_COLOR, NPS_DEGREE_COLOR } from './shapeColors';
import { findBestOverlapPair } from '../../lib/shapes/shapeComparison';

interface ShapeComparisonControlsProps {
  rootPitch: PitchClass;
  scaleId: string;
  shapeA: ShapeSelection;
  shapeB: ShapeSelection;
  onShapeAChange: (selection: ShapeSelection) => void;
  onShapeBChange: (selection: ShapeSelection) => void;
}

const ROMAN_DEGREE: Record<NpsDegree, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
};

function ShapePicker({
  value,
  onChange,
  accentColor,
  slotLabel,
}: {
  value: ShapeSelection;
  onChange: (selection: ShapeSelection) => void;
  accentColor: string;
  slotLabel: string;
}): JSX.Element {
  const handleSystemChange = (system: 'caged' | '3nps') => {
    if (system === 'caged') {
      onChange({ system: 'caged', shapeId: CAGED_SHAPE_ORDER[0] });
    } else {
      onChange({ system: '3nps', degree: NPS_DEGREES[0] });
    }
  };

  return (
    <div style={pickerStyle(accentColor)}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accentColor }}>
        {slotLabel}
      </span>

      <select
        value={value.system}
        onChange={(event) => handleSystemChange(event.target.value as 'caged' | '3nps')}
        style={selectStyle}
      >
        <option value="caged">CAGED</option>
        <option value="3nps">3 notas/cuerda</option>
      </select>

      {value.system === 'caged' ? (
        <select
          value={value.shapeId}
          onChange={(event) => onChange({
            system: 'caged',
            shapeId: event.target.value as CagedShapeId,
          })}
          style={selectStyle}
        >
          {CAGED_SHAPE_ORDER.map((shapeId) => (
            <option key={shapeId} value={shapeId}>
              Forma {shapeId} ({CAGED_SHAPE_COLOR[shapeId]})
            </option>
          ))}
        </select>
      ) : (
        <select
          value={value.degree}
          onChange={(event) => onChange({
            system: '3nps',
            degree: Number(event.target.value) as NpsDegree,
          })}
          style={selectStyle}
        >
          {NPS_DEGREES.map((degree) => (
            <option key={degree} value={degree}>
              Patrón {ROMAN_DEGREE[degree]} ({NPS_DEGREE_COLOR[degree]})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Selectores de formas A/B, intercambio y Auto-Match. */
export function ShapeComparisonControls({
  rootPitch,
  scaleId,
  shapeA,
  shapeB,
  onShapeAChange,
  onShapeBChange,
}: ShapeComparisonControlsProps): JSX.Element {
  const handleAutoMatch = () => {
    const best = findBestOverlapPair(rootPitch, scaleId);
    onShapeAChange({ system: 'caged', shapeId: best.cagedShapeId });
    onShapeBChange({ system: '3nps', degree: best.npsDegree });
  };

  const handleSwap = () => {
    onShapeAChange(shapeB);
    onShapeBChange(shapeA);
  };

  return (
    <div style={controlsStyle}>
      <ShapePicker
        value={shapeA}
        onChange={onShapeAChange}
        accentColor="#7c3aed"
        slotLabel="Forma A"
      />

      <div style={actionsStyle}>
        <button type="button" onClick={handleSwap} title="Intercambiar Forma A y Forma B" style={actionButtonStyle}>
          Intercambiar
        </button>
        <button type="button" onClick={handleAutoMatch} title="Encontrar el par con mayor solapamiento" style={autoMatchButtonStyle}>
          Auto-Match
        </button>
      </div>

      <ShapePicker
        value={shapeB}
        onChange={onShapeBChange}
        accentColor="#ea580c"
        slotLabel="Forma B"
      />
    </div>
  );
}

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  alignItems: 'stretch',
};

const pickerStyle = (accentColor: string): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  padding: '0.6rem',
  borderRadius: '0.6rem',
  border: `2px solid ${accentColor}`,
  minWidth: 160,
  flex: 1,
});

const selectStyle: React.CSSProperties = {
  minHeight: 40,
  borderRadius: '0.4rem',
  border: '1px solid #d6d3d1',
  fontSize: '0.82rem',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  justifyContent: 'center',
};

const actionButtonStyle: React.CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  borderRadius: '0.5rem',
  border: '1px solid #d6d3d1',
  background: 'white',
  cursor: 'pointer',
};

const autoMatchButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  padding: '0 0.5rem',
  border: '1px solid #4338ca',
  background: '#eef2ff',
  color: '#4338ca',
  fontWeight: 700,
  fontSize: '0.75rem',
};
