import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const pencilNoteSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'folders',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'parent_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'color_hex', type: 'string' },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'notebooks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'folder_id', type: 'string', isIndexed: true },
        { name: 'cover_color_hex', type: 'string' },
        { name: 'cover_thumbnail_path', type: 'string', isOptional: true },
        { name: 'page_template', type: 'string' },
        { name: 'is_pdf_backed', type: 'boolean' },
        { name: 'source_pdf_document_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'pages',
      columns: [
        { name: 'notebook_id', type: 'string', isIndexed: true },
        { name: 'page_index', type: 'number', isIndexed: true },
        { name: 'canvas_width', type: 'number' },
        { name: 'canvas_height', type: 'number' },
        { name: 'background_type', type: 'string' },
        { name: 'pdf_page_number', type: 'number', isOptional: true },
        { name: 'thumbnail_path', type: 'string', isOptional: true },
        { name: 'last_edited_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'strokes',
      columns: [
        { name: 'page_id', type: 'string', isIndexed: true },
        { name: 'points_json', type: 'string' },
        { name: 'tool_type', type: 'string' },
        { name: 'shape_type', type: 'string', isOptional: true },
        { name: 'color_hex', type: 'string' },
        { name: 'brush_size', type: 'number' },
        { name: 'opacity', type: 'number' },
        { name: 'z_index', type: 'number' },
        { name: 'bounding_box_json', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'pdf_documents',
      columns: [
        { name: 'file_path', type: 'string' },
        { name: 'original_filename', type: 'string' },
        { name: 'page_count', type: 'number' },
        { name: 'file_size_bytes', type: 'number' },
        { name: 'imported_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'pdf_annotations',
      columns: [
        { name: 'pdf_document_id', type: 'string', isIndexed: true },
        { name: 'pdf_page_number', type: 'number', isIndexed: true },
        { name: 'stroke_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'annotation_type', type: 'string' },
        { name: 'geometry_json', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'text_blocks',
      columns: [
        { name: 'page_id', type: 'string', isIndexed: true },
        { name: 'lexical_json', type: 'string' },
        { name: 'position_x', type: 'number' },
        { name: 'position_y', type: 'number' },
        { name: 'width', type: 'number' },
        { name: 'height', type: 'number' },
        { name: 'z_index', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'audio_recordings',
      columns: [
        { name: 'notebook_id', type: 'string', isIndexed: true },
        { name: 'file_path', type: 'string' },
        { name: 'duration_ms', type: 'number' },
        { name: 'started_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'audio_timestamp_events',
      columns: [
        { name: 'audio_recording_id', type: 'string', isIndexed: true },
        { name: 'target_type', type: 'string' },
        { name: 'target_id', type: 'string', isIndexed: true },
        { name: 'audio_offset_ms', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'tags',
      columns: [
        { name: 'label', type: 'string' },
        { name: 'color_hex', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'notebook_tags',
      columns: [
        { name: 'notebook_id', type: 'string', isIndexed: true },
        { name: 'tag_id', type: 'string', isIndexed: true },
      ],
    }),
  ],
});
