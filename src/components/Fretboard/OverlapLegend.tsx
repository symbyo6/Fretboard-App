// src/components/Fretboard/OverlapLegend.tsx

import React from 'react';
import type { ShapeOverlapStats } from '../../lib/shapes/shapeComparison';

interface OverlapLegendProps {
  stats: ShapeOverlapStats;
  labelA: string;
  labelB: string;
  colorA: string;
  colorB: string;
}

/** Leyenda visual y estadísticas del solapamiento entre dos formas. */
export function OverlapLegend({
  stats,
  labelA,
  labelB,
  colorA,
  colorB,
}: OverlapLegendProps): JSX.Element {
  return (
    <div style={panelStyle}>
      <div style={legendRowStyle}>
        <LegendSwatch ringOuter={colorA} fill="white" label={`Solo ${labelA}`} />
        <LegendSwatch ringInner={colorB} fill="white" label={`Solo ${labelB}`} />
        <LegendSwatch
          ringOuter={colorA}
          ringInner={colorB}
          fill="#fde68a"
          label="Ambas (overlap)"
        />
        <LegendSwatch fill="#f5f5f4" borderOnly label="Fuera de ambas" />
      </div>

      <div style={statsGridStyle}>
        <StatBox label={`Notas en ${labelA}`} value={stats.countA} />
        <StatBox label={`Notas en ${labelB}`} value={stats.countB} />
        <StatBox label="Compartidas" value={stats.intersectionCount} highlight />
        <StatBox label="Solapamiento" value={`${stats.overlapPercentage}%`} highlight />
      </div>

      {stats.overlapPercentage >= 70 && (
        <p style={noticeStyle}>
          Gran coincidencia: estas dos formas comparten casi todas sus notas.
        </p>
      )}
    </div>
  );
}

interface LegendSwatchProps {
  ringOuter?: string;
  ringInner?: string;
  fill: string;
  label: string;
  borderOnly?: boolean;
}

function LegendSwatch({
  ringOuter,
  ringInner,
  fill,
  label,
  borderOnly,
}: LegendSwatchProps): JSX.Element {
  return (
    <div style={swatchStyle}>
      <svg width={26} height={26} aria-hidden="true">
        <circle
          cx={13}
          cy={13}
          r={9}
          fill={fill}
          stroke={borderOnly ? '#d6d3d1' : 'none'}
          strokeWidth={1}
        />
        {ringOuter && (
          <circle cx={13} cy={13} r={11.5} fill="none" stroke={ringOuter} strokeWidth={2} />
        )}
        {ringInner && (
          <circle cx={13} cy={13} r={6} fill="none" stroke={ringInner} strokeWidth={2} />
        )}
      </svg>
      <span style={{ color: '#57534e' }}>{label}</span>
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        padding: '0.4rem 0.5rem',
        borderRadius: '0.4rem',
        background: highlight ? '#eef2ff' : 'white',
        border: '1px solid #e7e5e4',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: highlight ? '#4338ca' : '#292524' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.68rem', color: '#78716c' }}>{label}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  padding: '0.7rem',
  borderRadius: '0.6rem',
  background: '#fafaf9',
  border: '1px solid #e7e5e4',
};

const legendRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.9rem',
  flexWrap: 'wrap',
  fontSize: '0.76rem',
};

const swatchStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
  gap: '0.5rem',
  fontSize: '0.78rem',
};

const noticeStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  color: '#166534',
  margin: 0,
  fontWeight: 600,
};
