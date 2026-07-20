import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';
import PDFDocument from './PDFDocument';

export default class PDFAnnotation extends Model {
  static table = 'pdf_annotations';

  static associations = {
    pdf_documents: { type: 'belongs_to' as const, key: 'pdf_document_id' },
  };

  @field('pdf_document_id') pdfDocumentId!: string;
  @field('pdf_page_number') pdfPageNumber!: number;
  @field('stroke_id') strokeId!: string | null;
  @field('annotation_type') annotationType!: 'ink' | 'highlight' | 'text_box';
  @field('geometry_json') geometryJson!: string;
  @date('created_at') createdAt!: Date;

  @relation('pdf_documents', 'pdf_document_id') document!: PDFDocument;
}
