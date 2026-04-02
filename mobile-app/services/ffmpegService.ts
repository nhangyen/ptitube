import { FFmpegKit, FFmpegKitConfig, ReturnCode } from '@wokcito/ffmpeg-kit-react-native';
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

const TMP_DIR_NAME = 'ffmpeg_tmp';
const TMP_FILE_TTL_MS = 6 * 60 * 60 * 1000;
const TMP_MAX_FILES = 24;

function getTmpDir(): Directory {
  return new Directory(Paths.cache, TMP_DIR_NAME);
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

function pruneTmpDir() {
  const dir = getTmpDir();
  if (!dir.exists) {
    return;
  }

  const now = Date.now();
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
}

function ensureTmpDir(): Directory {
  const dir = getTmpDir();
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
  pruneTmpDir();
  return dir;
}

function generateOutputPath(prefix = 'output'): string {
  const dir = ensureTmpDir();
  return new File(dir, `${prefix}_${Date.now()}.mp4`).uri;
}

function hexToFFmpegColor(hex: string): string {
  if (!hex) return '0xFFFFFF';
  return `0x${hex.replace('#', '')}`;
}

function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, '\\\\:')
    .replace(/%/g, '%%');
}

function escapeConcatPath(path: string): string {
  return path.replace(/'/g, "'\\''");
}

function buildAtempoChain(speed: number): string {
  if (speed >= 0.5 && speed <= 2.0) {
    return `atempo=${speed}`;
  }

  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(',');
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
    return segments[0];
  }

  const tmpDir = ensureTmpDir();
  const listFile = new File(tmpDir, `concat_list_${Date.now()}.txt`);
  listFile.create({ overwrite: true });
  listFile.write(segments.map((segment) => `file '${escapeConcatPath(segment)}'`).join('\n'));

  const outputPath = generateOutputPath('concat');
  const command = `-f concat -safe 0 -i "${listFile.uri}" -c copy -y "${outputPath}"`;

  if (onProgress) {
    onProgress(0);
  }

  const session = await FFmpegKit.execute(command);
  FFmpegKitConfig.enableStatisticsCallback(() => undefined);
  const returnCode = await session.getReturnCode();
  deleteEntryQuietly(listFile);

  if (ReturnCode.isSuccess(returnCode)) {
    if (onProgress) {
      onProgress(100);
    }
    return outputPath;
  }

  const logs = await session.getAllLogsAsString();
  throw new Error(`Ghep clip that bai:\n${logs}`);
}

