import type { ListeningStats } from "../types";

export function formatListening(stats: ListeningStats | undefined): string {
  if (!stats) return "Not played recently";

  const totalMinutes = Math.round(stats.ms / 60000);
  const plays = `${stats.plays} ${stats.plays === 1 ? "play" : "plays"}`;

  if (totalMinutes < 1) return `<1 min · ${plays}`;
  if (totalMinutes < 60) return `${totalMinutes} min · ${plays}`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min · ${plays}`;
}

// 215000 → "3:35"
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 3 → "03"; undefined → "—" (songs that only came from recent plays).
export function formatRank(rank: number | undefined): string {
  return rank === undefined ? "—" : rank.toString().padStart(2, "0");
}