// src/components/Controls/shapeChipStyles.ts

import type React from 'react';

export function shapeChipStyle(
  isSelected: boolean,
  accentColor: string
): React.CSSProperties {
  return {
    minHeight: 44,
    padding: '0 0.8rem',
    flexShrink: 0,
    borderRadius: '0.6rem',
    border: isSelected ? `2px solid ${accentColor}` : '1px solid #d6d3d1',
    background: isSelected ? accentColor : 'white',
    color: isSelected ? 'white' : '#292524',
    fontWeight: isSelected ? 700 : 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    whiteSpace: 'nowrap',
  };
}

export const shapeRangeLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  opacity: 0.85,
  fontWeight: 500,
};

export const shapeLegendStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#57534e',
  marginBottom: '0.4rem',
};
