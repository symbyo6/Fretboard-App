// src/components/Fretboard/Fretboard.tsx

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type {
  PitchClass,
  FretboardPosition,
  FretRange,
  NoteCategory,
  NotationPreference,
  LabelMode,
  StringNumber,
  FretboardLayout,
  FretboardLayoutConfig,
  PixelPoint,
} from '../../types';

import {
  STRING_COUNT,
  DEFAULT_FRET_COUNT,
  STANDARD_TUNING,
  getPitchAtPosition,
  hasSingleMarker,
  hasDoubleMarker,
  getStringLabel,
  getPositionLabel,
} from '../../lib/theory/fretboardPositions';

import { getNoteName } from '../../lib/theory/scales';
import { classifyPitch } from '../../lib/theory/chords';
import { downloadFretboardPdf, type FretboardPdfDetails } from '../../lib/tabPdf';

import {
  computeFretboardLayout,
  getPixelPosition as computePixelPosition,
  getFretLineX,
  getNoteX,
  getStringY,
  getFretRangePixelBounds,
} from './fretboardLayout';

// ============================================================
// PROPS
// ============================================================

interface FretboardProps {
  rootPitch: PitchClass;
  rootIsRed?: boolean;
  fundamentalRootPitch?: PitchClass;
  chordRootPitch?: PitchClass;
  scaleToneSet: Set<PitchClass>;
  chordToneSet: Set<PitchClass>;
  notation?: NotationPreference;
  labelMode?: LabelMode;
  getNoteLabel?: (position: FretboardPosition, pitch: PitchClass) => string;
  highlightWindow?: FretRange | null;
  highlightColor?: string;
  highlightedPositions?: Set<string>;
  fretCount?: number;
  layoutConfig?: Partial<FretboardLayoutConfig>;
  onNotePlay?: (position: FretboardPosition, pitch: PitchClass) => void;
  pdfDetails?: FretboardPdfDetails;
  children?: (ctx: {
    getPixelPosition: (position: FretboardPosition) => PixelPoint;
    layout: FretboardLayout;
  }) => React.ReactNode;
}

// ============================================================
// COLORES POR CATEGORÍA
// ============================================================

const CATEGORY_STYLES: Record<
  NoteCategory,
  { fill: string; stroke: string; opacity: number; textColor: string }
> = {
  root: { fill: '#f43f5e', stroke: '#be123c', opacity: 1, textColor: '#ffffff' },
  chordTone: { fill: '#6366f1', stroke: '#4338ca', opacity: 1, textColor: '#ffffff' },
  scaleTone: { fill: '#cbd5e1', stroke: '#94a3b8', opacity: 0.55, textColor: '#334155' },
  outside: { fill: 'transparent', stroke: 'transparent', opacity: 0, textColor: 'transparent' },
};

