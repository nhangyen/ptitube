/**
 * FFmpeg Service — Xử lý video on-device (Single-Pass Render)
 *
 * Sử dụng ffmpeg-kit-react-native để:
 * - Ghép nhiều clip (concat segments)
 * - Cắt xén (trim)
 * - Thay đổi tốc độ (speed control)
 * - Ghép nhạc (audio mix)
 * - Chèn chữ (text overlay / drawtext)
 * - Áp dụng bộ lọc màu (color filters)
 *
 * Tất cả hiệu ứng được kết hợp thành MỘT lệnh FFmpeg duy nhất.
 */

import { FFmpegKit, FFmpegKitConfig, ReturnCode } from '@wokcito/ffmpeg-kit-react-native';
import { Paths, File, Directory } from 'expo-file-system';

// ======================== TYPES ========================

export interface TrimParams {
  start: number; // giây
  end: number;   // giây
}

export interface MusicParams {
  uri: string;       // đường dẫn file nhạc
  volume: number;    // 0.0 - 1.0
  keepOriginalAudio: boolean;
}

export interface TextParams {
  content: string;
  color: string;     // hex color, ví dụ: '#FFFFFF'
  fontSize: number;  // pixel
  x: number;         // pixel position
  y: number;         // pixel position
}

export interface EditorState {
  videoUri: string;
  trim: TrimParams | null;
  music: MusicParams | null;
  speed: number;       // 0.5 | 1 | 1.5 | 2
  text: TextParams | null;
  filter: string | null; // FFmpeg filter string
}

// ======================== COLOR FILTER PRESETS ========================

export const COLOR_FILTER_PRESETS: Record<string, string> = {
  none: '',
  grayscale: 'hue=s=0',
  vivid: 'eq=saturation=1.5:contrast=1.2',
  autumn: 'colorbalance=rs=0.15:gs=-0.05:bs=-0.15,eq=saturation=1.3',
  vintage: 'curves=vintage',
  cool: 'colorbalance=rs=-0.1:gs=0.05:bs=0.2,eq=brightness=0.05',
};

// ======================== HELPERS ========================

function getTmpDir(): Directory {
  return new Directory(Paths.cache, 'ffmpeg_tmp');
}

function ensureTmpDir(): Directory {
  const dir = getTmpDir();
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function generateOutputPath(prefix: string = 'output'): string {
  const dir = ensureTmpDir();
  const ts = Date.now();
  const file = new File(dir, `${prefix}_${ts}.mp4`);
  return file.uri;
}

/**
 * Chuyển hex color (#FFFFFF) sang format FFmpeg (0xFFFFFF hoặc white)
 */
function hexToFFmpegColor(hex: string): string {
  if (!hex) return '0xFFFFFF';
  // Bỏ dấu # và thêm 0x prefix
  const clean = hex.replace('#', '');
  return `0x${clean}`;
}

/**
 * Escape text cho FFmpeg drawtext filter
 */
function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, '\\\\:')
    .replace(/%/g, '%%');
}

/**
 * Tạo atempo filter chain cho tốc độ ngoài range 0.5-2.0
 * atempo chỉ hỗ trợ 0.5 – 2.0, nên cần chain nếu cần thiết.
 * Với range 0.5-2.0 hiện tại, chỉ cần 1 filter.
 */
