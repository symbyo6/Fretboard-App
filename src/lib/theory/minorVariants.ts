import type { ChordQuality, KeyName } from '../../types';
import { buildDiatonicChord } from './chords';
import { getNoteName, resolveScale } from './scales';

export type MinorVariant = 'naturalMinor' | 'harmonicMinor' | 'melodicMinor';

export const MINOR_VARIANTS: MinorVariant[] = [
  'naturalMinor',
  'harmonicMinor',
  'melodicMinor',
];

export const MINOR_VARIANT_LABELS: Record<MinorVariant, string> = {
  naturalMinor: 'Menor Natural (Eólica)',
  harmonicMinor: 'Menor Armónica',
  melodicMinor: 'Menor Melódica',
};

const SCALE_ID_BY_MINOR_VARIANT: Record<MinorVariant, string> = {
  naturalMinor: 'aeolian',
  harmonicMinor: 'harmonic-minor',
  melodicMinor: 'melodic-minor',
};

const ROMAN_NUMERALS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'] as const;

export interface DegreeComparison {
  degree: number;
  romanBase: string;
  notesByVariant: Record<MinorVariant, string>;
  qualityByVariant: Record<MinorVariant, ChordQuality>;
  symbolByVariant: Record<MinorVariant, string>;
  noteDiffers: boolean;
  qualityDiffers: boolean;
}

/** Compara grados y acordes de séptima entre las tres variantes de una tonalidad menor. */
export function compareMinorVariants(root: KeyName): DegreeComparison[] {
  const scales = Object.fromEntries(
    MINOR_VARIANTS.map((variant) => [
      variant,
      resolveScale(SCALE_ID_BY_MINOR_VARIANT[variant], root),
    ])
  ) as Record<MinorVariant, ReturnType<typeof resolveScale>>;

  return Array.from({ length: 7 }, (_, degreeIndex) => {
    const degree = degreeIndex + 1;
    const notesByVariant = {} as Record<MinorVariant, string>;
    const qualityByVariant = {} as Record<MinorVariant, ChordQuality>;
    const symbolByVariant = {} as Record<MinorVariant, string>;

    MINOR_VARIANTS.forEach((variant) => {
      const scale = scales[variant];
      const chord = buildDiatonicChord(scale, degree, true);

      notesByVariant[variant] = getNoteName(scale.notes[degreeIndex]);
      qualityByVariant[variant] = chord.quality;
      symbolByVariant[variant] = chord.symbol;
    });

    return {
      degree,
      romanBase: ROMAN_NUMERALS[degreeIndex],
      notesByVariant,
      qualityByVariant,
      symbolByVariant,
      noteDiffers: notesByVariant.naturalMinor !== notesByVariant.harmonicMinor
        || notesByVariant.naturalMinor !== notesByVariant.melodicMinor,
      qualityDiffers: qualityByVariant.naturalMinor !== qualityByVariant.harmonicMinor
        || qualityByVariant.naturalMinor !== qualityByVariant.melodicMinor,
    };
  });
}

/** Devuelve los grados 1-7 cuya nota cambia respecto de la menor natural. */
export function getDifferingScaleDegrees(root: KeyName): number[] {
  return compareMinorVariants(root)
    .filter((comparison) => comparison.noteDiffers)
    .map((comparison) => comparison.degree);
}