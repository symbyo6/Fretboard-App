// src/components/ShapeComparisonPanel.tsx

import React, { useMemo, useState } from 'react';
import type { CagedShapeId, NpsDegree, NotationPreference, PitchClass } from '../types';
import type { ShapeSelection } from '../lib/shapes/shapeComparison';
import {
  computeOverlapStats,
  getShapePositions,
  shapeSelectionLabel,
} from '../lib/shapes/shapeComparison';
import { getScalePitchClasses } from '../lib/theory/scaleEngine';
import { getPositionsForPitchSet } from '../lib/theory/fretboardPositions';
import { CAGED_SHAPE_COLOR, NPS_DEGREE_COLOR } from './Controls/shapeColors';
import { ShapeComparisonControls } from './Controls/ShapeComparisonControls';
import { ShapeComparisonOverlay } from './Fretboard/ShapeComparisonOverlay';
import { OverlapLegend } from './Fretboard/OverlapLegend';
import { LandscapeNudge } from './Layout/LandscapeNudge';

interface ShapeComparisonPanelProps {
  rootPitch: PitchClass;
  scaleId: string;
  notation: NotationPreference;
}

function colorForSelection(selection: ShapeSelection): string {
  return selection.system === 'caged'
    ? CAGED_SHAPE_COLOR[selection.shapeId]
    : NPS_DEGREE_COLOR[selection.degree];
}

/** Panel de selección, comparación visual y estadísticas de formas. */
export function ShapeComparisonPanel({
  rootPitch,
  scaleId,
  notation,
}: ShapeComparisonPanelProps): JSX.Element {
  const [shapeA, setShapeA] = useState<ShapeSelection>({
    system: 'caged',
    shapeId: 'C' as CagedShapeId,
  });
  const [shapeB, setShapeB] = useState<ShapeSelection>({
    system: '3nps',
    degree: 1 as NpsDegree,
  });

  const allScalePositions = useMemo(() => {
    const pitchClasses = getScalePitchClasses(rootPitch, scaleId);
    return getPositionsForPitchSet(pitchClasses, 0, 15);
  }, [rootPitch, scaleId]);

  const positionsA = useMemo(
    () => getShapePositions(rootPitch, scaleId, shapeA, allScalePositions),
    [rootPitch, scaleId, shapeA, allScalePositions]
  );
  const positionsB = useMemo(
    () => getShapePositions(rootPitch, scaleId, shapeB, allScalePositions),
    [rootPitch, scaleId, shapeB, allScalePositions]
  );
  const stats = useMemo(
    () => computeOverlapStats(positionsA, positionsB),
    [positionsA, positionsB]
  );

  const colorA = colorForSelection(shapeA);
  const colorB = colorForSelection(shapeB);

  return (
    <div style={panelStyle}>
      <LandscapeNudge />

      <h3 style={headingStyle}>Comparación de formas</h3>
      <p style={descriptionStyle}>
        Compara dos sistemas de digitación para la misma escala. Los anillos exteriores
        marcan la Forma A, los interiores la Forma B y el relleno dorado muestra las coincidencias.
      </p>

      <ShapeComparisonControls
        rootPitch={rootPitch}
        scaleId={scaleId}
        shapeA={shapeA}
        shapeB={shapeB}
        onShapeAChange={setShapeA}
        onShapeBChange={setShapeB}
      />

      <div style={selectionLabelsStyle}>
        <span style={{ color: colorA, fontWeight: 700 }}>{shapeSelectionLabel(shapeA)}</span>
        <span style={{ color: colorB, fontWeight: 700 }}>{shapeSelectionLabel(shapeB)}</span>
      </div>

      <ShapeComparisonOverlay
        allScalePositions={allScalePositions}
        positionsA={positionsA}
        positionsB={positionsB}
        colorA={colorA}
        colorB={colorB}
        rootPitch={rootPitch}
        notation={notation}
        minFret={0}
        maxFret={15}
      />

      <OverlapLegend
        stats={stats}
        labelA={shapeSelectionLabel(shapeA)}
        labelB={shapeSelectionLabel(shapeB)}
        colorA={colorA}
        colorB={colorB}
      />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem',
};

const headingStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#292524',
  margin: 0,
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#78716c',
  margin: 0,
};

const selectionLabelsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.7rem',
  flexWrap: 'wrap',
  fontSize: '0.78rem',
};
