/**
 * StrokeRenderer
 * perfect-freehand kütüphanesinin ürettiği outline noktalarını
 * react-native-skia Path nesnesine çevirir.
 */
import { Skia, SkPath } from '@shopify/react-native-skia';
import getStroke from 'perfect-freehand';
import { InputPoint } from '../../database/models/Stroke';

export interface BrushProfile {
  toolType: 'pen' | 'pencil' | 'highlighter' | 'eraser';
  size: number;
  opacity: number;
}

function getStrokeOptionsForTool(profile: BrushProfile) {
  switch (profile.toolType) {
    case 'highlighter':
      return {
        size: profile.size * 3.2,
        thinning: 0.15,
        smoothing: 0.35,
        streamline: 0.35,
        simulatePressure: false,
      };
    case 'pencil':
      return {
        size: profile.size * 0.9,
        thinning: 0.75,
        smoothing: 0.4,
        streamline: 0.45,
        simulatePressure: false,
      };
    case 'pen':
    default:
      return {
        size: profile.size,
        thinning: 0.55,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: false,
      };
  }
}

export function buildSkiaPathFromPoints(points: InputPoint[], profile: BrushProfile): SkPath {
  const strokeInput = points.map((p) => [p.x, p.y, p.pressure] as [number, number, number]);
  const options = getStrokeOptionsForTool(profile);

  const outlinePoints = getStroke(strokeInput, options);

  const path = Skia.Path.Make();
  if (outlinePoints.length === 0) return path;

  path.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
  for (let i = 1; i < outlinePoints.length; i++) {
    path.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
  }
  path.close();
  return path;
}

export function buildLivePreviewPath(livePoints: InputPoint[], profile: BrushProfile): SkPath {
  if (livePoints.length < 2) {
    const p = Skia.Path.Make();
    if (livePoints.length === 1) {
      p.addCircle(livePoints[0].x, livePoints[0].y, (profile.size * livePoints[0].pressure) / 2);
    }
    return p;
  }
  return buildSkiaPathFromPoints(livePoints, profile);
}
