import { useState } from "react";
import { Link } from "react-router-dom";
import { useTracks } from "../context/TracksContext";
import {
  formatDuration,
  formatListening,
  formatRank,
} from "../utils/formatListening";
import styles from "./ListView.module.css";

type SortKey = "rank" | "name" | "release_date" | "duration" | "listening";
type SortOrder = "asc" | "desc";

function ListView() {
  const { tracks, listening, listeningError, topRank, status } = useTracks();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const searchQuery = query.trim().toLowerCase();

  const visibleTracks = tracks
    .filter(
      (track) =>
        track.name.toLowerCase().includes(searchQuery) ||
        track.artists.some((artist) =>
          artist.name.toLowerCase().includes(searchQuery)
        )
    )
    .sort((a, b) => {
      if (sortBy === "rank") {
        // Songs only found in recent plays have no rank; keep them last
        // in either order.
        const rankA = topRank[a.id];
        const rankB = topRank[b.id];
        if (rankA === undefined && rankB === undefined) {
          return a.name.localeCompare(b.name);
        }
        if (rankA === undefined) return 1;
        if (rankB === undefined) return -1;
        return sortOrder === "asc" ? rankA - rankB : rankB - rankA;
      }

      let comparison: number;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "release_date") {
        comparison = a.album.release_date.localeCompare(b.album.release_date);
      } else if (sortBy === "duration") {
        comparison = a.duration_ms - b.duration_ms;
      } else {
        comparison = (listening[a.id]?.ms ?? 0) - (listening[b.id]?.ms ?? 0);
      }
      if (comparison === 0) comparison = a.name.localeCompare(b.name);
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const visibleIds = visibleTracks.map((track) => track.id);

  return (
    <section className={styles.listView}>
      <div className={styles.controls}>
        <label className={`${styles.field} ${styles.search}`}>
          <span className={styles.label}>Search</span>
          <input
            type="search"
            placeholder="A song or an artist…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => {
              const key = event.target.value as SortKey;
              setSortBy(key);
              // Natural default directions for these two sorts.
              if (key === "listening") setSortOrder("desc");
              if (key === "rank") setSortOrder("asc");
            }}
          >
            <option value="rank">Your top rank</option>
            <option value="name">Song name</option>
            <option value="release_date">Release date</option>
            <option value="duration">Song length</option>
            <option value="listening">Recent listening time</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Order</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>

      <div className={styles.listHeader}>
        <span>
          {status === "ready"
            ? `${visibleTracks.length} of ${tracks.length} tracks`
            : "Tracklist"}
        </span>
        <span>{listeningError ?? "Listening time: last 50 plays, full plays assumed"}</span>
      </div>

      {status === "loading" && <p className={styles.message}>Pulling the record…</p>}
      {status === "ready" && visibleTracks.length === 0 && (
        <p className={styles.message}>Nothing on this record matches “{query}”.</p>
      )}

      <ol className={styles.list}>
        {visibleTracks.map((track) => (
          <li key={track.id}>
            <Link
              to={`/track/${track.id}`}
              state={{ ids: visibleIds }}
              className={styles.item}
            >
              <span className={styles.number}>{formatRank(topRank[track.id])}</span>
              {track.album.images[0] ? (
                <img
                  className={styles.thumb}
                  src={track.album.images[track.album.images.length - 1].url}
                  alt=""
                />
              ) : (
                <span className={styles.thumb} aria-hidden="true" />
              )}
              <span className={styles.body}>
                <span className={styles.line}>
                  <span className={styles.name}>{track.name}</span>
                  <span className={styles.leader} aria-hidden="true" />
                  <span className={styles.duration}>
                    {formatDuration(track.duration_ms)}
                  </span>
                </span>
                <span className={styles.sub}>
                  {track.artists.map((artist) => artist.name).join(", ")} ·{" "}
                  {track.album.release_date.slice(0, 4)}
                  <span className={styles.listening}>
                    {formatListening(listening[track.id])}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default ListView;