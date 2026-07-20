import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children, relation } from '@nozbe/watermelondb/decorators';
import Stroke from './Stroke';
import TextBlock from './TextBlock';
import Notebook from './Notebook';

export default class Page extends Model {
  static table = 'pages';

  static associations = {
    strokes: { type: 'has_many' as const, foreignKey: 'page_id' },
    text_blocks: { type: 'has_many' as const, foreignKey: 'page_id' },
    notebooks: { type: 'belongs_to' as const, key: 'notebook_id' },
  };

  @field('notebook_id') notebookId!: string;
  @field('page_index') pageIndex!: number;
  @field('canvas_width') canvasWidth!: number;
  @field('canvas_height') canvasHeight!: number;
  @field('background_type') backgroundType!: 'blank' | 'pdf' | 'image';
  @field('pdf_page_number') pdfPageNumber!: number | null;
  @field('thumbnail_path') thumbnailPath!: string | null;
  @date('last_edited_at') lastEditedAt!: Date;
  @date('created_at') createdAt!: Date;

  @relation('notebooks', 'notebook_id') notebook!: Notebook;
  @children('strokes') strokes!: Query<Stroke>;
  @children('text_blocks') textBlocks!: Query<TextBlock>;

  async addStroke(params: {
    pointsJson: string;
    toolType: string;
    colorHex: string;
    brushSize: number;
    opacity: number;
    boundingBoxJson: string;
    shapeType?: string;
  }): Promise<Stroke> {
    const strokeCollection = this.collections.get<Stroke>('strokes');
    const currentStrokes = await this.strokes.fetch();
    const maxZ = currentStrokes.reduce((m, s) => Math.max(m, s.zIndex), 0);

    return this.database.write(async () => {
      const stroke = await strokeCollection.create((s) => {
        s.pageId = this.id;
        s.pointsJson = params.pointsJson;
        s.toolType = params.toolType;
        s.shapeType = params.shapeType ?? null;
        s.colorHex = params.colorHex;
        s.brushSize = params.brushSize;
        s.opacity = params.opacity;
        s.zIndex = maxZ + 1;
        s.boundingBoxJson = params.boundingBoxJson;
        s.createdAt = new Date();
      });
      await this.update((p) => {
        p.lastEditedAt = new Date();
      });
      return stroke;
    });
  }
}
