export interface SessionRecord {
  id: string;
  gameSlug: string;
  gameName: string;
  score: number;
  accuracy: number; // 0–1
  durationMs: number;
  playedAt: string; // ISO
}

const KEY = "nf:sessions";

export function loadSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(record: Omit<SessionRecord, "id" | "playedAt">): SessionRecord {
  const sessions = loadSessions();
  const full: SessionRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    playedAt: new Date().toISOString(),
  };
  sessions.push(full);
  // keep last 200 sessions
  if (sessions.length > 200) sessions.splice(0, sessions.length - 200);
  localStorage.setItem(KEY, JSON.stringify(sessions));
  return full;
}

export const GAME_NAMES: Record<string, string> = {
  boxing: "Arena Boxing",
  "color-pattern": "Color Pattern",
  "quick-math": "Quick Math",
  "math-training": "Math Training",
  "number-sequence": "Number Sequence",
};

/** Stats per game slug across all sessions */
export interface GameStats {
  slug: string;
  name: string;
  sessions: number;
  avgAccuracy: number;
  avgScore: number;
  bestScore: number;
  totalDurationMs: number;
}

export function computeGameStats(sessions: SessionRecord[]): GameStats[] {
  const map = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const arr = map.get(s.gameSlug) ?? [];
    arr.push(s);
    map.set(s.gameSlug, arr);
  }
  return Array.from(map.entries()).map(([slug, recs]) => ({
    slug,
    name: recs[0]?.gameName ?? GAME_NAMES[slug] ?? slug,
    sessions: recs.length,
    avgAccuracy: recs.reduce((a, r) => a + r.accuracy, 0) / recs.length,
    avgScore: recs.reduce((a, r) => a + r.score, 0) / recs.length,
    bestScore: Math.max(...recs.map((r) => r.score)),
    totalDurationMs: recs.reduce((a, r) => a + r.durationMs, 0),
  }));
}

/** Sessions grouped by calendar date (YYYY-MM-DD) for last N days */
export function sessionsByDay(sessions: SessionRecord[], days = 14): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    result.push({
      date: dateStr,
      count: sessions.filter((s) => s.playedAt.slice(0, 10) === dateStr).length,
    });
  }
  return result;
}
