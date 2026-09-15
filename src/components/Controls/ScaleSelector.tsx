// src/components/Controls/ScaleSelector.tsx

import React, { useMemo } from 'react';
import type { ScaleDefinition } from '../../types';
import { SCALE_LIBRARY } from '../../lib/theory/scales';
import { localizeTheoryName, useLanguage } from '../../i18n';

interface ScaleSelectorProps {
  value: string;
  onChange: (scaleId: string) => void;
  muted?: boolean;
}

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

/** Selector único de escala, agrupado por categorías en el menú nativo. */
export function ScaleSelector({ value, onChange, muted = false }: ScaleSelectorProps): JSX.Element {
  const { language, t } = useLanguage();
  const categoryLabels = language === 'en'
    ? { 'major-modes': 'Major modes', 'minor-modes': 'Minor modes', pentatonic: 'Pentatonics', 'harmonic-major': 'Harmonic major', 'harmonic-minor': 'Harmonic minor', 'melodic-minor': 'Melodic minor', exotic: 'Exotic', blues: 'Blues' }
    : CATEGORY_LABELS;
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

  return (
    <div aria-label={t('scale')} style={muted ? mutedScaleControlStyle : undefined}>
      <div style={legendStyle}>{t('scale')}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={selectStyle}
        aria-label={t('scale')}
      >
        {Array.from(groupedByCategory.entries()).map(([category, scales]) => (
          <optgroup key={category} label={categoryLabels[category]}>
            {scales.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {localizeTheoryName(scale.name, language)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

const legendStyle: React.CSSProperties = {
  fontSize: '1.6rem',
  fontWeight: 600,
  color: '#57534e',
  marginBottom: '0.4rem',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 88,
  borderRadius: '0.5rem',
  border: '1px solid #d6d3d1',
  padding: '0 1.2rem',
  fontSize: '1.8rem',
  background: 'white',
};

const mutedScaleControlStyle: React.CSSProperties = {
  opacity: 0.55,
  filter: 'grayscale(1)',
};
