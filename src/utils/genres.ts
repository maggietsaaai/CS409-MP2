import type { Track } from "../types";

// A song's genres are the combined genres of its artists.
export function genresOf(
  track: Track,
  artistGenres: Record<string, string[]>
): string[] {
  const genres = new Set<string>();
  for (const artist of track.artists) {
    for (const genre of artistGenres[artist.id] ?? []) genres.add(genre);
  }
  return Array.from(genres);
}