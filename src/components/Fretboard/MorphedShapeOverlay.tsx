// src/components/Fretboard/MorphedShapeOverlay.tsx

import React from 'react';
import type { FretPosition, NotationPreference, PitchClass } from '../../types';
import { positionKey } from '../../lib/shapes/shapeComparison';
import {
  classifyMembership,
  interpolateWeights,
  type MorphPhase,
} from '../../lib/shapes/morphPhases';
import { formatNoteName } from '../../lib/theory/notation';
import { fretToNoteName } from '../../lib/audio/tuning';
import { useAudioEngine } from '../../hooks/useAudioEngine';

interface MorphedShapeOverlayProps {
  allScalePositions: FretPosition[];
  positionsA: FretPosition[];
  positionsB: FretPosition[];
  colorA: string;
  colorB: string;
  rootPitch: PitchClass;
  notation: NotationPreference;
  fromPhase: MorphPhase;
  toPhase: MorphPhase;
  transitionProgress: number;
  minFret?: number;
  maxFret?: number;
}

const STRING_COUNT = 6;
const FRET_SPACING = 46;
const STRING_SPACING = 32;
const LEFT_PADDING = 34;
const TOP_PADDING = 22;
const DOT_RADIUS = 9;
const OUTER_RING_RADIUS = 12;
const INNER_RING_RADIUS = 6.5;
const HIT_AREA_RADIUS = 22;
const FRET_MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);
const DOUBLE_MARKER_FRETS = new Set([12, 24]);
const OVERLAP_FILL_COLOR = '#fde68a';

/** Overlay animado de comparación de formas. */
export function MorphedShapeOverlay({
  allScalePositions,
  positionsA,
  positionsB,
  colorA,
  colorB,
  rootPitch,
  notation,
  fromPhase,
  toPhase,
  transitionProgress,
  minFret = 0,
  maxFret = 15,
}: MorphedShapeOverlayProps): JSX.Element {
  const { playNote } = useAudioEngine();
  const [pulseTick, setPulseTick] = React.useState(0);

  const keysA = React.useMemo(
    () => new Set(positionsA.map((position) => positionKey(position.stringIndex, position.fret))),
    [positionsA]
  );
  const keysB = React.useMemo(
    () => new Set(positionsB.map((position) => positionKey(position.stringIndex, position.fret))),
    [positionsB]
  );
  const weights = React.useMemo(
    () => interpolateWeights(fromPhase, toPhase, transitionProgress),
    [fromPhase, toPhase, transitionProgress]
  );
  const isSharedFocus = fromPhase === 'shared' || toPhase === 'shared';

  React.useEffect(() => {
    if (!isSharedFocus) return undefined;

    let animationFrame = 0;
    const animate = (time: number) => {
      setPulseTick(time);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isSharedFocus]);

  const pulseScale = isSharedFocus ? 1 + 0.12 * Math.sin(pulseTick / 260) : 1;
  const fretCount = maxFret - minFret + 1;
  const svgWidth = LEFT_PADDING * 2 + fretCount * FRET_SPACING;
  const svgHeight = TOP_PADDING * 2 + (STRING_COUNT - 1) * STRING_SPACING;
  const fretX = (fret: number) => LEFT_PADDING + (fret - minFret) * FRET_SPACING + FRET_SPACING / 2;
  const stringY = (stringIndex: number) => TOP_PADDING + stringIndex * STRING_SPACING;

  const handleTap = async (position: FretPosition) => {
    await playNote(fretToNoteName(position.stringIndex, position.fret), 0.7);
  };

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Comparación animada de formas de escala"
        style={{ minWidth: svgWidth, touchAction: 'manipulation' }}
      >
        {Array.from({ length: fretCount + 1 }, (_, index) => {
          const x = LEFT_PADDING + index * FRET_SPACING;
          const isNut = minFret === 0 && index === 0;
          return (
            <line
              key={`fret-${index}`}
              x1={x}
              y1={TOP_PADDING}
              x2={x}
              y2={TOP_PADDING + (STRING_COUNT - 1) * STRING_SPACING}
              stroke="#a8a29e"
              strokeWidth={isNut ? 4 : 1.5}
            />
          );
        })}

        {Array.from({ length: STRING_COUNT }, (_, index) => (
          <line
            key={`string-${index}`}
            x1={LEFT_PADDING}
            y1={stringY(index)}
            x2={svgWidth - LEFT_PADDING + FRET_SPACING}
            y2={stringY(index)}
            stroke="#d6d3d1"
            strokeWidth={1}
          />
        ))}

        {Array.from({ length: fretCount }, (_, index) => minFret + index).map((fret) => {
          if (!FRET_MARKER_FRETS.has(fret)) return null;
          const x = fretX(fret);
          const midY = TOP_PADDING + ((STRING_COUNT - 1) * STRING_SPACING) / 2;
          if (DOUBLE_MARKER_FRETS.has(fret)) {
            return (
              <g key={`marker-${fret}`}>
                <circle cx={x} cy={midY - STRING_SPACING} r={4} fill="#e7e5e4" />
                <circle cx={x} cy={midY + STRING_SPACING} r={4} fill="#e7e5e4" />
              </g>
            );
          }
          return <circle key={`marker-${fret}`} cx={x} cy={midY} r={4} fill="#e7e5e4" />;
        })}

        {allScalePositions.map((position) => {
          if (position.fret < minFret || position.fret > maxFret) return null;

          const key = positionKey(position.stringIndex, position.fret);
          const inA = keysA.has(key);
          const inB = keysB.has(key);
          const membership = classifyMembership(inA, inB);
          const opacity = weights[membership];
          const cx = fretX(position.fret);
          const cy = stringY(position.stringIndex);
          const isRoot = position.pitchClass === rootPitch;
          const isPulsingShared = membership === 'shared' && isSharedFocus;
          const scale = isPulsingShared ? pulseScale : 1;

          if (membership === 'neither') {
            return (
              <circle
                key={key}
                cx={cx}
                cy={cy}
                r={5}
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth={1}
                opacity={opacity}
              />
            );
          }

          const label = formatNoteName(position.pitchClass, notation);
          return (
            <g
              key={key}
              onClick={() => void handleTap(position)}
              style={{ cursor: 'pointer', transition: 'opacity 60ms linear' }}
              opacity={opacity}
              role="button"
              tabIndex={0}
              aria-label={`Nota ${label}, traste ${position.fret}, cuerda ${position.stringIndex + 1}`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void handleTap(position);
                }
              }}
            >
              <circle cx={cx} cy={cy} r={HIT_AREA_RADIUS} fill="transparent" />
              {isPulsingShared && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={OUTER_RING_RADIUS * 1.6 * scale}
                  fill="none"
                  stroke={OVERLAP_FILL_COLOR}
                  strokeWidth={3}
                  opacity={0.4}
                />
              )}
              <circle cx={cx} cy={cy} r={DOT_RADIUS * scale} fill={membership === 'shared' ? OVERLAP_FILL_COLOR : 'white'} />
              {inA && <circle cx={cx} cy={cy} r={OUTER_RING_RADIUS * scale} fill="none" stroke={colorA} strokeWidth={2.5} />}
              {inB && <circle cx={cx} cy={cy} r={INNER_RING_RADIUS * scale} fill="none" stroke={colorB} strokeWidth={2.2} />}
              {isRoot && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={DOT_RADIUS + 3.5}
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth={1.4}
                  strokeDasharray="2,1.5"
                />
              )}
              <text
                x={cx}
                y={cy + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8.5}
                fontWeight={700}
                fill="#1c1917"
                pointerEvents="none"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
