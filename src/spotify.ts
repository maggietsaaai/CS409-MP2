import axios from "axios";

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

async function createPkce() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));

    const verifier = Array.from(randomBytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");

    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier)
      );

    const challenge = btoa(
        String.fromCharCode(...new Uint8Array(hash))
      )
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    return { verifier, challenge };
}

export async function loginToSpotify() {
    sessionStorage.removeItem("spotify_access_token");  
    const { verifier, challenge } = await createPkce();
    const state = crypto.randomUUID();

    sessionStorage.setItem("spotify_verifier", verifier);
    sessionStorage.setItem("spotify_state", state);

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        code_challenge_method: "S256",
        code_challenge: challenge,
        state,
        scope: "user-top-read user-read-recently-played",
    });

    window.location.href =
        `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getAccessToken() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const verifier = sessionStorage.getItem("spotify_verifier");

    if (
        !code ||
        !verifier ||
        !state ||
        state !== sessionStorage.getItem("spotify_state")
    ) {
        throw new Error("Please log in to Spotify again.");
    }

    const response = await axios.post<{ access_token: string }>(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          client_id: clientId,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
      }),
      {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
}