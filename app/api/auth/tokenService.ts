// Token service: keep access token in memory (and mirror to localStorage for compatibility)
// and persist refresh token in localStorage.

let inMemoryAccessToken: string | null = null;

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setAccessToken(token: string): void {
  inMemoryAccessToken = token;
  // Mirror to localStorage for existing consumers (e.g., components reading from localStorage)
  if (hasWindow()) {
    try {
      window.localStorage.setItem("access_token", token);
    } catch {}
  }
}

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (hasWindow()) {
    try {
      return window.localStorage.getItem("access_token");
    } catch {
      return null;
    }
  }
  return null;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
  if (hasWindow()) {
    try {
      window.localStorage.removeItem("access_token");
    } catch {}
  }
}

export function setRefreshToken(token: string): void {
  if (hasWindow()) {
    try {
      window.localStorage.setItem("refresh_token", token);
    } catch {}
  }
}

export function getRefreshToken(): string | null {
  if (hasWindow()) {
    try {
      return window.localStorage.getItem("refresh_token");
    } catch {
      return null;
    }
  }
  return null;
}

export function clearRefreshToken(): void {
  if (hasWindow()) {
    try {
      window.localStorage.removeItem("refresh_token");
    } catch {}
  }
}


