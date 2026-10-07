import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTracks } from "../context/TracksContext";
import { formatRank } from "../utils/formatListening";
import styles from "./GalleryView.module.css";

const RELEASE_TYPES = [
  { id: "album", label: "Album" },
  { id: "single", label: "Single" },
  { id: "compilation", label: "Compilation" },
] as const;

const RANK_BRACKETS = [
  { id: "top10", label: "Top 10", min: 1, max: 10 },
  { id: "top25", label: "Top 11–25", min: 11, max: 25 },
  { id: "top50", label: "Top 26–50", min: 26, max: 50 },
] as const;

const RANGE_LABELS = {
  short_term: "past 4 weeks",
  medium_term: "past 6 months",
  long_term: "past year",
} as const;

// Turns a Set into a new Set with `value` added or removed.
function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function GalleryView() {
  const { tracks, status, topRank, timeRange } = useTracks();
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedBrackets, setSelectedBrackets] = useState<Set<string>>(new Set());

  // How many loaded songs come from each release type, shown on the chips.
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const track of tracks) {
      counts[track.album.album_type] = (counts[track.album.album_type] ?? 0) + 1;
    }
    return counts;
  }, [tracks]);

  function bracketOf(trackId: string): string | null {
    const rank = topRank[trackId];
    if (rank === undefined) return null;
    return RANK_BRACKETS.find((b) => rank >= b.min && rank <= b.max)?.id ?? null;
  }

  // Within a group, any selected value matches (OR).
  // Across groups, a song must match both groups (AND).
  const visibleTracks = tracks
    .filter((track) => {
      const typeMatch =
        selectedTypes.size === 0 || selectedTypes.has(track.album.album_type);
      const bracket = bracketOf(track.id);
      const rankMatch =
        selectedBrackets.size === 0 ||
        (bracket !== null && selectedBrackets.has(bracket));
      return typeMatch && rankMatch;
    })
    // Show the gallery in rank order; unranked songs go last.
    .sort((a, b) => (topRank[a.id] ?? Infinity) - (topRank[b.id] ?? Infinity));

  const visibleIds = visibleTracks.map((track) => track.id);
  const hasFilters = selectedTypes.size > 0 || selectedBrackets.size > 0;

  function clearFilters() {
    setSelectedTypes(new Set());
    setSelectedBrackets(new Set());
  }

  if (status !== "ready" && tracks.length === 0) {
    return <p className={styles.message}>Pulling the records…</p>;
  }

  return (
    <section className={styles.gallery}>
      <div className={styles.filters}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            Your top rank · {RANGE_LABELS[timeRange]}
          </legend>
          <div className={styles.chips}>
            {RANK_BRACKETS.map((bracket) => (
              <button
                key={bracket.id}
                type="button"
                className={styles.chip}
                aria-pressed={selectedBrackets.has(bracket.id)}
                onClick={() =>
                  setSelectedBrackets(toggle(selectedBrackets, bracket.id))
                }
              >
                {bracket.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend className={styles.legend}>Release type</legend>
          <div className={styles.chips}>
            {RELEASE_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={styles.chip}
                aria-pressed={selectedTypes.has(type.id)}
                disabled={!typeCounts[type.id]}
                onClick={() => setSelectedTypes(toggle(selectedTypes, type.id))}
              >
                {type.label} <span className={styles.count}>{typeCounts[type.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.summary}>
        <span>
          {visibleTracks.length} of {tracks.length} sleeves
        </span>
        {hasFilters && (
          <button type="button" className={styles.clear} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {visibleTracks.length === 0 ? (
        <p className={styles.message}>No sleeves match these filters.</p>
      ) : (
        <ul className={styles.grid}>
          {visibleTracks.map((track) => (
            <li key={track.id}>
              <Link
                to={`/track/${track.id}`}
                state={{ ids: visibleIds }}
                className={styles.card}
              >
                <div className={styles.sleeve}>
                  {track.album.images[0] ? (
                    <img
                      className={styles.cover}
                      src={track.album.images[0].url}
                      alt={`${track.album.name} cover`}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.placeholder} aria-hidden="true">
                      ♪
                    </div>
                  )}
                </div>
                <span className={styles.caption}>
                  <span className={styles.number}>
                    No. {formatRank(topRank[track.id])}
                  </span>
                  <span className={styles.title}>{track.name}</span>
                  <span className={styles.artist}>
                    {track.artists.map((artist) => artist.name).join(", ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default GalleryView;