import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Page from './Page';

export interface InputPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  t: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export default class Stroke extends Model {
  static table = 'strokes';

  static associations = {
    pages: { type: 'belongs_to' as const, key: 'page_id' },
  };

  @field('page_id') pageId!: string;
  @field('points_json') pointsJson!: string;
  @field('tool_type') toolType!: 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'shape';
  @field('shape_type') shapeType!: string | null;
  @field('color_hex') colorHex!: string;
  @field('brush_size') brushSize!: number;
  @field('opacity') opacity!: number;
  @field('z_index') zIndex!: number;
  @field('bounding_box_json') boundingBoxJson!: string;
  @date('created_at') createdAt!: Date;

  @relation('pages', 'page_id') page!: Page;

  get points(): InputPoint[] {
    return JSON.parse(this.pointsJson);
  }

  get boundingBox(): BoundingBox {
    return JSON.parse(this.boundingBoxJson);
  }

  intersectsViewport(viewport: BoundingBox): boolean {
    const b = this.boundingBox;
    return !(b.maxX < viewport.minX || b.minX > viewport.maxX || b.maxY < viewport.minY || b.minY > viewport.maxY);
  }
}
