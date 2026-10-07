import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { getAccessToken } from "../spotify";
import type { ListeningStats, TimeRange, Track } from "../types";

const TOKEN_KEY = "spotify_access_token";
type Status = "idle" | "loading" | "ready" | "error";

type TracksContextValue = {
  tracks: Track[];
  listening: Record<string, ListeningStats>;
  listeningError: string | null;
  topRank: Record<string, number>;
  timeRange: TimeRange;
  changeTimeRange: (range: TimeRange) => void;
  status: Status;
  error: string | null;
  isLoggedIn: boolean;
  loadTracks: () => Promise<void>;
  fetchTrack: (id: string) => Promise<Track | null>;
};

const TracksContext = createContext<TracksContextValue | null>(null);

type TopTracksResponse = { items: Track[] };
type RecentlyPlayedResponse = { items: { played_at: string; track: Track }[] };

export function TracksProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [listening, setListening] = useState<Record<string, ListeningStats>>({});
  const [listeningError, setListeningError] = useState<string | null>(null);
  const [topRank, setTopRank] = useState<Record<string, number>>({});
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) !== null
  );

  const getToken = useCallback(async () => {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = await getAccessToken();
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    setIsLoggedIn(true);
    return token;
  }, []);

  // Finishes the login when Spotify redirects back with ?code=... in the URL.
  // The ref stops React's dev-mode double effect from using the code twice
  // (Spotify rejects a code the second time).
  const handledRedirect = useRef(false);
  useEffect(() => {
    if (handledRedirect.current) return;
    handledRedirect.current = true;

    const params = new URLSearchParams(window.location.search);
    const clearQuery = () =>
      window.history.replaceState(null, "", window.location.pathname);

    if (params.has("error")) {
      setError("Spotify login was cancelled.");
      clearQuery();
      return;
    }
    if (!params.has("code") || sessionStorage.getItem(TOKEN_KEY)) return;

    getAccessToken()
      .then((token) => {
        sessionStorage.setItem(TOKEN_KEY, token);
        setIsLoggedIn(true);
      })
      .catch((err) => {
        console.error("Spotify login failed:", err);
        setError("Spotify login failed. Please try again.");
      })
      .finally(clearQuery);
  }, []);

  // Turns a failed request into a message for the UI. A 401 means the
  // token expired, so it is cleared and the user is asked to log in again.
  const handleError = useCallback((err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      setIsLoggedIn(false);
      return "Your Spotify session expired. Please log in again.";
    }
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      return "Spotify is rate-limiting requests. Try again in a minute.";
    }
    return "Could not load songs from Spotify.";
  }, []);

  const fetchAndStore = useCallback(async (range: TimeRange) => {
    setStatus("loading");
    setError(null);
    setListeningError(null);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const topResponse = await axios.get<TopTracksResponse>(
        "https://api.spotify.com/v1/me/top/tracks",
        { headers, params: { time_range: range, limit: 50 } }
      );
      const trackMap = new Map<string, Track>(
        topResponse.data.items.map((track) => [track.id, track])
      );
      // Spotify returns top tracks already ordered, so position = rank.
      const ranks: Record<string, number> = {};
      topResponse.data.items.forEach((track, index) => {
        ranks[track.id] = index + 1;
      });

      // Listening time is optional: if this request fails (e.g. the token
      // lacks the user-read-recently-played scope), the songs still load.
      const stats: Record<string, ListeningStats> = {};
      try {
        const recentResponse = await axios.get<RecentlyPlayedResponse>(
          "https://api.spotify.com/v1/me/player/recently-played",
          { headers, params: { limit: 50 } }
        );
        for (const { track } of recentResponse.data.items) {
          // if (!trackMap.has(track.id)) trackMap.set(track.id, track);
          const current = stats[track.id] ?? { ms: 0, plays: 0 };
          stats[track.id] = {
            ms: current.ms + track.duration_ms,
            plays: current.plays + 1,
          };
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setListeningError(
            "Listening time needs the user-read-recently-played permission. Log in again to grant it."
          );
        } else {
          setListeningError("Could not load recent listening time.");
        }
      }

      setTracks(Array.from(trackMap.values()));
      setListening(stats);
      setTopRank(ranks);
      setStatus("ready");
    } catch (err) {
      setError(handleError(err));
      setStatus("error");
    }
  }, [getToken, handleError]);

  const loadTracks = useCallback(
    () => fetchAndStore(timeRange),
    [fetchAndStore, timeRange]
  );

  // Switching the range reloads right away if songs are already showing.
  const changeTimeRange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      if (status !== "idle") void fetchAndStore(range);
    },
    [fetchAndStore, status]
  );

  // Used when the detail page is opened by URL and the song is not cached.
  const fetchTrack = useCallback(
    async (id: string) => {
      const cached = tracks.find((track) => track.id === id);
      if (cached) return cached;
      try {
        const token = await getToken();
        const response = await axios.get<Track>(
          `https://api.spotify.com/v1/tracks/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
      } catch (err) {
        setError(handleError(err));
        return null;
      }
    },
    [tracks, getToken, handleError]
  );

  return (
    <TracksContext.Provider
      value={{
        tracks,
        listening,
        listeningError,
        topRank,
        timeRange,
        changeTimeRange,
        status,
        error,
        isLoggedIn,
        loadTracks,
        fetchTrack,
      }}
    >
      {children}
    </TracksContext.Provider>
  );
}

export function useTracks() {
  const context = useContext(TracksContext);
  if (!context) {
    throw new Error("useTracks must be used inside <TracksProvider>");
  }
  return context;
}