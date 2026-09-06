// src/components/Controls/ScaleSelector.tsx

import React, { useMemo, useState } from 'react';
import type { ScaleDefinition } from '../../types';
import { getScaleById, SCALE_LIBRARY } from '../../lib/theory/scales';

interface ScaleSelectorProps {
  value: string;
  onChange: (scaleId: string) => void;
}

/** IDs de las escalas más usadas para acceso rápido. */
const QUICK_ACCESS_IDS = [
  'ionian',
  'aeolian',
  'dorian',
  'mixolydian',
  'major-pentatonic',
  'minor-pentatonic',
];

const CATEGORY_LABELS: Record<ScaleDefinition['category'], string> = {
  'major-modes': 'Modos mayores',
  'minor-modes': 'Modos menores',
  pentatonic: 'Pentatónicas',
  'harmonic-major': 'Mayor armónica',
  'harmonic-minor': 'Menor armónica',
  'melodic-minor': 'Menor melódica',
  exotic: 'Exóticas',
  blues: 'Blues',
};

/** Selector de escala con chips frecuentes y lista completa agrupada. */
export function ScaleSelector({ value, onChange }: ScaleSelectorProps): JSX.Element {
  const [showAll, setShowAll] = useState(false);

  const scaleEntries = useMemo(() => SCALE_LIBRARY, []);
  const groupedByCategory = useMemo(() => {
    const groups = new Map<ScaleDefinition['category'], ScaleDefinition[]>();
    for (const scale of scaleEntries) {
      const list = groups.get(scale.category) ?? [];
      list.push(scale);
      groups.set(scale.category, list);
    }
    return groups;
  }, [scaleEntries]);

  const currentScale = getScaleById(value);
  const isCurrentInQuickAccess = QUICK_ACCESS_IDS.includes(value);

  return (
    <div aria-label="Selector de escala">
      <div style={legendStyle}>Escala</div>

      <div style={quickAccessStyle}>
        {QUICK_ACCESS_IDS.map((id) => {
          const scale = getScaleById(id);
          if (!scale) return null;
          const isSelected = id === value;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={isSelected}
              style={{
                minHeight: 44,
                padding: '0 0.9rem',
                borderRadius: '999px',
                border: isSelected ? '2px solid #4338ca' : '1px solid #d6d3d1',
                background: isSelected ? '#6366f1' : 'white',
                color: isSelected ? 'white' : '#292524',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {scale.name}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAll((isVisible) => !isVisible)}
          aria-expanded={showAll}
          style={{
            minHeight: 44,
            padding: '0 0.9rem',
            borderRadius: '999px',
            border: '1px dashed #a8a29e',
            background: !isCurrentInQuickAccess ? '#f5f3ff' : 'white',
            color: '#6366f1',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {showAll ? 'Ocultar' : 'Más escalas'}
          {!isCurrentInQuickAccess && currentScale ? ` (${currentScale.name})` : ''}
        </button>
      </div>

      {showAll && (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={selectStyle}
          aria-label="Lista completa de escalas por categoría"
        >
          {Array.from(groupedByCategory.entries()).map(([category, scales]) => (
            <optgroup key={category} label={CATEGORY_LABELS[category]}>
              {scales.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
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

const quickAccessStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
  marginBottom: '0.5rem',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  borderRadius: '0.5rem',
  border: '1px solid #d6d3d1',
  padding: '0 0.6rem',
  fontSize: '0.9rem',
  background: 'white',
};
