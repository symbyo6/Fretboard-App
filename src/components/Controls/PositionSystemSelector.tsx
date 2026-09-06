// src/components/Controls/PositionSystemSelector.tsx

import React, { useState } from 'react';
import type {
  PositionSystem,
  CagedShapeId,
  NpsDegree,
  PitchClass,
  FretRange,
} from '../../types';
import { CagedShapeSelector } from './CagedShapeSelector';
import { NpsShapeSelector } from './NpsShapeSelector';
import { getCagedShapeFretRange } from '../../lib/shapes/caged';
import { getNpsShapeFretRange } from '../../lib/shapes/npsShapes';
import {
  findNearestCagedShape,
  findNearestNpsShape,
} from '../../lib/shapes/shapeUtils';

interface PositionSystemSelectorProps {
  rootPitch: PitchClass;
  scaleId: string;
  positionSystem: PositionSystem;
  onPositionSystemChange: (system: PositionSystem) => void;
  cagedShapeId: CagedShapeId | null;
  onCagedShapeIdChange: (id: CagedShapeId | null) => void;
  npsDegree: NpsDegree | null;
  onNpsDegreeChange: (degree: NpsDegree | null) => void;
}

const SYSTEM_OPTIONS: { id: PositionSystem; label: string; symbol: string }[] = [
  { id: 'none', label: 'Mástil completo', symbol: 'Todos' },
  { id: 'caged', label: 'CAGED', symbol: 'C' },
  { id: '3nps', label: '3 notas/cuerda', symbol: '3NPS' },
];

/** Selector y orquestador del sistema de posiciones activo. */
export function PositionSystemSelector({
  rootPitch,
  scaleId,
  positionSystem,
  onPositionSystemChange,
  cagedShapeId,
  onCagedShapeIdChange,
  npsDegree,
  onNpsDegreeChange,
}: PositionSystemSelectorProps): JSX.Element {
  const [targetFret, setTargetFret] = useState(0);

  const activeRange: FretRange | null = (() => {
    if (positionSystem === 'caged' && cagedShapeId) {
      return getCagedShapeFretRange(rootPitch, scaleId, cagedShapeId);
    }
    if (positionSystem === '3nps' && npsDegree) {
      return getNpsShapeFretRange(rootPitch, scaleId, npsDegree);
    }
    return null;
  })();

  const handleSystemChange = (system: PositionSystem) => {
    onPositionSystemChange(system);
    if (system !== 'caged') onCagedShapeIdChange(null);
    if (system !== '3nps') onNpsDegreeChange(null);
  };

  const handleAutoSuggest = () => {
    const clampedFret = Math.max(0, Math.min(24, targetFret));

    if (positionSystem === 'caged') {
      const best = findNearestCagedShape(rootPitch, scaleId, clampedFret);
      onCagedShapeIdChange(best.id);
    } else if (positionSystem === '3nps') {
      const best = findNearestNpsShape(rootPitch, scaleId, clampedFret);
      onNpsDegreeChange(best.id);
    }
  };

  return (
    <div aria-label="Selector de sistema de posiciones">
      <div style={legendStyle}>Sistema de posiciones</div>

      <div
        role="radiogroup"
        style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}
      >
        {SYSTEM_OPTIONS.map((option) => {
          const isSelected = positionSystem === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSystemChange(option.id)}
              style={{
                minHeight: 44,
                flex: 1,
                borderRadius: '0.6rem',
                border: isSelected ? '2px solid #4338ca' : '1px solid #d6d3d1',
                background: isSelected ? '#6366f1' : 'white',
                color: isSelected ? 'white' : '#292524',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {option.symbol} {option.label}
            </button>
          );
        })}
      </div>

      {positionSystem === 'caged' && (
        <CagedShapeSelector
          rootPitch={rootPitch}
          scaleId={scaleId}
          value={cagedShapeId}
          onChange={onCagedShapeIdChange}
        />
      )}

      {positionSystem === '3nps' && (
        <NpsShapeSelector
          rootPitch={rootPitch}
          scaleId={scaleId}
          value={npsDegree}
          onChange={onNpsDegreeChange}
        />
      )}

      {positionSystem !== 'none' && (
        <div style={suggestionStyle}>
          <label htmlFor="target-fret-input" style={targetLabelStyle}>
            Sugerir forma cerca del traste:
          </label>
          <input
            id="target-fret-input"
            type="number"
            min={0}
            max={24}
            value={targetFret}
            onChange={(event) => setTargetFret(Number(event.target.value))}
            style={targetInputStyle}
          />
          <button
            type="button"
            onClick={handleAutoSuggest}
            style={suggestButtonStyle}
          >
            Sugerir
          </button>
        </div>
      )}

      {activeRange && (
        <p style={rangeTextStyle}>
          Ventana activa: trastes <strong>{activeRange.minFret}</strong>-
          <strong>{activeRange.maxFret}</strong> (
          {activeRange.maxFret - activeRange.minFret} de estiramiento)
        </p>
      )}
    </div>
  );
}

const legendStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#57534e',
  marginBottom: '0.4rem',
};

const suggestionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '0.6rem',
  flexWrap: 'wrap',
};

const targetLabelStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: '#78716c',
};

const targetInputStyle: React.CSSProperties = {
  width: 56,
  minHeight: 36,
  borderRadius: '0.4rem',
  border: '1px solid #d6d3d1',
  padding: '0 0.4rem',
  fontSize: '0.85rem',
};

const suggestButtonStyle: React.CSSProperties = {
  minHeight: 36,
  padding: '0 0.7rem',
  borderRadius: '0.5rem',
  border: '1px solid #a8a29e',
  background: '#f5f3ff',
  color: '#6366f1',
  fontWeight: 600,
  fontSize: '0.78rem',
  cursor: 'pointer',
};

const rangeTextStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  fontSize: '0.78rem',
  color: '#57534e',
};
