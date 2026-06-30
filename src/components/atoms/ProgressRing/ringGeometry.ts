export type RingGeometry = { circumference: number; dashOffset: number };

/** Maps progress (0..1, clamped) to stroke-dash values for a circle of the given radius. */
export function ringGeometry(progress: number, radius: number): RingGeometry {
  const p = Math.max(0, Math.min(1, progress));
  const circumference = 2 * Math.PI * radius;
  return { circumference, dashOffset: circumference * (1 - p) };
}
