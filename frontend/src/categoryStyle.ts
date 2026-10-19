// Shared visual language for inactive ("parked") categories: instead of
// hiding them, their color is drawn as a diagonal hatch / hollow swatch so
// history stays readable while clearly reading as "not currently tracked".

export const inactiveHatch = (color: string): string =>
  `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)`;

/** Swatch style: solid fill when active, hollow ring when inactive. */
export const swatchStyle = (color: string, isActive: boolean): React.CSSProperties =>
  isActive
    ? { backgroundColor: color }
    : { backgroundColor: 'transparent', boxShadow: `inset 0 0 0 1.5px ${color}` };

/** Bar / segment fill: solid when active, hatched when inactive. */
export const segmentStyle = (color: string, isActive: boolean): React.CSSProperties =>
  isActive ? { backgroundColor: color } : { backgroundImage: inactiveHatch(color) };
