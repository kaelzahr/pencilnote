import { Model, Query } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';
import AudioTimestampEvent from './AudioTimestampEvent';

export default class AudioRecording extends Model {
  static table = 'audio_recordings';

  static associations = {
    audio_timestamp_events: { type: 'has_many' as const, foreignKey: 'audio_recording_id' },
  };

  @field('notebook_id') notebookId!: string;
  @field('file_path') filePath!: string;
  @field('duration_ms') durationMs!: number;
  @date('started_at') startedAt!: Date;

  @children('audio_timestamp_events') events!: Query<AudioTimestampEvent>;

  async findEventsNear(offsetMs: number, toleranceMs = 300): Promise<AudioTimestampEvent[]> {
    const all = await this.events.fetch();
    return all.filter((e) => Math.abs(e.audioOffsetMs - offsetMs) <= toleranceMs);
  }
}
