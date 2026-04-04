/**
 * Kho nhạc nền mock — Bundle sẵn trong app
 *
 * Lưu ý: Trong production, các file MP3 thật sẽ nằm trong assets/music/.
 * Ở đây ta define metadata và require() asset. Vì chưa có file MP3 thật,
 * ta dùng placeholder URI — bạn cần thêm file .mp3 vào assets/music/ rồi
 * uncomment dòng require tương ứng.
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // giây
  genre: string;
  /** require() tới file MP3 trong assets, hoặc URI */
  source: any;
}

/**
 * Danh sách nhạc nền phi thương mại (Creative Commons / Royalty-Free)
 *
 * Để sử dụng thật, hãy:
 * 1. Tải file MP3 royalty-free vào mobile-app/assets/music/
 * 2. Thay source bằng require('../assets/music/ten-file.mp3')
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track_01',
    title: 'Nhịp Sống Vui',
    artist: 'Unknown Artist',
    duration: 120,
    genre: 'Pop',
    source: null, // require('../assets/music/upbeat-pop.mp3')
  },
  {
    id: 'track_02',
    title: 'Chill Lofi',
    artist: 'Unknown Artist',
    duration: 150,
    genre: 'Lofi',
    source: null, // require('../assets/music/chill-lofi.mp3')
  },
  {
    id: 'track_03',
    title: 'Guitar Nhẹ Nhàng',
    artist: 'Unknown Artist',
    duration: 90,
    genre: 'Acoustic',
    source: null, // require('../assets/music/acoustic-guitar.mp3')
  },
  {
    id: 'track_04',
    title: 'Vui Vẻ Ukulele',
    artist: 'Unknown Artist',
    duration: 100,
    genre: 'Happy',
    source: null, // require('../assets/music/happy-ukulele.mp3')
  },
  {
    id: 'track_05',
    title: 'Điện Ảnh Hoành Tráng',
    artist: 'Unknown Artist',
    duration: 180,
    genre: 'Cinematic',
    source: null, // require('../assets/music/cinematic-epic.mp3')
  },
  {
    id: 'track_06',
    title: 'Hè Nhiệt Đới',
    artist: 'Unknown Artist',
    duration: 110,
    genre: 'Tropical',
    source: null, // require('../assets/music/tropical-summer.mp3')
  },
  {
    id: 'track_07',
    title: 'Piano Thư Giãn',
    artist: 'Unknown Artist',
    duration: 140,
    genre: 'Piano',
    source: null, // require('../assets/music/piano-soft.mp3')
  },
  {
    id: 'track_08',
    title: 'Hip Hop Beat',
    artist: 'Unknown Artist',
    duration: 130,
    genre: 'Hip Hop',
    source: null, // require('../assets/music/hip-hop-beat.mp3')
  },
];

/**
 * Format thời lượng dạng mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
