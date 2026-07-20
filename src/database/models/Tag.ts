import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Tag extends Model {
  static table = 'tags';
  @field('label') label!: string;
  @field('color_hex') colorHex!: string;
}
