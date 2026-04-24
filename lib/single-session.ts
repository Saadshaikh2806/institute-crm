export const SESSION_TOKEN_COOKIE = "crm_session_token"

export function createSessionToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getBrowserSessionToken() {
  if (typeof document === "undefined") return null

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_TOKEN_COOKIE}=`))

  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null
}

export function setBrowserSessionToken(token: string) {
  document.cookie = `${SESSION_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=2592000; samesite=lax`
}

export function clearBrowserSessionToken() {
  document.cookie = `${SESSION_TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`
}
