import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children, relation } from '@nozbe/watermelondb/decorators';
import Page from './Page';
import Folder from './Folder';

export default class Notebook extends Model {
  static table = 'notebooks';

  static associations = {
    pages: { type: 'has_many' as const, foreignKey: 'notebook_id' },
    folders: { type: 'belongs_to' as const, key: 'folder_id' },
  };

  @field('title') title!: string;
  @field('folder_id') folderId!: string;
  @field('cover_color_hex') coverColorHex!: string;
  @field('cover_thumbnail_path') coverThumbnailPath!: string | null;
  @field('page_template') pageTemplate!: 'blank' | 'lined' | 'grid' | 'dotted';
  @field('is_pdf_backed') isPdfBacked!: boolean;
  @field('source_pdf_document_id') sourcePdfDocumentId!: string | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('folders', 'folder_id') folder!: Folder;
  @children('pages') pages!: Query<Page>;

  async appendBlankPage(width = 1668, height = 2388): Promise<Page> {
    const pagesCollection = this.collections.get<Page>('pages');
    const existingPages = await this.pages.fetch();
    const nextIndex = existingPages.length;

    return this.database.write(async () => {
      return pagesCollection.create((page) => {
        page.notebookId = this.id;
        page.pageIndex = nextIndex;
        page.canvasWidth = width;
        page.canvasHeight = height;
        page.backgroundType = 'blank';
        page.lastEditedAt = new Date();
        page.createdAt = new Date();
      });
    });
  }
}