export async function exportVideo(
  state: EditorState,
  onProgress?: (percent: number) => void
): Promise<string> {
  ensureTmpDir();
  const outputPath = generateOutputPath('final');

  const inputs: string[] = [`-i "${state.videoUri}"`];
  if (state.music) {
    inputs.push(`-i "${state.music.uri}"`);
  }

  const videoFilters: string[] = [];
  if (state.trim) {
    videoFilters.push(`trim=start=${state.trim.start}:end=${state.trim.end}`);
    videoFilters.push('setpts=PTS-STARTPTS');
  }
  if (state.speed !== 1) {
    videoFilters.push(`setpts=${(1 / state.speed).toFixed(4)}*PTS`);
  }
  if (state.filter && COLOR_FILTER_PRESETS[state.filter]) {
    const preset = COLOR_FILTER_PRESETS[state.filter];
    if (preset) {
      videoFilters.push(preset);
    }
  } else if (state.filter) {
    videoFilters.push(state.filter);
  }
  if (state.text?.content.trim()) {
    videoFilters.push(
      `drawtext=text='${escapeDrawText(state.text.content)}':fontcolor=${hexToFFmpegColor(
        state.text.color
      )}:fontsize=${state.text.fontSize}:x=${Math.round(state.text.x)}:y=${Math.round(
        state.text.y
      )}:borderw=2:bordercolor=0x000000`
    );
  }

  const audioFilters: string[] = [];
  if (state.trim) {
    audioFilters.push(`atrim=start=${state.trim.start}:end=${state.trim.end}`);
    audioFilters.push('asetpts=PTS-STARTPTS');
  }
  if (state.speed !== 1) {
    audioFilters.push(buildAtempoChain(state.speed));
  }

  const hasMusic = Boolean(state.music);
  const hasVideoFilters = videoFilters.length > 0;
  const hasAudioFilters = audioFilters.length > 0;
  const shouldCopySource = !hasMusic && !hasVideoFilters && !hasAudioFilters;

  let filterComplex = '';
  let mapArgs = '';

  if (hasMusic) {
    const videoChain = hasVideoFilters
      ? `[0:v]${videoFilters.join(',')}[vout]`
      : '[0:v]copy[vout]';

    let audioSection = '';
    if (state.music!.keepOriginalAudio) {
      const originalAudioChain = hasAudioFilters
        ? `[0:a]${audioFilters.join(',')}[origA]`
        : '[0:a]acopy[origA]';
      audioSection = `${originalAudioChain};[1:a]volume=${state.music!.volume.toFixed(
        2
      )}[bgm];[origA][bgm]amix=inputs=2:duration=shortest[aout]`;
    } else if (state.trim) {
      const duration = (state.trim.end - state.trim.start) / state.speed;
      audioSection = `[1:a]volume=${state.music!.volume.toFixed(
        2
      )},atrim=start=0:end=${duration.toFixed(2)}[aout]`;
    } else {
      audioSection = `[1:a]volume=${state.music!.volume.toFixed(2)}[aout]`;
    }

    filterComplex = `-filter_complex "${videoChain};${audioSection}"`;
    mapArgs = '-map "[vout]" -map "[aout]"';
  } else if (hasVideoFilters || hasAudioFilters) {
    const videoChain = hasVideoFilters
      ? `[0:v]${videoFilters.join(',')}[vout]`
      : '[0:v]copy[vout]';
    const audioChain = hasAudioFilters
      ? `[0:a]${audioFilters.join(',')}[aout]`
      : '[0:a]acopy[aout]';
    filterComplex = `-filter_complex "${videoChain};${audioChain}"`;
    mapArgs = '-map "[vout]" -map "[aout]"';
  } else {
    mapArgs = '-c copy';
  }

  const codecArgs = shouldCopySource
    ? '-c copy'
    : '-c:v libx264 -preset ultrafast -crf 28 -s 720x1280 -c:a aac -b:a 128k';

  const command = [
    ...inputs,
    filterComplex,
    mapArgs,
    codecArgs,
    shouldCopySource ? '' : '-movflags +faststart',
    `-y "${outputPath}"`,
  ]
    .filter(Boolean)
    .join(' ');

  if (onProgress) {
    FFmpegKitConfig.enableStatisticsCallback((statistics) => {
      const timeMs = statistics.getTime();
      if (state.trim) {
        const totalMs = ((state.trim.end - state.trim.start) / state.speed) * 1000;
        if (totalMs > 0) {
          onProgress(Math.min(100, Math.round((timeMs / totalMs) * 100)));
        }
      }
    });
  }

  const session = await FFmpegKit.execute(command);
  FFmpegKitConfig.enableStatisticsCallback(() => undefined);
  const returnCode = await session.getReturnCode();

  if (ReturnCode.isSuccess(returnCode)) {
    if (onProgress) {
      onProgress(100);
    }
    return outputPath;
  }

  const logs = await session.getAllLogsAsString();
  throw new Error(`Xuat video that bai:\n${logs}`);
}

export async function generateThumbnail(videoUri: string): Promise<string> {
  const thumbFile = new File(ensureTmpDir(), `thumb_${Date.now()}.jpg`);
  const command = `-i "${videoUri}" -vframes 1 -q:v 3 -y "${thumbFile.uri}"`;
  const session = await FFmpegKit.execute(command);
  FFmpegKitConfig.enableStatisticsCallback(() => undefined);
  const returnCode = await session.getReturnCode();

  if (ReturnCode.isSuccess(returnCode)) {
    return thumbFile.uri;
  }

  throw new Error('Tao thumbnail that bai');
}

export async function cleanupTmpFiles(): Promise<void> {
  try {
    const dir = getTmpDir();
    if (dir.exists) {
      pruneTmpDir();
      dir.delete();
    }
  } catch (error) {
    console.warn('[FFmpeg] Cleanup failed:', error);
  }
}

export async function cleanupLocalFiles(uris: Array<string | null | undefined>): Promise<void> {
  uris
    .filter((uri): uri is string => Boolean(uri))
    .filter((uri, index, current) => current.indexOf(uri) === index)
    .filter((uri) => uri.startsWith('file://'))
    .filter(isLikelyTemporaryUri)
    .forEach(deleteEntryQuietly);
}
