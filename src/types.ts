export type Album = {
  id: string;
  name: string;
  images: { url: string; width: number | null; height: number | null }[];
  release_date: string;
  album_type: "album" | "single" | "compilation";
};

export type Track = {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  track_number: number;
  artists: { id: string; name: string }[];
  album: Album;
  external_urls: { spotify: string };
};

// Passed through router state so the detail view can step through
// the same filtered/sorted order the user came from.
export type DetailNavState = { ids: string[] };

// Built from the last 50 plays in /me/player/recently-played.
// ms assumes each play ran the full track length.
export type ListeningStats = { ms: number; plays: number };

// Spotify's top-items ranges: ~4 weeks, ~6 months, ~1 year.
export type TimeRange = "short_term" | "medium_term" | "long_term";