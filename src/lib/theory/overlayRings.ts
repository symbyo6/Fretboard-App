export interface OverlayRingStyle {
  stroke: string;
  dash: string;
}

export interface OverlayRing<T extends string> extends OverlayRingStyle {
  note: string;
  variants: T[];
}

/** Groups active variants by pitch name and assigns each group its representative ring style. */
export function buildOverlayRings<T extends string>(
  degreeInfo: Record<T, string>,
  styles: Record<T, OverlayRingStyle>,
  activeVariants: T[] = Object.keys(degreeInfo) as T[]
): OverlayRing<T>[] {
  const groups = new Map<string, T[]>();

  activeVariants.forEach((variant) => {
    const note = degreeInfo[variant];
    groups.set(note, [...(groups.get(note) ?? []), variant]);
  });

  return Array.from(groups, ([note, variants]) => ({
    note,
    variants,
    ...styles[variants[0]],
  }));
}