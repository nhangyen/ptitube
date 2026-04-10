/**
 * Bundled background music metadata.
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre: string;
  source: any;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "track_01",
    title: "Pulse Drive",
    artist: "Bundled Loop",
    duration: 12,
    genre: "Pop",
    source: require("../assets/music/pulse-drive.wav"),
  },
  {
    id: "track_02",
    title: "Soft Breeze",
    artist: "Bundled Loop",
    duration: 12,
    genre: "Lofi",
    source: require("../assets/music/soft-breeze.wav"),
  },
  {
    id: "track_03",
    title: "Sunlit Guitar",
    artist: "Bundled Loop",
    duration: 12,
    genre: "Acoustic",
    source: require("../assets/music/sunlit-guitar.wav"),
  },
  {
    id: "track_04",
    title: "Cinematic Rise",
    artist: "Bundled Loop",
    duration: 12,
    genre: "Cinematic",
    source: require("../assets/music/cinematic-rise.wav"),
  },
];

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
