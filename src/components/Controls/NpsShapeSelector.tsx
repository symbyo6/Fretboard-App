// src/components/Controls/NpsShapeSelector.tsx

import React from 'react';
import type { NpsDegree, PitchClass } from '../../types';
import { NPS_DEGREES, getNpsShapeFretRange } from '../../lib/shapes/npsShapes';
import { NPS_DEGREE_COLOR } from './shapeColors';
import {
  shapeChipStyle,
  shapeRangeLabelStyle,
  shapeLegendStyle,
} from './shapeChipStyles';

interface NpsShapeSelectorProps {
  rootPitch: PitchClass;
  scaleId: string;
  value: NpsDegree | null;
  onChange: (degree: NpsDegree | null) => void;
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

/** Selector de los siete patrones de tres notas por cuerda. */
export function NpsShapeSelector({
  rootPitch,
  scaleId,
  value,
  onChange,
}: NpsShapeSelectorProps): JSX.Element {
  return (
    <div aria-label="Selector de patrón 3NPS">
      <div style={shapeLegendStyle}>Patrón 3 notas/cuerda (3NPS)</div>

      <div
        role="radiogroup"
        style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '0.3rem',
        }}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          style={shapeChipStyle(value === null, '#57534e')}
        >
          Todos
        </button>

        {NPS_DEGREES.map((degree) => {
          const range = getNpsShapeFretRange(rootPitch, scaleId, degree);
          const isSelected = value === degree;
          const color = NPS_DEGREE_COLOR[degree];

          return (
            <button
              key={degree}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(degree)}
              style={shapeChipStyle(isSelected, color)}
              title={`Patrón ${ROMAN_DEGREE[degree]}: empieza en grado ${degree}, trastes ${range.minFret}-${range.maxFret}`}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isSelected ? 'white' : color,
                  flexShrink: 0,
                }}
              />
              {ROMAN_DEGREE[degree]}
              <span style={shapeRangeLabelStyle}>
                ({range.minFret}-{range.maxFret})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
