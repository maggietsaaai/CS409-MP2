import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTracks } from "../context/TracksContext";
import type { DetailNavState, TimeRange, Track } from "../types";
import {
  formatDuration,
  formatListening,
  formatRank,
} from "../utils/formatListening";
import styles from "./DetailView.module.css";

const RANGE_LABELS: Record<TimeRange, string> = {
  short_term: "past 4 weeks",
  medium_term: "past 6 months",
  long_term: "past year",
};

function DetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { tracks, listening, topRank, timeRange, fetchTrack, error } =
    useTracks();

  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetchTrack(id).then((result) => {
      if (!cancelled) {
        setTrack(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, fetchTrack]);

  // Step through the list the user came from; fall back to every loaded song.
  const navState = location.state as DetailNavState | null;
  const ids = navState?.ids ?? tracks.map((t) => t.id);
  const index = id ? ids.indexOf(id) : -1;
  const canCycle = index !== -1 && ids.length > 1;

  function goTo(offset: number) {
    if (!canCycle) return;
    const nextIndex = (index + offset + ids.length) % ids.length;
    navigate(`/track/${ids[nextIndex]}`, { state: { ids } });
  }

  // Left/right arrow keys also move between songs.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") goTo(-1);
      if (event.key === "ArrowRight") goTo(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (loading && !track) {
    return <p className={styles.message}>Pulling the sleeve…</p>;
  }

  if (!track) {
    return (
      <div className={styles.message}>
        <p>{error ?? "This song couldn't be found."}</p>
        <Link to="/">← Back to the tracklist</Link>
      </div>
    );
  }

  const rank = topRank[track.id];

  return (
    <article className={styles.detail}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* key restarts the fade-in each time the song changes */}
      <div key={track.id} className={styles.sleeve}>
        <div className={styles.coverColumn}>
          {track.album.images[0] ? (
            <img
              className={styles.cover}
              src={track.album.images[0].url}
              alt={`${track.album.name} cover`}
            />
          ) : (
            <div className={styles.cover} aria-hidden="true" />
          )}
          <a
            className={styles.spotifyLink}
            href={track.external_urls.spotify}
            target="_blank"
            rel="noreferrer"
          >
            Play on Spotify ↗
          </a>
        </div>

        <div className={styles.notes}>
          <p className={styles.overline}>
            {rank !== undefined
              ? `No. ${formatRank(rank)} · ${RANGE_LABELS[timeRange]}`
              : "Recently played"}
          </p>
          <h2 className={styles.title}>{track.name}</h2>
          <p className={styles.artists}>
            {track.artists.map((artist) => artist.name).join(", ")}
          </p>

          <dl className={styles.credits}>
            <div className={styles.row}>
              <dt>Album</dt>
              <dd>{track.album.name}</dd>
            </div>
            <div className={styles.row}>
              <dt>Release type</dt>
              <dd className={styles.capitalize}>{track.album.album_type}</dd>
            </div>
            <div className={styles.row}>
              <dt>Released</dt>
              <dd>{track.album.release_date}</dd>
            </div>
            <div className={styles.row}>
              <dt>Track</dt>
              <dd>No. {track.track_number}</dd>
            </div>
            <div className={styles.row}>
              <dt>Length</dt>
              <dd>{formatDuration(track.duration_ms)}</dd>
            </div>
            <div className={styles.row}>
              <dt>Explicit</dt>
              <dd>{track.explicit ? "Yes" : "No"}</dd>
            </div>
            <div className={styles.row}>
              <dt>Recently</dt>
              <dd>{formatListening(listening[track.id])}</dd>
            </div>
          </dl>
        </div>
      </div>

      <nav className={styles.pager} aria-label="Song navigation">
        <button
          type="button"
          className={styles.pagerButton}
          onClick={() => goTo(-1)}
          disabled={!canCycle}
        >
          ← Previous
        </button>
        <span className={styles.position}>
          {canCycle ? `${index + 1} / ${ids.length}` : "—"}
        </span>
        <button
          type="button"
          className={styles.pagerButton}
          onClick={() => goTo(1)}
          disabled={!canCycle}
        >
          Next →
        </button>
      </nav>
    </article>
  );
}

export default DetailView;