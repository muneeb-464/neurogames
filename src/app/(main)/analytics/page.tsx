"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { HOBBY_META } from "@/lib/userProfile";
import {
  loadSessions,
  computeGameStats,
  sessionsByDay,
  type SessionRecord,
  type GameStats,
} from "@/lib/sessions";
import styles from "./analytics.module.css";

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 === 0 ? `${m}m` : `${m}m ${s % 60}s`;
}

/* ── Bar ─────────────────────────────────────────── */
function AccuracyBar({ value, accent = "var(--accent)" }: { value: number; accent?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={styles.barWrap}>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: accent }} />
      </div>
      <span className={styles.barPct}>{pct}%</span>
    </div>
  );
}

/* ── Activity Bar Chart ──────────────────────────── */
function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const W = 560;
  const H = 160;
  const PAD = { t: 16, r: 12, b: 36, l: 32 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map((d) => d.count), 1);
  const n = data.length;
  const barW = (iW / n) * 0.55;
  const gap   = iW / n;

  const yTicks = Array.from({ length: 4 }, (_, i) => Math.round((max / 3) * i));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chartSvg}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Daily activity bar chart"
    >
      <defs>
        <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="barGradHover" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>

      {/* Y grid + labels */}
      {yTicks.map((v) => {
        const y = PAD.t + iH - (v / max) * iH;
        return (
          <g key={v}>
            <line
              x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray={v === 0 ? "0" : "4 4"}
            />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.3)" fontFamily="system-ui">
              {v}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = d.count > 0 ? Math.max(4, (d.count / max) * iH) : 0;
        const x = PAD.l + i * gap + gap / 2 - barW / 2;
        const y = PAD.t + iH - barH;
        const isToday = i === n - 1;
        return (
          <g key={d.date}>
            {/* bar background track */}
            <rect
              x={x} y={PAD.t} width={barW} height={iH}
              fill="rgba(255,255,255,0.03)" rx="3"
            />
            {/* actual bar */}
            {barH > 0 && (
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={isToday ? "url(#barGradHover)" : "url(#barGrad)"}
                rx="3"
                opacity={d.count === 0 ? 0 : 1}
              >
                <title>{d.date}: {d.count} session{d.count !== 1 ? "s" : ""}</title>
              </rect>
            )}
            {/* count label above bar */}
            {d.count > 0 && (
              <text
                x={x + barW / 2} y={y - 4}
                textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily="system-ui"
              >
                {d.count}
              </text>
            )}
          </g>
        );
      })}

      {/* X axis labels — every 2nd day */}
      {data.map((d, i) => {
        if (i % 2 !== 0 && i !== n - 1) return null;
        const x = PAD.l + i * gap + gap / 2;
        const label = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return (
          <text key={d.date} x={x} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="system-ui">
            {label}
          </text>
        );
      })}

      {/* X axis line */}
      <line x1={PAD.l} y1={PAD.t + iH} x2={PAD.l + iW} y2={PAD.t + iH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </svg>
  );
}

/* ── Score Trend Line ────────────────────────────── */
function ScoreTrend({ sessions }: { sessions: SessionRecord[] }) {
  const recent = [...sessions]
    .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime())
    .slice(-20);

  if (recent.length < 2) return <p className={styles.empty}>Need at least 2 sessions to show trend.</p>;

  const W = 560; const H = 120;
  const PAD = { t: 16, r: 12, b: 28, l: 40 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const maxScore = Math.max(...recent.map((s) => s.score), 1);
  const n = recent.length;

  const pts = recent.map((s, i) => ({
    x: PAD.l + (i / (n - 1)) * iW,
    y: PAD.t + iH - (s.score / maxScore) * iH,
    score: s.score,
    name: s.gameName,
    date: s.playedAt,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L${(PAD.l + iW).toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l},${(PAD.t + iH).toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chartSvg}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Score trend"
    >
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,211,238,0.25)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>

      {[0, Math.round(maxScore / 2), maxScore].map((v) => {
        const y = PAD.t + iH - (v / maxScore) * iH;
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.l - 5} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.3)" fontFamily="system-ui">{v}</text>
          </g>
        );
      })}

      <path d={fillPath} fill="url(#trendFill)" />
      <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#22d3ee" stroke="rgba(10,10,20,0.8)" strokeWidth="1.5">
          <title>{p.name} — score {p.score} · {new Date(p.date).toLocaleDateString()}</title>
        </circle>
      ))}
    </svg>
  );
}

