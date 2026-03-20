const SAAVN_API_BASE = 'https://jiosaavn-api-rho-liart.vercel.app';

async function jsonFetch(url, { signal } = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.detail || data?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function searchSaavnSongs(query, { lyrics = false, songdata = true, signal } = {}) {
  const q = (query || '').trim();
  if (!q) return [];

  const params = new URLSearchParams({
    query: q,
    lyrics: String(Boolean(lyrics)),
    songdata: String(Boolean(songdata)),
  });

  const url = `${SAAVN_API_BASE}/song/?${params.toString()}`;
  const rows = await jsonFetch(url, { signal });
  return Array.isArray(rows) ? rows : [];
}

export async function getSaavnPlaylist(query, { lyrics = false, signal } = {}) {
  const q = (query || '').trim();
  if (!q) return null;

  const candidates = [];

  // Most API deployments accept full playlist URL or ID
  candidates.push(q);

  // If user pasted a Saavn/JioSaavn playlist URL, also try extracting the playlist token/id
  try {
    const u = new URL(q);
    const parts = u.pathname.split('/').filter(Boolean);
    // Expected: /s/playlist/<hash>/<name>/<token>
    const token = parts.at(-1);
    if (token && token.length >= 6) candidates.push(token);
  } catch (_) {}

  const seen = new Set();
  for (const cand of candidates) {
    if (!cand || seen.has(cand)) continue;
    seen.add(cand);
    const params = new URLSearchParams({
      query: cand,
      lyrics: String(Boolean(lyrics)),
    });
    const url = `${SAAVN_API_BASE}/playlist/?${params.toString()}`;
    try {
      const data = await jsonFetch(url, { signal });
      if (data) return data;
    } catch (_) {
      // try next candidate
    }
  }

  return null;
}

