import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children, lazy } from '@nozbe/watermelondb/decorators';
import Notebook from './Notebook';

export default class Folder extends Model {
  static table = 'folders';

  static associations = {
    notebooks: { type: 'has_many' as const, foreignKey: 'folder_id' },
  };

  @field('name') name!: string;
  @field('parent_id') parentId!: string | null;
  @field('color_hex') colorHex!: string;
  @field('sort_order') sortOrder!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('notebooks') notebooks!: Query<Notebook>;

  @lazy
  childFolders = this.collections
    .get<Folder>('folders')
    .query()
    .extend();

  async getAllDescendantIds(): Promise<string[]> {
    const database = this.database;
    const allFolders = await database.get<Folder>('folders').query().fetch();
    const result: string[] = [];
    const stack = [this.id];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const directChildren = allFolders.filter((f) => f.parentId === currentId);
      for (const child of directChildren) {
        result.push(child.id);
        stack.push(child.id);
      }
    }
    return result;
  }

  async moveTo(newParentId: string | null): Promise<void> {
    if (newParentId) {
      const descendants = await this.getAllDescendantIds();
      if (descendants.includes(newParentId) || newParentId === this.id) {
        throw new Error('Bir klasör kendi alt klasörünün içine taşınamaz.');
      }
    }
    await this.database.write(async () => {
      await this.update((folder) => {
        folder.parentId = newParentId;
        folder.updatedAt = new Date();
      });
    });
  }
}
