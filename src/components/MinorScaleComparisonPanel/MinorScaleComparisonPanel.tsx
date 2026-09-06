import React, { useMemo, useState } from 'react';
import type { KeyName } from '../../types';
import {
  compareMinorVariants,
  MINOR_VARIANT_LABELS,
  type MinorVariant,
} from '../../lib/theory/minorVariants';
import {
  VARIANT_STYLES,
  type MinorVariantId,
} from '../../lib/theory/minorVariantOverlay';

interface MinorScaleComparisonPanelProps {
  rootNote: KeyName;
  activeVariant: MinorVariantId;
}

const COMPARISON_VARIANT_BY_OVERLAY_VARIANT: Record<MinorVariantId, MinorVariant> = {
  natural: 'naturalMinor',
  harmonic: 'harmonicMinor',
  melodic: 'melodicMinor',
};

const OVERLAY_VARIANTS: MinorVariantId[] = ['natural', 'harmonic', 'melodic'];

/** Muestra las diferencias de notas y acordes entre las variantes de una escala menor. */
export function MinorScaleComparisonPanel({
  rootNote,
  activeVariant,
}: MinorScaleComparisonPanelProps): JSX.Element {
  const [activeVariants, setActiveVariants] = useState<MinorVariantId[]>(OVERLAY_VARIANTS);
  const rows = useMemo(() => compareMinorVariants(rootNote), [rootNote]);

  function toggleVariant(variant: MinorVariantId): void {
    setActiveVariants((current) => current.includes(variant)
      ? current.filter((currentVariant) => currentVariant !== variant)
      : [...current, variant]
    );
  }

  return (
    <section style={panelStyle} role="region" aria-label="Comparación de escalas menores">
      <h3 style={headingStyle}>Comparación: {rootNote} natural, armónica y melódica</h3>

      <div style={toggleListStyle}>
        {OVERLAY_VARIANTS.map((variant) => {
          const style = VARIANT_STYLES[variant];
          const isActive = activeVariants.includes(variant);

          return (
            <button
              key={variant}
              type="button"
              onClick={() => toggleVariant(variant)}
              aria-pressed={isActive}
              style={{
                ...toggleStyle,
                borderColor: style.stroke,
                opacity: isActive ? 1 : 0.3,
              }}
            >
              <span aria-hidden="true" style={{ color: style.stroke }}>●</span> {style.label}
            </button>
          );
        })}
      </div>

      <ComparisonTable
        caption="Notas de escala"
        rows={rows}
        activeVariants={activeVariants}
        activeVariant={activeVariant}
        valueForVariant={(row, variant) => row.notesByVariant[COMPARISON_VARIANT_BY_OVERLAY_VARIANT[variant]]}
        differs={(row) => row.noteDiffers}
      />

      <ComparisonTable
        caption="Acordes diatónicos de séptima"
        rows={rows}
        activeVariants={activeVariants}
        activeVariant={activeVariant}
        valueForVariant={(row, variant) => row.symbolByVariant[COMPARISON_VARIANT_BY_OVERLAY_VARIANT[variant]]}
        differs={(row) => row.qualityDiffers}
        degreeLabel={(row) => row.romanBase}
      />

      <p style={noteStyle}>
        <strong>Nota educativa:</strong> Solo la sexta y séptima notas cambian entre variantes.
        La séptima elevada crea el V7 dominante; la sexta elevada de la menor melódica suaviza
        las líneas ascendentes.
      </p>
      <p style={{ ...noteStyle, color: '#78716c' }}>
        <strong>Nota teórica:</strong> Esta vista trata la menor melódica como una escala fija,
        según el uso jazzístico.
      </p>
    </section>
  );
}

interface ComparisonTableProps {
  caption: string;
  rows: ReturnType<typeof compareMinorVariants>;
  activeVariants: MinorVariantId[];
  activeVariant: MinorVariantId;
  valueForVariant: (row: ReturnType<typeof compareMinorVariants>[number], variant: MinorVariantId) => string;
  differs: (row: ReturnType<typeof compareMinorVariants>[number]) => boolean;
  degreeLabel?: (row: ReturnType<typeof compareMinorVariants>[number]) => string;
}

function ComparisonTable({
  caption,
  rows,
  activeVariants,
  activeVariant,
  valueForVariant,
  differs,
  degreeLabel = (row) => `${row.degree}a`,
}: ComparisonTableProps): JSX.Element {
  return (
    <div style={tableScrollStyle}>
      <table style={tableStyle}>
        <caption style={captionStyle}>{caption}</caption>
        <thead>
          <tr>
            <th style={headerCellStyle}>Grado</th>
            {activeVariants.map((variant) => (
              <th
                key={variant}
                style={{
                  ...headerCellStyle,
                  ...(variant === activeVariant ? activeColumnStyle : undefined),
                }}
              >
                {MINOR_VARIANT_LABELS[COMPARISON_VARIANT_BY_OVERLAY_VARIANT[variant]]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.degree}>
              <td style={cellStyle}>{degreeLabel(row)}</td>
              {activeVariants.map((variant) => (
                <td
                  key={variant}
                  title={differs(row) ? 'Este valor varía entre escalas' : undefined}
                  style={{
                    ...cellStyle,
                    ...(variant === activeVariant ? activeColumnStyle : undefined),
                    ...(differs(row) ? differenceCellStyle : undefined),
                  }}
                >
                  {valueForVariant(row, variant)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem',
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  color: '#292524',
  fontSize: '0.95rem',
};

const toggleListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
};

const toggleStyle: React.CSSProperties = {
  minHeight: '44px',
  padding: '0.45rem 0.75rem',
  border: '2px solid',
  borderRadius: '999px',
  background: '#fff',
  color: '#292524',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 700,
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: '38rem',
  borderCollapse: 'collapse',
  fontSize: '0.78rem',
};

const captionStyle: React.CSSProperties = {
  padding: '0 0 0.35rem',
  color: '#292524',
  fontSize: '0.85rem',
  fontWeight: 700,
  textAlign: 'left',
};

const headerCellStyle: React.CSSProperties = {
  padding: '0.45rem',
  borderBottom: '1px solid #d6d3d1',
  color: '#57534e',
  textAlign: 'left',
};

const cellStyle: React.CSSProperties = {
  padding: '0.45rem',
  borderBottom: '1px solid #e7e5e4',
  color: '#292524',
};

const activeColumnStyle: React.CSSProperties = {
  background: '#fef3c7',
};

const differenceCellStyle: React.CSSProperties = {
  color: '#9f1239',
  fontWeight: 700,
};

const noteStyle: React.CSSProperties = {
  margin: 0,
  color: '#57534e',
  fontSize: '0.78rem',
  lineHeight: 1.45,
};
