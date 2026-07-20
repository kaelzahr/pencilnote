/**
 * AdaptiveToolbar
 * Tablet dikey/yatay moduna göre kendini ekranın sağına ya da altına
 * konumlandıran, sürüklenebilir fırça/renk araç çubuğu.
 */
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Animated, PanResponder } from 'react-native';
import { ActiveToolState } from '../canvas/TabletCanvas';

interface Props {
  tool: ActiveToolState;
  onToolChange: (next: ActiveToolState) => void;
}

const BRUSH_PRESETS: Array<{ label: string; toolType: ActiveToolState['toolType']; size: number }> = [
  { label: 'Kalem', toolType: 'pen', size: 4 },
  { label: 'Kurşun Kalem', toolType: 'pencil', size: 3 },
  { label: 'Fosforlu Kalem', toolType: 'highlighter', size: 14 },
  { label: 'Silgi', toolType: 'eraser', size: 20 },
];

const COLOR_PALETTE = ['#111111', '#E03131', '#2F9E44', '#1971C2', '#F08C00', '#9C36B5'];

export default function AdaptiveToolbar({ tool, onToolChange }: Props) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const dockPosition = isLandscape ? 'right' : 'bottom';

  const pan = useRef(new Animated.ValueXY()).current;
  const [manuallyMoved, setManuallyMoved] = useState(false);

  useEffect(() => {
    if (!manuallyMoved) pan.setValue({ x: 0, y: 0 });
  }, [isLandscape, manuallyMoved]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setManuallyMoved(true);
      },
    })
  ).current;

  const containerStyle = [
    styles.container,
    dockPosition === 'right' ? styles.dockRight : styles.dockBottom,
    { transform: pan.getTranslateTransform() },
  ];

  return (
    <Animated.View style={containerStyle} {...panResponder.panHandlers}>
      <View style={dockPosition === 'right' ? styles.columnGroup : styles.rowGroup}>
        {BRUSH_PRESETS.map((preset) => {
          const isActive = tool.toolType === preset.toolType;
          return (
            <View
              key={preset.toolType}
              style={[styles.brushButton, isActive && styles.brushButtonActive]}
              onTouchEnd={() =>
                onToolChange({ ...tool, toolType: preset.toolType, brushSize: preset.size })
              }
            >
              <View style={[styles.brushDot, { width: Math.min(preset.size + 6, 20), height: Math.min(preset.size + 6, 20) }]} />
            </View>
          );
        })}
      </View>

      <View style={dockPosition === 'right' ? styles.columnGroup : styles.rowGroup}>
        {COLOR_PALETTE.map((hex) => (
          <View
            key={hex}
            style={[
              styles.colorSwatch,
              { backgroundColor: hex },
              tool.colorHex === hex && styles.colorSwatchActive,
            ]}
            onTouchEnd={() => onToolChange({ ...tool, colorHex: hex })}
          />
        ))}
      </View>

      <View
        style={[styles.shapeToggle, tool.shapeRecognitionEnabled && styles.shapeToggleActive]}
        onTouchEnd={() => onToolChange({ ...tool, shapeRecognitionEnabled: !tool.shapeRecognitionEnabled })}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 22,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dockRight: { top: '18%', right: 16, flexDirection: 'column' },
  dockBottom: { bottom: 24, left: '10%', right: '10%', flexDirection: 'row', justifyContent: 'space-between' },
  columnGroup: { flexDirection: 'column', alignItems: 'center', marginVertical: 6 },
  rowGroup: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6 },
  brushButton: {
    width: 44, height: 44, borderRadius: 12, marginVertical: 4, marginHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  brushButtonActive: { backgroundColor: '#0A84FF' },
  brushDot: { borderRadius: 20, backgroundColor: '#FFFFFF' },
  colorSwatch: {
    width: 30, height: 30, borderRadius: 15, marginVertical: 4, marginHorizontal: 4,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: '#FFFFFF' },
  shapeToggle: {
    width: 44, height: 44, borderRadius: 12, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shapeToggleActive: { backgroundColor: '#30D158' },
});
