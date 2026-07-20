/**
 * TabletCanvas — ANA ÇEKİRDEK BİLEŞEN
 * Kalem/parmak çizim katmanı ile PDF arkaplan katmanını TEK bir
 * koordinat sisteminde birleştirir.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Path,
  Group,
  useTouchHandler,
  TouchInfo,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';

import Page from '../../database/models/Page';
import { InputPoint } from '../../database/models/Stroke';
import {
  PalmRejectionFilter,
  RawTouchEvent,
  normalizeTouchEvent,
  computeBoundingBox,
  recognizeShape,
  RecognizedShape,
} from './StylusEngine';
import { buildSkiaPathFromPoints, buildLivePreviewPath, BrushProfile } from './StrokeRenderer';
import { useCanvasHistory } from './useCanvasHistory';

export interface ActiveToolState {
  toolType: 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'shape';
  colorHex: string;
  brushSize: number;
  opacity: number;
  shapeRecognitionEnabled: boolean;
}

interface StoredStroke {
  id: string;
  points: InputPoint[];
  toolType: string;
  colorHex: string;
  brushSize: number;
  opacity: number;
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
  shapeType?: string | null;
}

interface TabletCanvasProps {
  page: Page;
  activeTool: ActiveToolState;
  pdfBackgroundUri?: string;
  initialStrokes: StoredStroke[];
  isAudioRecording?: boolean;
  audioElapsedMsRef?: React.MutableRefObject<number>;
  onStrokeCommitted: (stroke: {
    pointsJson: string;
    toolType: string;
    colorHex: string;
    brushSize: number;
    opacity: number;
    boundingBoxJson: string;
    shapeType?: string;
  }, audioOffsetMs: number | null) => void;
}
export default function TabletCanvas({
  page,
  activeTool,
  pdfBackgroundUri,
  initialStrokes,
  isAudioRecording = false,
  audioElapsedMsRef,
  onStrokeCommitted,
}: TabletCanvasProps) {
  const [canvasSize, setCanvasSize] = useState({ width: page.canvasWidth, height: page.canvasHeight });
  const [committedStrokes, setCommittedStrokes] = useState<StoredStroke[]>(initialStrokes);
  const [liveStrokePoints, setLiveStrokePoints] = useState<InputPoint[]>([]);
  const [viewport, setViewport] = useState({ minX: 0, minY: 0, maxX: canvasSize.width, maxY: canvasSize.height });

  const palmFilter = useRef(new PalmRejectionFilter()).current;
  const activeTouchIdRef = useRef<number | null>(null);
  const rawPointBufferRef = useRef<InputPoint[]>([]);
  const { pushHistory } = useCanvasHistory();

  const pdfImage = useImage(pdfBackgroundUri ?? null);

  const brushProfile: BrushProfile = useMemo(
    () => ({
      toolType: activeTool.toolType === 'eraser' || activeTool.toolType === 'shape' ? 'pen' : activeTool.toolType,
      size: activeTool.brushSize,
      opacity: activeTool.opacity,
    }),
    [activeTool]
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
    setViewport((v) => ({ ...v, maxX: width, maxY: height }));
  }, []);

  const toRawTouchEvent = (t: TouchInfo): RawTouchEvent => ({
    id: t.id,
    x: t.x,
    y: t.y,
    pressure: (t as any).force ?? 0.5,
    tiltX: (t as any).tiltX ?? 0,
    tiltY: (t as any).tiltY ?? 0,
    pointerType: (t as any).pointerType ?? 'touch',
    touchMajorRadius: (t as any).touchMajorRadius ?? 0,
    timestamp: Date.now(),
  });

  const handleStart = useCallback(
    (touches: TouchInfo[]) => {
      const raw = touches.map(toRawTouchEvent);
      const accepted = palmFilter.filter(raw);
      if (accepted.length === 0) return;

      const primary = accepted[0];
      activeTouchIdRef.current = primary.id;
      rawPointBufferRef.current = [normalizeTouchEvent(primary)];
      setLiveStrokePoints(rawPointBufferRef.current);
    },
    [palmFilter]
  );

  const handleActive = useCallback(
    (touches: TouchInfo[]) => {
      const raw = touches.map(toRawTouchEvent);
      const accepted = palmFilter.filter(raw);
      const current = accepted.find((t) => t.id === activeTouchIdRef.current);
      if (!current) return;

      const point = normalizeTouchEvent(current);
      rawPointBufferRef.current = [...rawPointBufferRef.current, point];
      setLiveStrokePoints(rawPointBufferRef.current);
    },
    [palmFilter]
  );
  const handleEnd = useCallback(() => {
    const points = rawPointBufferRef.current;
    activeTouchIdRef.current = null;
    setLiveStrokePoints([]);
    rawPointBufferRef.current = [];

    if (points.length === 0) return;

    if (activeTool.toolType === 'eraser') {
      const eraseBox = computeBoundingBox(points);
      setCommittedStrokes((prev) => {
        const remaining = prev.filter((s) => !boxesIntersect(s.boundingBox, eraseBox));
        pushHistory({ type: 'erase', removed: prev.filter((s) => boxesIntersect(s.boundingBox, eraseBox)) });
        return remaining;
      });
      return;
    }

    let finalPoints = points;
    let shapeType: string | undefined;

    if (activeTool.shapeRecognitionEnabled && points.length >= 6) {
      const recognized: RecognizedShape = recognizeShape(points);
      if (recognized) {
        finalPoints = shapeToPoints(recognized, points[0].t);
        shapeType = recognized.type;
      }
    }

    const boundingBox = computeBoundingBox(finalPoints);
    const audioOffsetMs = isAudioRecording && audioElapsedMsRef ? audioElapsedMsRef.current : null;

    const newStroke: StoredStroke = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      points: finalPoints,
      toolType: activeTool.toolType,
      colorHex: activeTool.colorHex,
      brushSize: activeTool.brushSize,
      opacity: activeTool.opacity,
      boundingBox,
      shapeType,
    };

    setCommittedStrokes((prev) => [...prev, newStroke]);
    pushHistory({ type: 'add', stroke: newStroke });

    onStrokeCommitted(
      {
        pointsJson: JSON.stringify(finalPoints),
        toolType: activeTool.toolType,
        colorHex: activeTool.colorHex,
        brushSize: activeTool.brushSize,
        opacity: activeTool.opacity,
        boundingBoxJson: JSON.stringify(boundingBox),
        shapeType,
      },
      audioOffsetMs
    );
  }, [activeTool, isAudioRecording, audioElapsedMsRef, onStrokeCommitted, pushHistory]);

  const touchHandler = useTouchHandler(
    {
      onStart: handleStart,
      onActive: handleActive,
      onEnd: handleEnd,
    },
    [handleStart, handleActive, handleEnd]
  );

  const visibleStrokes = useMemo(
    () => committedStrokes.filter((s) => boxesIntersect(s.boundingBox, viewport)),
    [committedStrokes, viewport]
  );

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Canvas style={styles.canvas} onTouch={touchHandler}>
        {pdfImage && (
          <SkiaImage image={pdfImage} x={0} y={0} width={canvasSize.width} height={canvasSize.height} fit="contain" />
        )}

        <Group>
          {visibleStrokes.map((stroke) => {
            const path = buildSkiaPathFromPoints(stroke.points, {
              toolType: stroke.toolType as BrushProfile['toolType'],
              size: stroke.brushSize,
              opacity: stroke.opacity,
            });
            return (
              <Path
                key={stroke.id}
                path={path}
                color={stroke.colorHex}
                opacity={stroke.toolType === 'highlighter' ? Math.min(stroke.opacity, 0.45) : stroke.opacity}
                style="fill"
              />
            );
          })}
        </Group>

        {liveStrokePoints.length > 0 && (
          <Path
            path={buildLivePreviewPath(liveStrokePoints, brushProfile)}
            color={activeTool.colorHex}
            opacity={activeTool.toolType === 'highlighter' ? 0.45 : activeTool.opacity}
            style="fill"
          />
        )}
      </Canvas>
    </View>
  );
}

function boxesIntersect(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

function shapeToPoints(shape: NonNullable<RecognizedShape>, baseTime: number): InputPoint[] {
  const SEGMENTS = 48;
  const pts: InputPoint[] = [];

  if (shape.type === 'line' || shape.type === 'arrow') {
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      pts.push({
        x: shape.from.x + (shape.to.x - shape.from.x) * t,
        y: shape.from.y + (shape.to.y - shape.from.y) * t,
        pressure: 0.6,
        t: baseTime + i,
      });
    }
    if (shape.type === 'arrow') {
      const angle = Math.atan2(shape.to.y - shape.from.y, shape.to.x - shape.from.x);
      const headLen = 22;
      [angle + Math.PI * 0.8, angle - Math.PI * 0.8].forEach((wingAngle, idx) => {
        pts.push({
          x: shape.to.x + Math.cos(wingAngle) * headLen,
          y: shape.to.y + Math.sin(wingAngle) * headLen,
          pressure: 0.6,
          t: baseTime + SEGMENTS + idx + 1,
        });
        pts.push({ x: shape.to.x, y: shape.to.y, pressure: 0.6, t: baseTime + SEGMENTS + idx + 2 });
      });
    }
    return pts;
  }

  if (shape.type === 'rectangle') {
    const corners = [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x + shape.width, y: shape.y + shape.height },
      { x: shape.x, y: shape.y + shape.height },
      { x: shape.x, y: shape.y },
    ];
    corners.forEach((c, i) => pts.push({ ...c, pressure: 0.6, t: baseTime + i }));
    return pts;
  }

  if (shape.type === 'circle') {
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      pts.push({
        x: shape.cx + Math.cos(angle) * shape.radius,
        y: shape.cy + Math.sin(angle) * shape.radius,
        pressure: 0.6,
        t: baseTime + i,
      });
    }
    return pts;
  }

  return pts;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
});