/* ── Page ────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { profile } = useUser();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [stats, setStats] = useState<GameStats[]>([]);

  useEffect(() => {
    const s = loadSessions();
    setSessions(s);
    setStats(computeGameStats(s));
  }, []);

  const sorted = [...stats].sort((a, b) => b.avgAccuracy - a.avgAccuracy);
  const topGame = sorted[0] ?? null;
  const lowGame = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 8);

  const totalTimeMs = sessions.reduce((a, s) => a + s.durationMs, 0);
  const overallAccuracy = sessions.length > 0
    ? sessions.reduce((a, s) => a + s.accuracy, 0) / sessions.length : 0;

  const activityData = sessionsByDay(sessions, 14);

  const ACCENTS: Record<string, string> = {
    boxing: "var(--accent-orange)",
    "color-pattern": "var(--accent)",
    "quick-math": "var(--accent-teal)",
    "math-training": "var(--accent-gold)",
    "number-sequence": "var(--accent-mint)",
  };

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>Overview</p>
      <h1 className={styles.title}>Analytics</h1>

      {/* Summary */}
      <div className={styles.summaryRow}>
        {[
          { icon: "▣", val: sessions.length, label: "Total sessions" },
          { icon: "◎", val: fmt(totalTimeMs), label: "Time trained" },
          { icon: "○", val: `${Math.round(overallAccuracy * 100)}%`, label: "Avg accuracy" },
          { icon: "◇", val: stats.length, label: "Games played" },
        ].map((s) => (
          <div key={s.label} className={styles.summaryCard}>
            <span className={styles.summaryIcon} aria-hidden>{s.icon}</span>
            <div className={styles.summaryVal}>{s.val}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.grid}>

        {/* Activity bar chart */}
        <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Daily activity — last 14 days</h2>
              <p className={styles.cardSub}>Number of sessions per day</p>
            </div>
            <span className={styles.cardPill}>{sessions.length} total</span>
          </div>
          {sessions.length === 0
            ? <p className={styles.empty}>Play games to see your activity.</p>
            : <ActivityChart data={activityData} />
          }
        </section>

        {/* Score trend */}
        <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Score trend</h2>
              <p className={styles.cardSub}>Last 20 sessions across all games</p>
            </div>
          </div>
          <ScoreTrend sessions={sessions} />
        </section>

        {/* Accuracy by game */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Accuracy by game</h2>
          {stats.length === 0
            ? <p className={styles.empty}>No sessions yet.</p>
            : (
              <div className={styles.gameList}>
                {sorted.map((g) => (
                  <div key={g.slug} className={styles.gameRow}>
                    <div className={styles.gameRowTop}>
                      <span className={styles.gameDot} style={{ background: ACCENTS[g.slug] ?? "var(--accent)" }} />
                      <span className={styles.gameName}>{g.name}</span>
                      <span className={styles.gameSessions}>{g.sessions}×</span>
                    </div>
                    <AccuracyBar value={g.avgAccuracy} accent={ACCENTS[g.slug]} />
                  </div>
                ))}
              </div>
            )}
        </section>

        {/* Performance */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Performance highlights</h2>
          {!topGame
            ? <p className={styles.empty}>No sessions yet.</p>
            : (
              <div className={styles.perfList}>
                {topGame && (
                  <div className={styles.perfCard}>
                    <div className={styles.perfBadge}>↑ Best game</div>
                    <div className={styles.perfName}>{topGame.name}</div>
                    <div className={styles.perfMeta}>
                      <span>{Math.round(topGame.avgAccuracy * 100)}% avg accuracy</span>
                      <span>Best: {topGame.bestScore}</span>
                    </div>
                    <AccuracyBar value={topGame.avgAccuracy} accent="var(--accent-teal)" />
                  </div>
                )}
                {lowGame && (
                  <div className={styles.perfCard} style={{ borderColor: "rgba(255,126,179,0.15)" }}>
                    <div className={styles.perfBadge} style={{ color: "var(--accent-pink)", background: "rgba(255,126,179,0.12)" }}>↓ Needs work</div>
                    <div className={styles.perfName}>{lowGame.name}</div>
                    <div className={styles.perfMeta}>
                      <span>{Math.round(lowGame.avgAccuracy * 100)}% avg accuracy</span>
                      <span>Best: {lowGame.bestScore}</span>
                    </div>
                    <AccuracyBar value={lowGame.avgAccuracy} accent="var(--accent-pink)" />
                  </div>
                )}
                <div className={styles.timeList}>
                  {sorted.map((g) => (
                    <div key={g.slug} className={styles.timeRow}>
                      <span className={styles.timeGame}>{g.name}</span>
                      <span className={styles.timeVal}>{fmt(g.totalDurationMs)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </section>

        {/* Recent sessions table */}
        <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <h2 className={styles.cardTitle}>Recent sessions</h2>
          {recentSessions.length === 0
            ? <p className={styles.empty}>No sessions yet — play a game to see results here.</p>
            : (
              <div className={styles.table}>
                <div className={styles.thead}>
                  <span>Game</span><span>Score</span><span>Accuracy</span><span>Duration</span><span>Date</span>
                </div>
                {recentSessions.map((s) => (
                  <div key={s.id} className={styles.trow}>
                    <span className={styles.tgame}>
                      <span className={styles.tdot} style={{ background: ACCENTS[s.gameSlug] ?? "var(--accent)" }} />
                      {s.gameName}
                    </span>
                    <span>{s.score}</span>
                    <span>
                      <span className={styles.accPill} style={{ "--color": ACCENTS[s.gameSlug] ?? "var(--accent)" } as React.CSSProperties}>
                        {Math.round(s.accuracy * 100)}%
                      </span>
                    </span>
                    <span>{fmt(s.durationMs)}</span>
                    <span className={styles.tdate}>
                      {new Date(s.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </section>

        {/* Profile */}
        {profile && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Your profile</h2>
            <div className={styles.infoList}>
              {[
                { label: "Name", val: profile.name },
                { label: "Age", val: profile.age || "—" },
                { label: "Member since", val: new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
              ].map((r) => (
                <div key={r.label} className={styles.infoRow}>
                  <span className={styles.infoLabel}>{r.label}</span>
                  <span className={styles.infoVal}>{r.val}</span>
                </div>
              ))}
            </div>
            <div className={styles.chips}>
              {profile.hobbies.map((h) => {
                const meta = HOBBY_META[h];
                const label = h === "other" && profile.customHobby ? profile.customHobby : meta.label;
                return (
                  <span key={h} className={styles.chip} style={{ borderColor: meta.accent }}>
                    {meta.icon} {label}
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
