import { NativeModules, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

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

type NativeMedia3Module = {
  concatSegments(segmentUris: string[]): Promise<string>;
  exportVideo(options: {
    videoUri: string;
    trim: TrimParams | null;
    music: MusicParams | null;
    speed: number;
    text: TextParams | null;
    filter: string | null;
  }): Promise<string>;
  getCurrentProgress(): Promise<number>;
  generateThumbnail(videoUri: string): Promise<string>;
  cleanupTmpFiles(): Promise<void>;
};

const TMP_DIR_NAMES = ['ffmpeg_tmp', 'media3_tmp'];
const TMP_FILE_TTL_MS = 6 * 60 * 60 * 1000;
const TMP_MAX_FILES = 24;

const media3Module: NativeMedia3Module | undefined =
  Platform.OS === 'android' ? (NativeModules.Media3Transformer as NativeMedia3Module | undefined) : undefined;

function requireMedia3Module(): NativeMedia3Module {
  if (!media3Module) {
    throw new Error('Media3 native module is not available on this platform/build.');
  }
  return media3Module;
}

function ensureFileUri(uri: string): string {
  if (!uri) {
    return uri;
  }
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
}

function getTmpDirs(): Directory[] {
  return TMP_DIR_NAMES.map((name) => new Directory(Paths.cache, name));
}

function deleteEntryQuietly(entry: File | Directory | string) {
  try {
    if (typeof entry === 'string') {
      const file = new File(entry);
      if (file.exists) {
        file.delete();
      }
      return;
    }

    if (entry.exists) {
      entry.delete();
    }
  } catch (_) {}
}

function pruneTmpDirs() {
  const now = Date.now();

  getTmpDirs().forEach((dir) => {
    if (!dir.exists) {
      return;
    }

    const files = dir.list().filter((entry): entry is File => entry instanceof File);
    files
      .filter((file) => {
        const modifiedAt = file.modificationTime ?? 0;
        return modifiedAt > 0 && now - modifiedAt > TMP_FILE_TTL_MS;
      })
      .forEach(deleteEntryQuietly);

    const remainingFiles = dir
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .sort((left, right) => (left.modificationTime ?? 0) - (right.modificationTime ?? 0));

    const overflowCount = remainingFiles.length - TMP_MAX_FILES;
    if (overflowCount > 0) {
      remainingFiles.slice(0, overflowCount).forEach(deleteEntryQuietly);
    }
  });
}

function isLikelyTemporaryUri(uri: string): boolean {
  const normalized = uri.toLowerCase();
  const cacheUri = Paths.cache.uri.toLowerCase();

  return (
    normalized.startsWith(cacheUri) ||
    normalized.includes('/cache/') ||
    normalized.includes('/tmp/') ||
    normalized.includes('\\cache\\') ||
    normalized.includes('\\tmp\\')
  );
}

export async function concatSegments(
  segments: string[],
  onProgress?: (percent: number) => void
): Promise<string> {
  if (segments.length === 0) {
    throw new Error('Khong co clip nao de ghep');
  }

  if (segments.length === 1) {
    return ensureFileUri(segments[0]);
  }

  if (Platform.OS !== 'android') {
    return ensureFileUri(segments[0]);
  }

  const module = requireMedia3Module();
  onProgress?.(0);
  const output = await module.concatSegments(segments.map(ensureFileUri));
  onProgress?.(100);
  return ensureFileUri(output);
}

export async function exportVideo(
  state: EditorState,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (Platform.OS !== 'android') {
    onProgress?.(100);
    return ensureFileUri(state.videoUri);
  }

  const module = requireMedia3Module();
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  if (onProgress) {
    onProgress(0);
    progressTimer = setInterval(() => {
      void module
        .getCurrentProgress()
        .then((value) => {
          if (typeof value === 'number' && value >= 0) {
            onProgress(Math.min(99, value));
          }
        })
        .catch(() => undefined);
    }, 250);
  }

  try {
    const output = await module.exportVideo({
      videoUri: ensureFileUri(state.videoUri),
      trim: state.trim,
      music: state.music
        ? {
            ...state.music,
            uri: ensureFileUri(state.music.uri),
          }
        : null,
      speed: state.speed,
      text: state.text,
      filter: state.filter,
    });

    onProgress?.(100);
    return ensureFileUri(output);
  } finally {
    if (progressTimer) {
      clearInterval(progressTimer);
    }
  }
}

export async function generateThumbnail(videoUri: string): Promise<string> {
  if (Platform.OS !== 'android') {
    return ensureFileUri(videoUri);
  }

  const module = requireMedia3Module();
  return ensureFileUri(await module.generateThumbnail(ensureFileUri(videoUri)));
}

export async function cleanupTmpFiles(): Promise<void> {
  pruneTmpDirs();

  if (Platform.OS !== 'android' || !media3Module) {
    return;
  }

  try {
    await media3Module.cleanupTmpFiles();
  } catch (error) {
    console.warn('[Media3] Cleanup failed:', error);
  }
}

export async function cleanupLocalFiles(uris: Array<string | null | undefined>): Promise<void> {
  uris
    .filter((uri): uri is string => Boolean(uri))
    .map(ensureFileUri)
    .filter((uri, index, current) => current.indexOf(uri) === index)
    .filter((uri) => uri.startsWith('file://'))
    .filter(isLikelyTemporaryUri)
    .forEach(deleteEntryQuietly);
}
