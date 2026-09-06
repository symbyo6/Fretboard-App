// src/components/Controls/CagedShapeSelector.tsx

import React from 'react';
import type { CagedShapeId, PitchClass } from '../../types';
import { CAGED_SHAPE_ORDER, getCagedShapeFretRange } from '../../lib/shapes/caged';
import { CAGED_SHAPE_COLOR } from './shapeColors';
import {
  shapeChipStyle,
  shapeRangeLabelStyle,
  shapeLegendStyle,
} from './shapeChipStyles';

interface CagedShapeSelectorProps {
  rootPitch: PitchClass;
  scaleId: string;
  /** null = sin filtro de forma */
  value: CagedShapeId | null;
  onChange: (shapeId: CagedShapeId | null) => void;
}

/** Selector de las cinco formas CAGED con sus ventanas de trastes. */
export function CagedShapeSelector({
  rootPitch,
  scaleId,
  value,
  onChange,
}: CagedShapeSelectorProps): JSX.Element {
  return (
    <div aria-label="Selector de forma CAGED">
      <div style={shapeLegendStyle}>Forma CAGED</div>

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
          Todas
        </button>

        {CAGED_SHAPE_ORDER.map((shapeId) => {
          const range = getCagedShapeFretRange(rootPitch, scaleId, shapeId);
          const isSelected = value === shapeId;
          const color = CAGED_SHAPE_COLOR[shapeId];

          return (
            <button
              key={shapeId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(shapeId)}
              style={shapeChipStyle(isSelected, color)}
              title={`Forma ${shapeId}: trastes ${range.minFret}-${range.maxFret}`}
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
              {shapeId}
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
