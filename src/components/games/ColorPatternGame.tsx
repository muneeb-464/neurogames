"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ColorPatternGame.module.css";
import GameBgVideo from "./_shared/GameBgVideo";
import { loadSessions, saveSession, type SessionRecord } from "@/lib/sessions";

const COUNT = 50;

const PALETTE = [
  { name: "Primary",   a: "#60A5FA", b: "#3B82F6", glow: "#3B82F6" },
  { name: "Secondary", a: "#818CF8", b: "#6366F1", glow: "#6366F1" },
  { name: "Accent",    a: "#A78BFA", b: "#8B5CF6", glow: "#8B5CF6" },
  { name: "Highlight", a: "#22D3EE", b: "#06B6D4", glow: "#06B6D4" },
  { name: "Success",   a: "#34D399", b: "#10B981", glow: "#10B981" },
] as const;

type Difficulty = "easy" | "medium" | "hard";

const DIFF_MULT: Record<Difficulty, number> = { easy: 0.74, medium: 1, hard: 1.22 };
const MAX_SPEED: Record<Difficulty, number> = { easy: 42, medium: 54, hard: 66 };

type Entity = {
  x: number; y: number; vx: number; vy: number;
  r: number; colorId: number; num: number; phase: number;
};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m > 0 ? `${m}m ${ss.toString().padStart(2, "0")}s` : `${ss}.${Math.floor((ms % 1000) / 100)}s`;
}

function initEntities(width: number, height: number): Entity[] {
  const nums = Array.from({ length: COUNT }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j]!, nums[i]!];
  }
  const list: Entity[] = [];
  const margin = 40;
  for (let i = 0; i < COUNT; i++) {
    const r = rand(20, 27);
    list.push({
      x: rand(r + margin, Math.max(r + margin + 8, width - r - margin)),
      y: rand(r + margin, Math.max(r + margin + 8, height - r - margin)),
      vx: 0, vy: 0, r,
      colorId: Math.floor(Math.random() * PALETTE.length),
      num: nums[i]!,
      phase: Math.random() * Math.PI * 2,
    });
  }
  for (const e of list) {
    const ang = Math.random() * Math.PI * 2;
    const sp = rand(28, 46);
    e.vx = Math.cos(ang) * sp;
    e.vy = Math.sin(ang) * sp;
  }
  return list;
}

function useGameAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const ensure = useCallback(() => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext || w.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }, []);

  const tone = useCallback((freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) => {
    const ctx = ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }, [ensure]);

  const playHit  = useCallback(() => { tone(880, 0.09, "sine", 0.12, 220); tone(1320, 0.06, "triangle", 0.06, 180); }, [tone]);
  const playMiss = useCallback(() => { tone(160, 0.14, "sawtooth", 0.07, -80); }, [tone]);

  return { ensure, playHit, playMiss };
}

