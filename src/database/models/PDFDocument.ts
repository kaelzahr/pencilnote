import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import PDFAnnotation from './PDFAnnotation';

export default class PDFDocument extends Model {
  static table = 'pdf_documents';

  static associations = {
    pdf_annotations: { type: 'has_many' as const, foreignKey: 'pdf_document_id' },
  };

  @field('file_path') filePath!: string;
  @field('original_filename') originalFilename!: string;
  @field('page_count') pageCount!: number;
  @field('file_size_bytes') fileSizeBytes!: number;
  @date('imported_at') importedAt!: Date;

  @children('pdf_annotations') annotations!: Query<PDFAnnotation>;
}
