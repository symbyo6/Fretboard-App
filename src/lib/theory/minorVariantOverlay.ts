import type { KeyName } from '../../types';
import { getNoteName, resolveScale } from './scales';

export type MinorVariantId = 'natural' | 'harmonic' | 'melodic';

export interface VariantRingStyle {
  variant: MinorVariantId;
  stroke: string;
  dash: string;
  label: string;
}

export const VARIANT_STYLES: Record<MinorVariantId, VariantRingStyle> = {
  natural: { variant: 'natural', stroke: '#60a5fa', dash: '0', label: 'Nat' },
  harmonic: { variant: 'harmonic', stroke: '#f87171', dash: '4 2', label: 'Harm' },
  melodic: { variant: 'melodic', stroke: '#34d399', dash: '2 2', label: 'Mel' },
};

const SCALE_ID_BY_VARIANT: Record<MinorVariantId, string> = {
  natural: 'aeolian',
  harmonic: 'harmonic-minor',
  melodic: 'melodic-minor',
};

export interface DegreeOverlayInfo {
  degree: number;
  notesByVariant: Record<MinorVariantId, string>;
  isDivergent: boolean;
}

/** Compara cada grado de las tres variantes menores para dibujar un overlay en el diapasón. */
export function buildDegreeOverlay(key: KeyName): DegreeOverlayInfo[] {
  const scales = Object.fromEntries(
    (Object.keys(SCALE_ID_BY_VARIANT) as MinorVariantId[]).map((variant) => [
      variant,
      resolveScale(SCALE_ID_BY_VARIANT[variant], key),
    ])
  ) as Record<MinorVariantId, ReturnType<typeof resolveScale>>;

  return Array.from({ length: 7 }, (_, degreeIndex) => {
    const notesByVariant = {} as Record<MinorVariantId, string>;

    (Object.keys(SCALE_ID_BY_VARIANT) as MinorVariantId[]).forEach((variant) => {
      notesByVariant[variant] = getNoteName(scales[variant].notes[degreeIndex]);
    });

    return {
      degree: degreeIndex + 1,
      notesByVariant,
      isDivergent: new Set(Object.values(notesByVariant)).size > 1,
    };
  });
}