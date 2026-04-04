/**
 * Web fallback for the media editing service.
 *
 * Android uses a custom Media3 native bridge, while web keeps a lightweight
 * passthrough implementation so Expo can start successfully.
 */

export interface TrimParams {
  start: number;
  end: number;
}

export interface MusicParams {
  uri: string;
  volume: number;
  keepOriginalAudio: boolean;
}

export interface TextParams {
  content: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
}

export interface EditorState {
  videoUri: string;
  trim: TrimParams | null;
  music: MusicParams | null;
  speed: number;
  text: TextParams | null;
  filter: string | null;
}

export const COLOR_FILTER_PRESETS: Record<string, string> = {
  none: '',
  grayscale: 'hue=s=0',
  vivid: 'eq=saturation=1.5:contrast=1.2',
  autumn: 'colorbalance=rs=0.15:gs=-0.05:bs=-0.15,eq=saturation=1.3',
  vintage: 'curves=vintage',
  cool: 'colorbalance=rs=-0.1:gs=0.05:bs=0.2,eq=brightness=0.05',
};

export async function concatSegments(segments: string[]): Promise<string> {
  if (segments.length === 0) {
    throw new Error('Không có clip nào để ghép');
  }
  return segments[0];
}

export async function exportVideo(state: EditorState): Promise<string> {
  return state.videoUri;
}

export async function generateThumbnail(videoUri: string): Promise<string> {
  return videoUri;
}

export async function cleanupTmpFiles(): Promise<void> {
  return;
}

export async function cleanupLocalFiles(): Promise<void> {
  return;
}
