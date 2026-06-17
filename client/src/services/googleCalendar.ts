/* Google Calendar – OAuth (GIS popup flow) + Calendar API v3 */

declare global {
  interface Window { google: any; }
}

// OAuth2 Client IDs are public (not secrets) — security relies on allowed JavaScript origins
const CLIENT_ID = '677885814313-bcfd5scho093e8cvifrha1d1nm3ojoao.apps.googleusercontent.com';

const SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_KEY = 'craft_gcal_token';

// CalendarEvent shape – mirrors the interface in CalendarView.tsx
export interface CalendarEvent {
  id:        string;
  title:     string;
  purpose:   string;
  attendees: string[];
  startTime: string;
  endTime:   string;
  color:     string;
  type:      'booking' | 'busy';
  dates:     string[]; // 'YYYY-MM-DD'
}

export interface GCalToken {
  accessToken: string;
  expiresAt:   number; // epoch ms
}

// ── GIS script loader ─────────────────────────────────────────────────────────

let _gisLoaded = false;

export function loadGIS(): Promise<void> {
  if (_gisLoaded || window.google?.accounts?.oauth2) {
    _gisLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="accounts.google.com/gsi"]');
    if (existing) {
      existing.addEventListener('load', () => { _gisLoaded = true; resolve(); });
      return;
    }
    const s = document.createElement('script');
    s.src   = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload  = () => { _gisLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

// ── Token storage ─────────────────────────────────────────────────────────────

export function getStoredToken(): GCalToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const tok: GCalToken = JSON.parse(raw);
    // Expire 2 minutes early to avoid edge-case 401s
    if (Date.now() > tok.expiresAt - 120_000) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return tok;
  } catch { return null; }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── OAuth token request (opens Google consent popup) ─────────────────────────

// ── Google Sign-In (get email/profile via userinfo) ──────────────────────────

export async function requestGoogleSignIn(): Promise<{ email: string; firstName?: string; lastName?: string }> {
  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     'openid email profile',
      callback:  (resp: any) => {
        if (resp.error) { reject(new Error(resp.error_description ?? resp.error)); return; }
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });

  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error('Failed to get Google profile');
  const info = await resp.json();
  return { email: info.email, firstName: info.given_name, lastName: info.family_name };
}

export function requestNewToken(): Promise<GCalToken> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPE,
      callback:  (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error_description ?? resp.error));
          return;
        }
        const tok: GCalToken = {
          accessToken: resp.access_token,
          expiresAt:   Date.now() + (Number(resp.expires_in) || 3600) * 1000,
        };
        localStorage.setItem(TOKEN_KEY, JSON.stringify(tok));
        resolve(tok);
      },
    });
    client.requestAccessToken();
  });
}

// ── Calendar API fetch ────────────────────────────────────────────────────────

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function convertEvent(item: any): CalendarEvent | null {
  if (item.status === 'cancelled') return null;

  const isAllDay  = !item.start?.dateTime;
  const startRaw  = item.start?.dateTime ?? item.start?.date;
  const endRaw    = item.end?.dateTime   ?? item.end?.date;
  if (!startRaw) return null;

  // Build date-key array (handles multi-day spans)
  const cur    = new Date(startRaw);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(endRaw ?? startRaw);
  endDay.setHours(0, 0, 0, 0);
  if (isAllDay) endDay.setDate(endDay.getDate() - 1); // Google end is exclusive for all-day

  const dates: string[] = [];
  while (cur <= endDay) { dates.push(toKey(new Date(cur))); cur.setDate(cur.getDate() + 1); }
  if (dates.length === 0) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return {
    id:        `gcal-${item.id}`,
    title:     item.summary || '(No title)',
    purpose:   item.description ?? '',
    attendees: (item.attendees ?? []).map((a: any) => a.displayName ?? a.email ?? '').filter(Boolean),
    startTime: isAllDay ? 'All day' : fmt(item.start.dateTime),
    endTime:   isAllDay ? ''        : fmt(item.end.dateTime),
    color:     '#4285F4', // Google blue
    type:      'booking',
    dates,
  };
}

export async function fetchGoogleEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now    = new Date();
  // 1 month back → 3 months forward gives good calendar coverage
  const tMin   = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const tMax   = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin',      tMin);
  url.searchParams.set('timeMax',      tMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy',      'startTime');
  url.searchParams.set('maxResults',   '500');

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Google Calendar API error ${resp.status}`);
  }

  const data = await resp.json();
  return (data.items ?? []).map(convertEvent).filter(Boolean) as CalendarEvent[];
}