export default function ColorPatternGame() {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const entitiesRef  = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pausedRef  = useRef(false);
  const runningRef = useRef(false);
  const lastRef    = useRef(0);
  const difficultyRef = useRef<Difficulty>("medium");
  const timeRef    = useRef(0);
  const targetRef  = useRef(0);
  const rafRef     = useRef(0);
  const endedRef   = useRef(false);
  const sizeRef    = useRef({ w: 320, h: 420 });
  const startMsRef = useRef(0);
  const pausedMsRef = useRef(0);  // accumulated paused duration
  const pauseStartRef = useRef(0);
  const mistakesRef = useRef(0);
  const finalMsRef  = useRef(0);

  const audio = useGameAudio();

  const [uiPhase, setUiPhase]   = useState<"menu" | "playing" | "gameover">("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [remaining, setRemaining] = useState(COUNT);
  const [mistakes, setMistakes]  = useState(0);
  const [elapsed, setElapsed]    = useState(0);
  const [finalMs, setFinalMs]    = useState(0);
  const [finalMistakes, setFinalMistakes] = useState(0);
  const [paused, setPaused]      = useState(false);
  const [records, setRecords]    = useState<SessionRecord[]>([]);

  const resize = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.max(280, Math.floor(r.width));
    const h = Math.max(360, Math.floor(Math.min(640, r.width * 1.05)));
    sizeRef.current = { w, h };
  }, []);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(() => resize());
    const el = wrapRef.current;
    if (el) ro.observe(el);
    window.addEventListener("resize", resize);
    return () => { ro.disconnect(); window.removeEventListener("resize", resize); };
  }, [resize]);

  // live timer tick
  useEffect(() => {
    if (uiPhase !== "playing") return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const now = Date.now();
      const paused_total = pausedMsRef.current + (pauseStartRef.current > 0 ? now - pauseStartRef.current : 0);
      setElapsed(now - startMsRef.current - paused_total);
    }, 100);
    return () => clearInterval(id);
  }, [uiPhase]);

  const spawnParticles = (x: number, y: number, color: string, burst: number) => {
    const list = particlesRef.current;
    for (let i = 0; i < burst; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = rand(40, 140);
      const life = rand(0.42, 0.68);
      list.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life, maxLife: life, color, size: rand(2, 5) });
    }
  };

  const pickNewTarget = useCallback((lastNum?: number) => {
    const next = lastNum !== undefined ? lastNum + 1 : 1;
    if (next > COUNT || entitiesRef.current.length === 0) return;
    targetRef.current = next;
  }, []);

  useEffect(() => {
    if (uiPhase !== "playing") return;

    const drawFrame = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const e of entitiesRef.current) {
        const pal = PALETTE[e.colorId];
        if (!pal) continue;
        const body = ctx.createRadialGradient(
          e.x - e.r * 0.28, e.y - e.r * 0.28, e.r * 0.01,
          e.x + e.r * 0.15, e.y + e.r * 0.18, e.r * 1.08,
        );
        body.addColorStop(0, pal.a);
        body.addColorStop(0.5, pal.b);
        body.addColorStop(1, pal.b);
        ctx.beginPath();
        ctx.fillStyle = body;
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.clip();
        const gloss = ctx.createRadialGradient(
          e.x - e.r * 0.28, e.y - e.r * 0.42, 0,
          e.x - e.r * 0.1, e.y - e.r * 0.1, e.r * 0.72,
        );
        gloss.addColorStop(0, "rgba(255,255,255,0.72)");
        gloss.addColorStop(0.45, "rgba(255,255,255,0.22)");
        gloss.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gloss;
        ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
        ctx.restore();

        const rim = ctx.createRadialGradient(e.x + e.r * 0.18, e.y + e.r * 0.6, 0, e.x + e.r * 0.18, e.y + e.r * 0.6, e.r * 0.42);
        rim.addColorStop(0, "rgba(255,255,255,0.28)");
        rim.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.fillStyle = rim;
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.stroke();

        ctx.font = `600 ${Math.round(e.num >= 10 ? e.r * 0.7 : e.r * 0.9)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(8,8,14,0.88)";
        ctx.fillText(String(e.num), e.x + 0.5, e.y + 1.2);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText(String(e.num), e.x, e.y);
      }

      for (const p of particlesRef.current) {
        const a = p.maxLife > 0 ? Math.max(0, p.life / p.maxLife) : 0;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * a), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.save();
      ctx.setLineDash([6, 10]);
      ctx.strokeStyle = "rgba(168,144,254,0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      ctx.restore();
    };

    const stepPhysics = (dt: number) => {
      const { w, h } = sizeRef.current;
      const mult = DIFF_MULT[difficultyRef.current];
      const maxSp = MAX_SPEED[difficultyRef.current];
      const t = timeRef.current;
      const noise = 20 * mult;

      for (const e of entitiesRef.current) {
        e.vx += Math.sin(t * 0.9 + e.phase) * noise * dt;
        e.vy += Math.cos(t * 0.72 + e.phase * 1.13) * noise * dt;
        const sp = Math.hypot(e.vx, e.vy);
        const cap = maxSp * mult;
        if (sp > cap && sp > 0) { e.vx *= cap / sp; e.vy *= cap / sp; }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx) * 0.92; }
        else if (e.x > w - e.r) { e.x = w - e.r; e.vx = -Math.abs(e.vx) * 0.92; }
        if (e.y < e.r) { e.y = e.r; e.vy = Math.abs(e.vy) * 0.92; }
        else if (e.y > h - e.r) { e.y = h - e.r; e.vy = -Math.abs(e.vy) * 0.92; }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]!;
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
      }
    };

    const loop = (now: number) => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { w, h } = sizeRef.current;
      if (canvas.width !== Math.floor(w * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const last = lastRef.current || now;
      const dt = Math.min(0.05, (now - last) / 1000);
      lastRef.current = now;
      if (!pausedRef.current) { timeRef.current += dt; stepPhysics(dt); }
      drawFrame(ctx, w, h);
    };

    runningRef.current = true;
    lastRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => { runningRef.current = false; cancelAnimationFrame(rafRef.current); };
  }, [uiPhase, pickNewTarget]);

  useEffect(() => {
    if (paused) {
      pauseStartRef.current = Date.now();
    } else {
      if (pauseStartRef.current > 0) {
        pausedMsRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
    }
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  const startGame = () => {
    audio.ensure();
    endedRef.current = false;
    resize();
    const { w, h } = sizeRef.current;
    entitiesRef.current = initEntities(w, h);
    particlesRef.current = [];
    timeRef.current = 0;
    lastRef.current = 0;
    mistakesRef.current = 0;
    finalMsRef.current = 0;
    startMsRef.current = Date.now();
    pausedMsRef.current = 0;
    pauseStartRef.current = 0;
    setMistakes(0);
    setElapsed(0);
    setFinalMs(0);
    setFinalMistakes(0);
    setRemaining(COUNT);
    setPaused(false);
    pausedRef.current = false;
    pickNewTarget(0);
    setUiPhase("playing");
  };

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const now = Date.now();
    const totalPaused = pausedMsRef.current + (pauseStartRef.current > 0 ? now - pauseStartRef.current : 0);
    const ms = now - startMsRef.current - totalPaused;
    finalMsRef.current = ms;
    const m = mistakesRef.current;
    setFinalMs(ms);
    setFinalMistakes(m);
    setUiPhase("gameover");
    setPaused(false);
    const rec = saveSession({
      gameSlug: "color-pattern",
      gameName: "Color Pattern",
      score: Math.max(0, COUNT - m),
      accuracy: COUNT / (COUNT + m),
      durationMs: ms,
    });
    setRecords(loadSessions().filter((s) => s.gameSlug === "color-pattern").reverse().slice(0, 5));
    void rec;
  }, []);

  const onPointer = (clientX: number, clientY: number) => {
    if (uiPhase !== "playing" || pausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let hit: Entity | null = null;
    let best = Infinity;
    for (const e of entitiesRef.current) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= e.r + 6 && d < best) { best = d; hit = e; }
    }

    if (!hit) {
      // tapped empty space — count as mistake
      audio.playMiss();
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
      return;
    }

    if (hit.num === targetRef.current) {
      audio.playHit();
      const pal = PALETTE[hit.colorId];
      entitiesRef.current = entitiesRef.current.filter((e) => e.num !== hit.num);
      const newRemaining = entitiesRef.current.length;
      setRemaining(newRemaining);
      if (pal) spawnParticles(hit.x, hit.y, pal.a, 14);
      if (newRemaining === 0) { endGame(); return; }
      pickNewTarget(hit.num);
    } else {
      audio.playMiss();
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
    }
  };

  return (
    <div className={styles.root}>
      <GameBgVideo gameSlug="color-pattern" paused={paused} />
      <div className={styles.ambient} aria-hidden />
      <div ref={wrapRef} className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerUp={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            onPointer(e.clientX, e.clientY);
          }}
        />

        {uiPhase === "menu" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <p className={styles.eyebrow}>Focus training</p>
              <h2 className={styles.panelTitle}>Number Hunt</h2>
              <p className={styles.panelText}>
                50 numbered balls float around. Tap them in order 1 → 50 as fast as you can. Every wrong tap counts as a mistake.
              </p>
              <div className={styles.diff}>
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button key={d} type="button"
                    className={difficulty === d ? styles.diffBtnOn : styles.diffBtn}
                    onClick={() => setDifficulty(d)}
                  >
                    {d[0]!.toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.primary} onClick={startGame}>Start</button>
            </div>
          </div>
        )}

        {uiPhase === "playing" && (
          <>
            <header className={styles.hud}>
              <div className={styles.hudStats}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Time</span>
                  <span className={styles.statVal}>{fmt(elapsed)}</span>
                </div>

                <div className={styles.statBox}>
                  <span className={styles.statLabel}>Mistakes</span>
                  <span className={`${styles.statVal} ${mistakes > 0 ? styles.statRed : ""}`}>{mistakes}</span>
                </div>
              </div>
              <div className={styles.progressRow}>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${((COUNT - remaining) / COUNT) * 100}%` }} />
                </div>
                <span className={styles.progressLabel}>{COUNT - remaining}/{COUNT}</span>
              </div>
              <div className={styles.controls}>
                <button type="button" className={styles.ghost} onClick={() => setPaused((p) => !p)}>
                  {paused ? "Resume" : "Pause"}
                </button>
                <button type="button" className={styles.ghost} onClick={() => {
                  runningRef.current = false;
                  cancelAnimationFrame(rafRef.current);
                  endedRef.current = false;
                  setUiPhase("menu");
                  setPaused(false);
                }}>Quit</button>
              </div>
            </header>

            {paused && (
              <div className={styles.overlay}>
                <div className={styles.panelSmall}>
                  <h3 className={styles.pauseTitle}>Paused</h3>
                  <div className={styles.pauseStats}>
                    <span>Time: <strong>{fmt(elapsed)}</strong></span>
                    <span>Mistakes: <strong>{mistakes}</strong></span>
                    <span>Progress: <strong>{COUNT - remaining}/{COUNT}</strong></span>
                  </div>
                  <button type="button" className={styles.primary} onClick={() => setPaused(false)}>Resume</button>
                </div>
              </div>
            )}
          </>
        )}

        {uiPhase === "gameover" && (
          <div className={styles.overlay}>
            <div className={styles.panel}>
              <p className={styles.eyebrow}>Completed!</p>
              <h2 className={styles.panelTitle}>Nice run</h2>

              <div className={styles.resultGrid}>
                <div className={styles.resultBox}>
                  <span className={styles.resultLabel}>Time</span>
                  <span className={styles.resultVal}>{fmt(finalMs)}</span>
                </div>
                <div className={styles.resultBox}>
                  <span className={styles.resultLabel}>Mistakes</span>
                  <span className={`${styles.resultVal} ${finalMistakes > 0 ? styles.resultRed : styles.resultGreen}`}>
                    {finalMistakes}
                  </span>
                </div>
              </div>

              {records.length > 1 && (
                <div className={styles.records}>
                  <p className={styles.recordsTitle}>Recent records</p>
                  <table className={styles.recordTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Mistakes</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => (
                        <tr key={r.id} className={i === 0 ? styles.recordLatest : ""}>
                          <td>{i + 1}</td>
                          <td>{fmt(r.durationMs)}</td>
                          <td>{COUNT - r.score}</td>
                          <td>{new Date(r.playedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={styles.row}>
                <button type="button" className={styles.primary} onClick={startGame}>Play again</button>
                <button type="button" className={styles.ghostLight} onClick={() => {
                  endedRef.current = false;
                  setUiPhase("menu");
                }}>Menu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