function buildAtempoChain(speed: number): string {
  if (speed >= 0.5 && speed <= 2.0) {
    return `atempo=${speed}`;
  }
  // Fallback: chain multiple atempo filters
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

// ======================== MAIN FUNCTIONS ========================

/**
 * Ghép nhiều clip thành 1 file duy nhất (concat demuxer, không re-encode)
 */
export async function concatSegments(
  segments: string[],
  onProgress?: (percent: number) => void
): Promise<string> {
  if (segments.length === 0) throw new Error('Không có clip nào để ghép');
  if (segments.length === 1) return segments[0];

  const tmpDir = ensureTmpDir();

  // Tạo file danh sách cho concat demuxer
  const listFile = new File(tmpDir, `concat_list_${Date.now()}.txt`);
  const listContent = segments.map((s) => `file '${s}'`).join('\n');
  listFile.create();
  listFile.write(listContent);

  const outputPath = generateOutputPath('concat');

  const command = `-f concat -safe 0 -i "${listFile.uri}" -c copy -y "${outputPath}"`;

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  // Dọn file tạm
  try { listFile.delete(); } catch (_) {}

  if (ReturnCode.isSuccess(returnCode)) {
    return outputPath;
  } else {
    const logs = await session.getAllLogsAsString();
    throw new Error(`Ghép clip thất bại:\n${logs}`);
  }
}

/**
 * Xuất video với tất cả hiệu ứng — Single-Pass Render
 */
export async function exportVideo(
  state: EditorState,
  onProgress?: (percent: number) => void
): Promise<string> {
  ensureTmpDir();
  const outputPath = generateOutputPath('final');

  // ===== XÂY DỰNG INPUT =====
  const inputs: string[] = [`-i "${state.videoUri}"`];
  if (state.music) {
    inputs.push(`-i "${state.music.uri}"`);
  }

  // ===== XÂY DỰNG VIDEO FILTER CHAIN =====
  const vFilters: string[] = [];

  // 1. Trim
  if (state.trim) {
    vFilters.push(`trim=start=${state.trim.start}:end=${state.trim.end}`);
    vFilters.push('setpts=PTS-STARTPTS');
  }

  // 2. Speed (chỉ áp dụng nếu không phải 1x)
  if (state.speed !== 1) {
    const ptsFactor = (1 / state.speed).toFixed(4);
    vFilters.push(`setpts=${ptsFactor}*PTS`);
  }

  // 3. Color filter
  if (state.filter && state.filter !== '' && COLOR_FILTER_PRESETS[state.filter]) {
    const filterStr = COLOR_FILTER_PRESETS[state.filter];
    if (filterStr) {
      vFilters.push(filterStr);
    }
  } else if (state.filter && !COLOR_FILTER_PRESETS[state.filter]) {
    // Nếu truyền vào filter string trực tiếp
    vFilters.push(state.filter);
  }

  // 4. Text overlay
  if (state.text && state.text.content.trim()) {
    const escapedText = escapeDrawText(state.text.content);
    const color = hexToFFmpegColor(state.text.color);
    const drawtext = `drawtext=text='${escapedText}':fontcolor=${color}:fontsize=${state.text.fontSize}:x=${Math.round(state.text.x)}:y=${Math.round(state.text.y)}:borderw=2:bordercolor=0x000000`;
    vFilters.push(drawtext);
  }

  // ===== XÂY DỰNG AUDIO FILTER CHAIN =====
  const aFilters: string[] = [];

  // 1. Trim audio
  if (state.trim) {
    aFilters.push(`atrim=start=${state.trim.start}:end=${state.trim.end}`);
    aFilters.push('asetpts=PTS-STARTPTS');
  }

  // 2. Speed audio
  if (state.speed !== 1) {
    aFilters.push(buildAtempoChain(state.speed));
  }

  // ===== XÂY DỰNG FILTER_COMPLEX =====
  let filterComplex = '';
  let mapArgs = '';

  const hasMusic = state.music !== null;
  const hasVideoFilters = vFilters.length > 0;
  const hasAudioFilters = aFilters.length > 0;

  if (hasMusic) {
    // Có nhạc nền — cần filter_complex
    const vChain = hasVideoFilters
      ? `[0:v]${vFilters.join(',')}[vout]`
      : `[0:v]copy[vout]`;

    let audioSection = '';
    if (state.music!.keepOriginalAudio) {
      // Mix audio gốc + nhạc nền
      const origAudioChain = hasAudioFilters
        ? `[0:a]${aFilters.join(',')}[origA]`
        : `[0:a]acopy[origA]`;
      const musicVolume = state.music!.volume.toFixed(2);
      audioSection = `${origAudioChain};[1:a]volume=${musicVolume}[bgm];[origA][bgm]amix=inputs=2:duration=shortest[aout]`;
    } else {
      // Chỉ dùng nhạc nền, bỏ audio gốc
      const musicVolume = state.music!.volume.toFixed(2);
      // Vẫn cần trim/speed nhạc theo video duration
      if (state.trim) {
        const musicDuration = (state.trim.end - state.trim.start) / state.speed;
        audioSection = `[1:a]volume=${musicVolume},atrim=start=0:end=${musicDuration.toFixed(2)}[aout]`;
      } else {
        audioSection = `[1:a]volume=${musicVolume}[aout]`;
      }
    }

    filterComplex = `-filter_complex "${vChain};${audioSection}"`;
    mapArgs = '-map "[vout]" -map "[aout]"';
  } else if (hasVideoFilters || hasAudioFilters) {
    // Không có nhạc — dùng -vf và -af riêng hoặc filter_complex
    const vChain = hasVideoFilters
      ? `[0:v]${vFilters.join(',')}[vout]`
      : `[0:v]copy[vout]`;
    const aChain = hasAudioFilters
      ? `[0:a]${aFilters.join(',')}[aout]`
      : `[0:a]acopy[aout]`;

    filterComplex = `-filter_complex "${vChain};${aChain}"`;
    mapArgs = '-map "[vout]" -map "[aout]"';
  } else {
    // Không có filter nào → copy thẳng
    mapArgs = '-c copy';
  }

  // ===== XÂY DỰNG COMMAND HOÀN CHỈNH =====
  const command = [
    ...inputs,
    filterComplex,
    mapArgs,
    filterComplex ? '-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k' : '',
    '-movflags +faststart',
    `-y "${outputPath}"`,
  ]
    .filter(Boolean)
    .join(' ');

  console.log('[FFmpeg] Command:', command);

  // ===== THỰC THI =====
  // Enable statistics callback for progress
  if (onProgress) {
    FFmpegKitConfig.enableStatisticsCallback((statistics) => {
      const timeMs = statistics.getTime();
      if (state.trim) {
        const totalMs = ((state.trim.end - state.trim.start) / state.speed) * 1000;
        if (totalMs > 0) {
          const percent = Math.min(100, Math.round((timeMs / totalMs) * 100));
          onProgress(percent);
        }
      }
    });
  }

  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (ReturnCode.isSuccess(returnCode)) {
    return outputPath;
  } else {
    const logs = await session.getAllLogsAsString();
    throw new Error(`Xuất video thất bại:\n${logs}`);
  }
}

/**
 * Tạo thumbnail từ video (frame đầu tiên)
 */
export async function generateThumbnail(videoUri: string): Promise<string> {
  const tmpDir = ensureTmpDir();
  const thumbFile = new File(tmpDir, `thumb_${Date.now()}.jpg`);
  const outputPath = thumbFile.uri;

  const command = `-i "${videoUri}" -vframes 1 -q:v 3 -y "${outputPath}"`;
  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();

  if (ReturnCode.isSuccess(returnCode)) {
    return outputPath;
  } else {
    throw new Error('Tạo thumbnail thất bại');
  }
}

/**
 * Dọn dẹp file tạm trong thư mục FFmpeg
 */
export async function cleanupTmpFiles(): Promise<void> {
  try {
    const dir = getTmpDir();
    if (dir.exists) {
      dir.delete();
    }
  } catch (e) {
    console.warn('[FFmpeg] Cleanup failed:', e);
  }
}
