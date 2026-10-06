// Session-timeout settings shared by IdleTimeout and AuthContext.
// Change the idle limit with VITE_IDLE_TIMEOUT_MINUTES in frontend/.env (default 15).
const minutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES) || 15;

export const IDLE_MS = minutes * 60_000;                  // idle time before sign-out
export const WARN_MS = Math.min(60_000, IDLE_MS / 2);     // the "Still there?" countdown
export const IDLE_MINUTES = minutes;
export const ACTIVITY_KEY = 'ecotrack:last-activity';     // shared by every open tab
