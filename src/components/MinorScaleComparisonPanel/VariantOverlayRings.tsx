import type { MinorVariantId } from '../../lib/theory/minorVariantOverlay';
import { VARIANT_STYLES } from '../../lib/theory/minorVariantOverlay';
import { buildOverlayRings } from '../../lib/theory/overlayRings';

interface VariantOverlayRingsProps {
  x: number;
  y: number;
  radius: number;
  activeVariants: MinorVariantId[];
  degreeInfo: {
    notesByVariant: Record<MinorVariantId, string>;
    isDivergent: boolean;
  };
}

export function VariantOverlayRings({
  x,
  y,
  radius,
  activeVariants,
  degreeInfo,
}: VariantOverlayRingsProps): JSX.Element {
  if (!degreeInfo.isDivergent) {
    return <circle cx={x} cy={y} r={radius} fill="#94a3b8" />;
  }

  const rings = buildOverlayRings(degreeInfo.notesByVariant, VARIANT_STYLES, activeVariants);

  return (
    <g>
      <circle cx={x} cy={y} r={radius * 0.6} fill="#94a3b8" opacity={0.5} />
      {rings.map(({ note, variants, stroke, dash }, index) => {
        const ringRadius = radius + 3 * index;

        return (
          <g key={note}>
            <circle
              cx={x}
              cy={y}
              r={ringRadius}
              fill="none"
              stroke={stroke}
              strokeWidth={variants.length > 1 ? 3 : 2}
              strokeDasharray={dash}
            />
            <text
              x={x}
              y={y - ringRadius - 4}
              fontSize={8}
              textAnchor="middle"
              fill={stroke}
            >
              {variants.map((variant) => VARIANT_STYLES[variant].label).join('/')}
            </text>
          </g>
        );
      })}
    </g>
  );
}
