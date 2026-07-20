import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { pencilNoteSchema } from './schema';

import Folder from './models/Folder';
import Notebook from './models/Notebook';
import Page from './models/Page';
import Stroke from './models/Stroke';
import PDFDocument from './models/PDFDocument';
import PDFAnnotation from './models/PDFAnnotation';
import TextBlock from './models/TextBlock';
import AudioRecording from './models/AudioRecording';
import AudioTimestampEvent from './models/AudioTimestampEvent';
import Tag from './models/Tag';

const adapter = new SQLiteAdapter({
  schema: pencilNoteSchema,
  jsi: true,
  dbName: 'pencilnote.db',
  onSetUpError: (error) => {
    console.error('[PencilNote] Veritabanı başlatma hatası:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Folder,
    Notebook,
    Page,
    Stroke,
    PDFDocument,
    PDFAnnotation,
    TextBlock,
    AudioRecording,
    AudioTimestampEvent,
    Tag,
  ],
});
