import { useEffect } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { TracksProvider, useTracks } from "./context/TracksContext";
import { loginToSpotify } from "./spotify";
import ListView from "./pages/ListView";
import GalleryView from "./pages/GalleryView";
import DetailView from "./pages/DetailView";
import type { TimeRange } from "./types";
import styles from "./App.module.css";

function Header() {
  const { isLoggedIn, loadTracks, status, error, timeRange, changeTimeRange } =
    useTracks();

  return (
    <header className={styles.header}>
      <div className={styles.masthead}>
        <p className={styles.kicker}>Liner notes for your listening</p>
        <h1 className={styles.title}>Spotify Explorer</h1>
      </div>

      {isLoggedIn && (
        <div className={styles.toolbar}>
          <nav className={styles.nav}>
            <NavLink to="/" end className={styles.navLink}>
              Tracklist
            </NavLink>
            <NavLink to="/gallery" className={styles.navLink}>
              Gallery
            </NavLink>
          </nav>

          <div className={styles.actions}>
            <label className={styles.range}>
              <span>Top songs from</span>
              <select
                value={timeRange}
                onChange={(event) =>
                  changeTimeRange(event.target.value as TimeRange)
                }
              >
                <option value="short_term">Past 4 weeks</option>
                <option value="medium_term">Past 6 months</option>
                <option value="long_term">Past year</option>
              </select>
            </label>
            <button
              type="button"
              className={styles.refresh}
              onClick={loadTracks}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </header>
  );
}

function Welcome() {
  return (
    <section className={styles.welcome}>
      <p className={styles.welcomeKicker}>Side A · Your top songs</p>
      <h2 className={styles.welcomeTitle}>
        Every record comes with notes. <em>Here are yours.</em>
      </h2>
      <p className={styles.welcomeText}>
        Log in with Spotify to see the songs you've played most over the past
        month, six months, or year, ranked and laid out like a tracklist.
      </p>
      <button type="button" className={styles.loginButton} onClick={loginToSpotify}>
        Log in with Spotify
      </button>
    </section>
  );
}

function Pages() {
  const { isLoggedIn, status, loadTracks } = useTracks();

  // Load songs as soon as the user is logged in.
  useEffect(() => {
    if (isLoggedIn && status === "idle") void loadTracks();
  }, [isLoggedIn, status, loadTracks]);

  if (!isLoggedIn) return <Welcome />;

  return (
    <Routes>
      <Route path="/" element={<ListView />} />
      <Route path="/gallery" element={<GalleryView />} />
      <Route path="/track/:id" element={<DetailView />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TracksProvider>
        <div className={styles.page}>
          <Header />
          <main>
            <Pages />
          </main>
          <footer className={styles.footer}>
            Data from the Spotify Web API
          </footer>
        </div>
      </TracksProvider>
    </BrowserRouter>
  );
}

export default App;