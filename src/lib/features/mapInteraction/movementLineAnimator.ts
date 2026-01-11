/**
 * Movement Line Animator
 * Handles animated curved line rendering for pin position changes.
 */

export interface MovementLineData {
  path: string;
  show: boolean;
  duration: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Approximate the length of a quadratic Bezier curve using numerical integration
 */
export function approximateBezierLength(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Use 10 segments for approximation
  const segments = 10;
  let length = 0;
  let prevX = x0;
  let prevY = y0;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;

    // Quadratic Bezier formula
    const x = oneMinusT * oneMinusT * x0 + 2 * oneMinusT * t * x1 + t * t * x2;
    const y = oneMinusT * oneMinusT * y0 + 2 * oneMinusT * t * y1 + t * t * y2;

    // Add distance from previous point
    length += Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));

    prevX = x;
    prevY = y;
  }

  return length;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(start: Point, end: Point): number {
  return Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
}

/**
 * Calculate control point for quadratic bezier curve
 * Curves upward from the higher point (lower Y value on screen)
 */
function calculateControlPoint(start: Point, end: Point, distance: number): Point {
  const midX = (start.x + end.x) / 2;
  const higherY = Math.min(start.y, end.y);
  const bendOffset = distance * 0.3;

  return {
    x: midX,
    y: higherY - bendOffset
  };
}

/**
 * Create SVG path for quadratic bezier curve
 */
function createBezierPath(start: Point, control: Point, end: Point): string {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

/**
 * Calculate movement line data for animated curve between two map positions
 *
 * @param map - Leaflet map instance
 * @param originalLocation - Starting location { lat, lng }
 * @param newLocation - Ending location { lat, lng }
 * @param minDistance - Minimum pixel distance to show line (default: 5)
 * @param pixelsPerSecond - Animation speed (default: 100)
 * @returns Movement line data or null if positions too close
 */
export function calculateMovementLine(
  map: any,
  originalLocation: { lat: number; lng: number },
  newLocation: { lat: number; lng: number },
  minDistance: number = 5,
  pixelsPerSecond: number = 100
): MovementLineData {
  // Convert lat/lng to pixel coordinates
  const startPoint = map.latLngToContainerPoint([originalLocation.lat, originalLocation.lng]);
  const endPoint = map.latLngToContainerPoint([newLocation.lat, newLocation.lng]);

  // Calculate distance between points
  const distance = calculateDistance(startPoint, endPoint);

  // Check if locations are different enough to show line
  if (distance < minDistance) {
    return { path: '', show: false, duration: 2 };
  }

  // Calculate control point for the curve
  const controlPoint = calculateControlPoint(startPoint, endPoint, distance);

  // Create quadratic bezier curve path
  const path = createBezierPath(startPoint, controlPoint, endPoint);

  // Calculate approximate curve length using numerical integration
  const curveLength = approximateBezierLength(
    startPoint.x,
    startPoint.y,
    controlPoint.x,
    controlPoint.y,
    endPoint.x,
    endPoint.y
  );

  // Calculate animation duration based on curve length
  // Set velocity to maintain consistent speed
  const duration = curveLength / pixelsPerSecond;

  return { path, show: true, duration };
}
