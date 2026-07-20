import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import AudioRecording from './AudioRecording';

export default class AudioTimestampEvent extends Model {
  static table = 'audio_timestamp_events';

  static associations = {
    audio_recordings: { type: 'belongs_to' as const, key: 'audio_recording_id' },
  };

  @field('audio_recording_id') audioRecordingId!: string;
  @field('target_type') targetType!: 'stroke' | 'text_block';
  @field('target_id') targetId!: string;
  @field('audio_offset_ms') audioOffsetMs!: number;

  @relation('audio_recordings', 'audio_recording_id') recording!: AudioRecording;
}
