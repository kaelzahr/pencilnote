import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import Page from './Page';

export default class TextBlock extends Model {
  static table = 'text_blocks';

  static associations = {
    pages: { type: 'belongs_to' as const, key: 'page_id' },
  };

  @field('page_id') pageId!: string;
  @field('lexical_json') lexicalJson!: string;
  @field('position_x') positionX!: number;
  @field('position_y') positionY!: number;
  @field('width') width!: number;
  @field('height') height!: number;
  @field('z_index') zIndex!: number;
  @date('updated_at') updatedAt!: Date;

  @relation('pages', 'page_id') page!: Page;
}
