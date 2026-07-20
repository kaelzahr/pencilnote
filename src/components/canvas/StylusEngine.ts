/**
 * StylusEngine
 * Apple Pencil, S-Pen ve parmak dokunuşlarını tek bir normalize edilmiş
 * formata çevirir; avuç içi reddi ve şekil tanıma mantığını barındırır.
 */
import { InputPoint, BoundingBox } from '../../database/models/Stroke';

export type RawPointerType = 'pen' | 'touch' | 'mouse' | 'unknown';

export interface RawTouchEvent {
  id: number;
  x: number;
  y: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  pointerType: RawPointerType;
  touchMajorRadius?: number;
  timestamp: number;
}

export function normalizeTouchEvent(raw: RawTouchEvent): InputPoint {
  return {
    x: raw.x,
    y: raw.y,
    pressure: raw.pointerType === 'pen' ? (raw.pressure && raw.pressure > 0 ? raw.pressure : 0.5) : 0.5,
    tiltX: raw.tiltX ?? 0,
    tiltY: raw.tiltY ?? 0,
    t: raw.timestamp,
  };
}

interface PalmRejectionState {
  activePenTouchId: number | null;
  activePenLastPoint: { x: number; y: number } | null;
  penActiveSince: number | null;
}

const PALM_REJECTION_RADIUS_PX = 140;
const PALM_MIN_TOUCH_RADIUS = 18;
const PALM_GRACE_PERIOD_MS = 60;

export class PalmRejectionFilter {
  private state: PalmRejectionState = {
    activePenTouchId: null,
    activePenLastPoint: null,
    penActiveSince: null,
  };
  private penReleasedAt: number | null = null;

  filter(touches: RawTouchEvent[]): RawTouchEvent[] {
    const penTouch = touches.find((t) => t.pointerType === 'pen');

    if (penTouch) {
      this.state.activePenTouchId = penTouch.id;
      this.state.activePenLastPoint = { x: penTouch.x, y: penTouch.y };
      this.state.penActiveSince = this.state.penActiveSince ?? penTouch.timestamp;
      this.penReleasedAt = null;
    } else if (this.state.activePenTouchId !== null) {
      this.penReleasedAt = this.penReleasedAt ?? Date.now();
      if (Date.now() - this.penReleasedAt > PALM_GRACE_PERIOD_MS) {
        this.state.activePenTouchId = null;
        this.state.activePenLastPoint = null;
        this.state.penActiveSince = null;
      }
    }

    const penIsActiveOrRecentlyActive = this.state.activePenLastPoint !== null;

    return touches.filter((t) => {
      if (t.pointerType === 'pen') return true;

      if (!penIsActiveOrRecentlyActive) {
        if (t.touchMajorRadius && t.touchMajorRadius > PALM_MIN_TOUCH_RADIUS * 1.6) {
          return false;
        }
        return true;
      }

      const dx = t.x - (this.state.activePenLastPoint?.x ?? t.x);
      const dy = t.y - (this.state.activePenLastPoint?.y ?? t.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const tooClose = distance < PALM_REJECTION_RADIUS_PX;
      const tooWide = (t.touchMajorRadius ?? 0) > PALM_MIN_TOUCH_RADIUS;

      return !(tooClose || tooWide);
    });
  }

  reset() {
    this.state = { activePenTouchId: null, activePenLastPoint: null, penActiveSince: null };
    this.penReleasedAt = null;
  }
}

export function computeBoundingBox(points: InputPoint[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export type RecognizedShape =
  | { type: 'line'; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'rectangle'; x: number; y: number; width: number; height: number }
  | { type: 'circle'; cx: number; cy: number; radius: number }
  | { type: 'arrow'; from: { x: number; y: number }; to: { x: number; y: number } }
  | null;

export function recognizeShape(rawPoints: InputPoint[]): RecognizedShape {
  if (rawPoints.length < 6) return null;

  const bbox = computeBoundingBox(rawPoints);
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const diagonal = Math.sqrt(width * width + height * height);
  if (diagonal < 20) return null;

  const simplified = douglasPeucker(rawPoints, Math.max(diagonal * 0.02, 3));
  const isClosed = distanceBetween(rawPoints[0], rawPoints[rawPoints.length - 1]) < diagonal * 0.15;

  if (!isClosed && simplified.length <= 3) {
    const from = rawPoints[0];
    const to = rawPoints[rawPoints.length - 1];
    const hasArrowHead = detectArrowHead(rawPoints);
    return hasArrowHead
      ? { type: 'arrow', from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } }
      : { type: 'line', from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
  }

  if (isClosed) {
    const circularity = computeCircularity(rawPoints, bbox);
    if (circularity > 0.82) {
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cy = (bbox.minY + bbox.maxY) / 2;
      return { type: 'circle', cx, cy, radius: Math.max(width, height) / 2 };
    }
    if (simplified.length >= 4 && simplified.length <= 6) {
      return { type: 'rectangle', x: bbox.minX, y: bbox.minY, width, height };
    }
  }

  return null;
}

function distanceBetween(a: InputPoint, b: InputPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function douglasPeucker(points: InputPoint[], epsilon: number): InputPoint[] {
  if (points.length < 3) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function perpendicularDistance(p: InputPoint, a: InputPoint, b: InputPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  if (norm === 0) return distanceBetween(p, a);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / norm;
}

function computeCircularity(points: InputPoint[], bbox: BoundingBox): number {
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const avgRadius = points.reduce((sum, p) => sum + Math.hypot(p.x - cx, p.y - cy), 0) / points.length;
  if (avgRadius === 0) return 0;
  const variance =
    points.reduce((sum, p) => {
      const r = Math.hypot(p.x - cx, p.y - cy);
      return sum + Math.pow(r - avgRadius, 2);
    }, 0) / points.length;
  const normalizedDeviation = Math.sqrt(variance) / avgRadius;
  return Math.max(0, 1 - normalizedDeviation * 1.4);
}

function detectArrowHead(points: InputPoint[]): boolean {
  const tailStart = Math.floor(points.length * 0.85);
  const tail = points.slice(tailStart);
  if (tail.length < 3) return false;

  const mainDir = angleBetween(points[0], points[points.length - 1]);
  let reversalCount = 0;
  for (let i = 1; i < tail.length; i++) {
    const segDir = angleBetween(tail[i - 1], tail[i]);
    const diff = Math.abs(normalizeAngle(segDir - mainDir));
    if (diff > Math.PI / 2.5) reversalCount++;
  }
  return reversalCount >= 2;
}

function angleBetween(a: InputPoint, b: InputPoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
