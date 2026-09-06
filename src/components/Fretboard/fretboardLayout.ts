// src/components/Fretboard/fretboardLayout.ts

import type {
  FretboardPosition,
  FretboardLayout,
  FretboardLayoutConfig,
  PixelPoint,
  StringNumber,
} from '../../types';

// ============================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================

export const DEFAULT_LAYOUT_CONFIG: FretboardLayoutConfig = {
  fretCount: 24,
  stringCount: 6,
  fretWidth: 56,
  stringGap: 34,
  marginLeft: 56,
  marginTop: 24,
  marginBottom: 32,
  openStringGap: 40,
  noteRadius: 11,
};

// ============================================================
// CÁLCULO DE LAYOUT COMPLETO
// ============================================================

/** Calcula las dimensiones derivadas del fretboard. */
export function computeFretboardLayout(
  config: Partial<FretboardLayoutConfig> = {}
): FretboardLayout {
  const merged: FretboardLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };

  const nutX = merged.marginLeft + merged.openStringGap;
  const totalWidth = nutX + merged.fretCount * merged.fretWidth + merged.fretWidth * 0.5;
  const totalHeight = (
    merged.marginTop
    + (merged.stringCount - 1) * merged.stringGap
    + merged.marginBottom
  );

  return {
    ...merged,
    nutX,
    totalWidth,
    totalHeight,
  };
}

// ============================================================
// CONVERSIÓN POSICIÓN MUSICAL -> COORDENADAS SVG
// ============================================================

/** Coordenada X de la línea física de un traste. */
export function getFretLineX(fret: number, layout: FretboardLayout): number {
  return layout.nutX + fret * layout.fretWidth;
}

/** Coordenada X del centro de la celda donde se dibuja una nota. */
export function getNoteX(fret: number, layout: FretboardLayout): number {
  if (fret === 0) {
    return layout.marginLeft + layout.openStringGap * 0.35;
  }
  return layout.nutX + (fret - 0.5) * layout.fretWidth;
}

/** Coordenada Y de una cuerda, con la cuerda 1 arriba. */
export function getStringY(stringNumber: StringNumber, layout: FretboardLayout): number {
  return layout.marginTop + (stringNumber - 1) * layout.stringGap;
}

/** Devuelve el punto exacto donde dibujar una posición del diapasón. */
export function getPixelPosition(
  position: FretboardPosition,
  layout: FretboardLayout
): PixelPoint {
  return {
    x: getNoteX(position.fret, layout),
    y: getStringY(position.string, layout),
  };
}

// ============================================================
// UTILIDADES PARA VENTANAS DE FORMA Y SCROLL
// ============================================================

/** Devuelve los límites X en píxeles de una ventana de trastes. */
export function getFretRangePixelBounds(
  minFret: number,
  maxFret: number,
  layout: FretboardLayout
): { left: number; right: number } {
  const left = minFret === 0
    ? layout.marginLeft
    : getFretLineX(minFret - 1, layout);
  const right = getFretLineX(maxFret, layout);
  return { left, right };
}

/** Ancho útil visible en pantallas pequeñas antes de necesitar scroll. */
export const MOBILE_VIEWPORT_FRET_COUNT = 5;