const SECONDARY_ROOT_STYLE = {
  fill: '#16a34a',
  stroke: '#166534',
  opacity: 1,
  textColor: '#ffffff',
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function Fretboard({
  rootPitch,
  rootIsRed = true,
  fundamentalRootPitch = rootPitch,
  chordRootPitch,
  scaleToneSet,
  chordToneSet,
  notation = 'sharps',
  labelMode = 'noteName',
  getNoteLabel,
  highlightWindow = null,
  highlightColor = '#f59e0b',
  highlightedPositions,
  fretCount = DEFAULT_FRET_COUNT,
  layoutConfig,
  onNotePlay,
  pdfDetails,
  children,
}: FretboardProps): JSX.Element {
  const layout = useMemo(
    () => computeFretboardLayout({ fretCount, ...layoutConfig }),
    [fretCount, layoutConfig]
  );

  const getPixelPosition = useCallback(
    (position: FretboardPosition): PixelPoint => computePixelPosition(position, layout),
    [layout]
  );

  const [zoom, setZoom] = useState(0.6);
  const [autoFit, setAutoFit] = useState(true);
  const clampZoom = (value: number) => Math.min(1.6, Math.max(0.35, value));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!autoFit) return;
    const element = wrapperRef.current;
    if (!element) return;

    const updateZoom = () => {
      const availableWidth = element.clientWidth;
      if (availableWidth <= 0) return;
      const fitZoom = availableWidth / layout.totalWidth;
      setZoom(Math.min(1.6, fitZoom));
    };

    updateZoom();

    const observer = new ResizeObserver(updateZoom);
    observer.observe(element);

    return () => observer.disconnect();
  }, [layout.totalWidth, autoFit]);

  useEffect(() => {
    if (!highlightWindow || !scrollContainerRef.current) return;

    const { left } = getFretRangePixelBounds(
      highlightWindow.minFret,
      highlightWindow.maxFret,
      layout
    );

    scrollContainerRef.current.scrollTo({
      left: Math.max(left - 80, 0),
      behavior: 'smooth',
    });
  }, [highlightWindow, layout]);

  const resolveLabel = useCallback(
    (position: FretboardPosition, pitch: PitchClass): string => {
      if (labelMode === 'none') return '';
      if (getNoteLabel) return getNoteLabel(position, pitch);
      return getNoteName(pitch, notation);
    },
    [labelMode, getNoteLabel, notation]
  );

  const renderablePositions = useMemo(() => {
    const positions: Array<{
      position: FretboardPosition;
      pitch: PitchClass;
      category: NoteCategory;
    }> = [];

    for (let stringNumber = 1; stringNumber <= STRING_COUNT; stringNumber++) {
      for (let fret = 0; fret <= layout.fretCount; fret++) {
        const string = stringNumber as StringNumber;
        const pitch = getPitchAtPosition(string, fret, STANDARD_TUNING);
        const category: NoteCategory = pitch === rootPitch
          ? 'root'
          : classifyPitch(pitch, scaleToneSet, chordToneSet) === 'chord-tone'
            ? 'chordTone'
            : classifyPitch(pitch, scaleToneSet, chordToneSet) === 'scale-tone'
              ? 'scaleTone'
              : 'outside';

        if (category === 'outside') continue;

        positions.push({
          position: { string, fret, pitch },
          pitch,
          category,
        });
      }
    }

    return positions;
  }, [layout.fretCount, rootPitch, scaleToneSet, chordToneSet]);

  const highlightBounds = useMemo(() => {
    if (!highlightWindow) return null;
    return getFretRangePixelBounds(highlightWindow.minFret, highlightWindow.maxFret, layout);
  }, [highlightWindow, layout]);

  const exportPdf = (exportHighlightsOnly: boolean) => {
    if (!svgRef.current) return;
    const highlightedFrets = Array.from(highlightedPositions ?? [])
      .map((key) => Number(key.split('-')[1]))
      .filter(Number.isFinite);
    const minFret = highlightedFrets.length > 0 ? Math.min(...highlightedFrets) : 0;
    const maxFret = highlightedFrets.length > 0 ? Math.max(...highlightedFrets) : layout.fretCount;
    const bounds = getFretRangePixelBounds(minFret, maxFret, layout);
    const padding = 20;
    const left = Math.max(0, bounds.left - padding);
    const viewBox = exportHighlightsOnly && highlightedFrets.length > 0
      ? {
        x: left,
        y: 0,
        width: Math.min(layout.totalWidth, bounds.right + padding) - left,
        height: layout.totalHeight,
      }
      : undefined;
    void downloadFretboardPdf(svgRef.current, pdfDetails, viewBox);
    setIsPdfChoiceOpen(false);
  };

  return (
    <div ref={wrapperRef} className="fretboard-wrapper" style={{ position: 'relative' }}>
      <div
        className="fretboard-zoom-controls"
        style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          marginBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setAutoFit(false);
            setZoom((value) => clampZoom(value - 0.15));
          }}
          aria-label="Alejar diapasón"
          style={zoomButtonStyle}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setAutoFit(true)}
          aria-label="Ajustar al ancho de pantalla"
          style={zoomButtonStyle}
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={() => {
            setAutoFit(false);
            setZoom((value) => clampZoom(value + 0.15));
          }}
          aria-label="Acercar diapasón"
          style={zoomButtonStyle}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => exportPdf(true)}
          disabled={!highlightedPositions?.size}
          aria-label="Exportar frets resaltados a PDF"
          title="Exportar solo los frets resaltados a PDF"
          style={pdfButtonStyle}
        >
          PDF frets resaltados
        </button>
        <button
          type="button"
          onClick={() => exportPdf(false)}
          aria-label="Exportar diapasón completo a PDF"
          title="Exportar el diapasón completo a PDF"
          style={pdfButtonStyle}
        >
          PDF diapasón completo
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="fretboard-scroll-container"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          touchAction: 'pan-x pinch-zoom',
          WebkitOverflowScrolling: 'touch',
          borderRadius: '0.75rem',
          background: '#fdf6ec',
        }}
      >
        <svg
          ref={svgRef}
          width={layout.totalWidth * zoom}
          height={layout.totalHeight * zoom}
          viewBox={`0 0 ${layout.totalWidth} ${layout.totalHeight}`}
          role="img"
          aria-label="Diagrama interactivo de mástil de guitarra"
          style={{ display: 'block' }}
        >
          {highlightBounds && (
            <rect
              x={highlightBounds.left}
              y={layout.marginTop - layout.stringGap * 0.6}
              width={highlightBounds.right - highlightBounds.left}
              height={(layout.stringCount - 1) * layout.stringGap + layout.stringGap * 1.2}
              rx={12}
              fill={highlightColor}
              fillOpacity={0.08}
              stroke={highlightColor}
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}

          {Array.from({ length: layout.fretCount }, (_, index) => index + 1).map((fret) => {
            const centerX = getNoteX(fret, layout);
            const middleY = layout.marginTop + ((layout.stringCount - 1) * layout.stringGap) / 2;

            if (hasDoubleMarker(fret)) {
              const upperY = layout.marginTop + (layout.stringCount - 1) * layout.stringGap * 0.28;
              const lowerY = layout.marginTop + (layout.stringCount - 1) * layout.stringGap * 0.72;
              return (
                <g key={`marker-${fret}`} opacity={0.35}>
                  <circle cx={centerX} cy={upperY} r={5} fill="#a16207" />
                  <circle cx={centerX} cy={lowerY} r={5} fill="#a16207" />
                </g>
              );
            }

            if (hasSingleMarker(fret)) {
              return (
                <circle
                  key={`marker-${fret}`}
                  cx={centerX}
                  cy={middleY}
                  r={5}
                  fill="#a16207"
                  opacity={0.35}
                />
              );
            }

            return null;
          })}

          <line
            x1={layout.nutX}
            y1={layout.marginTop - 8}
            x2={layout.nutX}
            y2={layout.marginTop + (layout.stringCount - 1) * layout.stringGap + 8}
            stroke="#1c1917"
            strokeWidth={6}
          />

          {Array.from({ length: layout.fretCount }, (_, index) => index + 1).map((fret) => (
            <line
              key={`fretline-${fret}`}
              x1={getFretLineX(fret, layout)}
              y1={layout.marginTop - 8}
              x2={getFretLineX(fret, layout)}
              y2={layout.marginTop + (layout.stringCount - 1) * layout.stringGap + 8}
              stroke="#d6d3d1"
              strokeWidth={fret % 12 === 0 ? 2 : 1}
            />
          ))}

          {Array.from({ length: layout.stringCount }, (_, index) => index + 1).map((stringNumber) => (
            <line
              key={`stringline-${stringNumber}`}
              x1={layout.marginLeft * 0.3}
              y1={getStringY(stringNumber as StringNumber, layout)}
              x2={getFretLineX(layout.fretCount, layout)}
              y2={getStringY(stringNumber as StringNumber, layout)}
              stroke="#57534e"
              strokeWidth={0.8 + stringNumber * 0.35}
            />
          ))}

          {Array.from({ length: layout.stringCount }, (_, index) => index + 1).map((stringNumber) => (
            <text
              key={`stringlabel-${stringNumber}`}
              x={layout.marginLeft * 0.15}
              y={getStringY(stringNumber as StringNumber, layout) + 4}
              fontSize={12}
              fill="#78716c"
              textAnchor="start"
            >
              {getStringLabel(stringNumber as StringNumber, STANDARD_TUNING, notation)}
            </text>
          ))}

          {[0, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
            .filter((fret) => fret <= layout.fretCount)
            .map((fret) => (
              <text
                key={`fretnum-${fret}`}
                x={getNoteX(fret, layout)}
                y={layout.marginTop + (layout.stringCount - 1) * layout.stringGap + 22}
                fontSize={11}
                fill="#a8a29e"
                textAnchor="middle"
              >
                {fret}
              </text>
            ))}

          {renderablePositions.map(({ position, pitch, category }) => {
            const isSecondaryRoot = chordRootPitch !== undefined
              && chordRootPitch !== rootPitch
              && pitch === chordRootPitch;
            const isModeRootGreen = category === 'root' && !rootIsRed;
            const isFundamentalRoot = pitch === fundamentalRootPitch;
            const { x, y } = getPixelPosition(position);
            const label = resolveLabel(position, pitch);
            const isRootInChord = category === 'root' && chordToneSet.has(pitch);
            const isChordOrRoot = category === 'chordTone'
              || isRootInChord
              || isSecondaryRoot
              || isModeRootGreen;
            const isMutedRoot = category === 'root' && !isRootInChord;
            const radius = isChordOrRoot
              ? layout.noteRadius
              : isMutedRoot
                ? layout.noteRadius * 0.48
                : layout.noteRadius * 0.75;
            const isHighlighted = highlightedPositions?.has(`${position.string}-${position.fret}`) ?? false;
            const isPlayedFundamentalRoot = isHighlighted && isFundamentalRoot;
            const style = isPlayedFundamentalRoot
              ? CATEGORY_STYLES.root
              : isSecondaryRoot || isModeRootGreen
                ? SECONDARY_ROOT_STYLE
                : CATEGORY_STYLES[category];
            const noteFill = isMutedRoot ? '#cbd5e1' : style.fill;
            const noteStroke = isMutedRoot ? '#94a3b8' : style.stroke;
            const noteFillOpacity = isMutedRoot ? 0.16 : style.opacity;
            const noteStrokeOpacity = isMutedRoot ? 0.2 : 1;

            return (
              <g
                key={`${position.string}-${position.fret}`}
                transform={`translate(${x}, ${y})`}
                onClick={() => onNotePlay?.(position, pitch)}
                onTouchStart={() => onNotePlay?.(position, pitch)}
                role="button"
                tabIndex={0}
                aria-label={getPositionLabel(position, notation)}
                style={{ cursor: onNotePlay ? 'pointer' : 'default' }}
              >
                <circle r={22} fill="transparent" />
                <circle
                  r={radius}
                  fill={noteFill}
                  fillOpacity={noteFillOpacity}
                  stroke={noteStroke}
                  strokeWidth={category === 'root' ? 2.5 : 1.5}
                  strokeOpacity={noteStrokeOpacity}
                />

                {isHighlighted && (
                  <circle
                    r={radius + 7}
                    fill="#facc15"
                    fillOpacity={0.22}
                    stroke="#eab308"
                    strokeWidth={3}
                  />
                )}

                {!isPlayedFundamentalRoot && ((rootIsRed && category === 'root' && isMutedRoot)
                  || (!rootIsRed && isFundamentalRoot)) && (
                  <circle
                    r={radius + (isMutedRoot ? 6 : 5)}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={isMutedRoot ? 2 : 2.5}
                    strokeDasharray={isMutedRoot ? '3 3' : '2 2'}
                    opacity={isMutedRoot ? 0.8 : 0.9}
                  />
                )}

                {label && isChordOrRoot && (
                  <text
                    y={4}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill={style.textColor}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {children?.({ getPixelPosition, layout })}
        </svg>
      </div>
      <div
        aria-label="Leyenda de colores de las notas"
        style={legendStyle}
      >
        <span style={legendItemStyle}>
          <span style={legendRootMarkerStyle}>
            <span style={{ ...legendSwatchStyle, background: '#f43f5e', borderColor: '#be123c' }} />
            <span aria-hidden="true" style={legendRootRingStyle} />
          </span>
          Tónica de la escala
        </span>
        <span style={legendItemStyle}>
          <span style={{ ...legendSwatchStyle, background: '#16a34a', borderColor: '#166534' }} />
          Tónica del acorde
        </span>
        <span style={legendItemStyle}>
          <span style={{ ...legendSwatchStyle, background: '#6366f1', borderColor: '#4338ca' }} />
          Nota del acorde
        </span>
        <span style={legendItemStyle}>
          <span style={{ ...legendSwatchStyle, background: '#cbd5e1', borderColor: '#94a3b8' }} />
          Nota de la escala
        </span>
      </div>
    </div>
  );
}

const zoomButtonStyle: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  borderRadius: '0.5rem',
  border: '1px solid #d6d3d1',
  background: 'white',
  fontSize: '1.1rem',
  cursor: 'pointer',
};

const pdfButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '0 0.7rem',
  borderRadius: '0.5rem',
  border: '1px solid #0f766e',
  background: '#f0fdfa',
  color: '#0f766e',
  fontSize: '0.8rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const legendStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.65rem 1rem',
  alignItems: 'center',
  marginTop: '0.65rem',
  padding: '0 0.25rem',
  color: '#57534e',
  fontSize: '0.78rem',
};

const legendItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const legendSwatchStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  flexShrink: 0,
  border: '1px solid',
  borderRadius: '50%',
};

const legendRootMarkerStyle: React.CSSProperties = {
  width: 30,
  height: 18,
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 5,
};

const legendRootRingStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  flexShrink: 0,
  border: '2px dotted #ef4444',
  borderRadius: '50%',
};
