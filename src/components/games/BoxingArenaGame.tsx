"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./BoxingArenaGame.module.css";
import { useArenaCrowdSound } from "./useArenaCrowdSound";
import GameBgVideo from "./_shared/GameBgVideo";
import { saveSession } from "@/lib/sessions";

type Difficulty = "easy" | "medium" | "hard";
type Phase = "menu" | "playing" | "gameover";
type Move = "punch" | "leg";

const DIFF: Record<
  Difficulty,
  { label: string; promptMs: number; windowMs: number; desc: string }
> = {
  easy: {
    label: "Easy",
    promptMs: 2400,
    windowMs: 1400,
    desc: "Slower calls · more time to react",
  },
  medium: {
    label: "Medium",
    promptMs: 1700,
    windowMs: 950,
    desc: "Balanced arena pace",
  },
  hard: {
    label: "Hard",
    promptMs: 1100,
    windowMs: 620,
    desc: "Fast combos · crowd roars",
  },
};

const MOVES: { id: Move; key: string; label: string; hint: string }[] = [
  { id: "punch", key: "J", label: "PUNCH", hint: "Press J" },
  { id: "leg", key: "K", label: "LEG SHOT", hint: "Press K" },
];

function pickMove(): Move {
  return Math.random() < 0.5 ? "punch" : "leg";
}

export default function BoxingArenaGame() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [current, setCurrent] = useState<Move | null>(null);
  const [feedback, setFeedback] = useState<"idle" | "hit" | "miss" | "late">(
    "idle",
  );
  const [opponentHit, setOpponentHit] = useState(false);
  const [playerStrike, setPlayerStrike] = useState<Move | null>(null);
  const [timePct, setTimePct] = useState(100);

  const phaseRef = useRef(phase);
  const difficultyRef = useRef<Difficulty>("medium");
  const currentRef = useRef<Move | null>(null);
  const resolvingRef = useRef(false);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windowEndRef = useRef(0);
  const windowStartRef = useRef(0);
  const schedulePromptRef = useRef<() => void>(() => {});
  const startTimeRef = useRef(0);
  const { start: startCrowd, stop: stopCrowd, cheerBurst, prime: primeCrowd } =
    useArenaCrowdSound();
  const [crowdRoar, setCrowdRoar] = useState(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const clearTimers = useCallback(() => {
    if (promptTimeoutRef.current) {
      clearTimeout(promptTimeoutRef.current);
      promptTimeoutRef.current = null;
    }
    if (windowTimeoutRef.current) {
      clearTimeout(windowTimeoutRef.current);
      windowTimeoutRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const schedulePrompt = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const cfg = DIFF[difficultyRef.current];
    promptTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      resolvingRef.current = false;
      setFeedback("idle");
      setOpponentHit(false);
      setPlayerStrike(null);
      const move = pickMove();
      setCurrent(move);
      currentRef.current = move;
      windowStartRef.current = Date.now();
      windowEndRef.current = Date.now() + cfg.windowMs;
      setTimePct(100);

      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(() => {
        const left = windowEndRef.current - Date.now();
        const total = windowEndRef.current - windowStartRef.current;
        setTimePct(Math.max(0, (left / total) * 100));
      }, 40);

      windowTimeoutRef.current = setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        if (resolvingRef.current) return;
        resolvingRef.current = true;
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        setFeedback("late");
        setMisses((m) => {
          const nm = m + 1;
          if (nm >= 5) {
            clearTimers();
            phaseRef.current = "gameover";
            setPhase("gameover");
          } else {
            setTimeout(() => schedulePromptRef.current(), 700);
          }
          return nm;
        });
        setCombo(0);
        setOpponentHit(true);
      }, cfg.windowMs);
    }, cfg.promptMs);
  }, [clearTimers]);

  useEffect(() => {
    schedulePromptRef.current = schedulePrompt;
  }, [schedulePrompt]);

  const resolveHit = useCallback(
    (move: Move) => {
      if (phaseRef.current !== "playing") return;
      if (resolvingRef.current) return;
      if (!currentRef.current) return;
      if (currentRef.current !== move) {
        resolvingRef.current = true;
        clearTimers();
        setFeedback("miss");
        setPlayerStrike(move);
        setMisses((m) => {
          const nm = m + 1;
          if (nm >= 5) {
            phaseRef.current = "gameover";
            setPhase("gameover");
          } else {
            setTimeout(() => schedulePromptRef.current(), 700);
          }
          return nm;
        });
        setCombo(0);
        return;
      }
      resolvingRef.current = true;
      clearTimers();
      setFeedback("hit");
      setPlayerStrike(move);
      setOpponentHit(true);
      const bonus = Math.floor(timePct / 10);
      setScore((s) => s + 10 + bonus);
      setHits((h) => h + 1);
      setCombo((c) => {
        const nc = c + 1;
        setMaxCombo((mx) => Math.max(mx, nc));
        return nc;
      });
      cheerBurst();
      setCrowdRoar(true);
      setTimeout(() => schedulePromptRef.current(), 550);
    },
    [clearTimers, timePct, cheerBurst],
  );

  const startGame = useCallback(
    (diff: Difficulty) => {
      primeCrowd();
      clearTimers();
      difficultyRef.current = diff;
      setDifficulty(diff);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setHits(0);
      setMisses(0);
      setCurrent(null);
      setFeedback("idle");
      setOpponentHit(false);
      setPlayerStrike(null);
      resolvingRef.current = false;
      startTimeRef.current = Date.now();
      setPhase("playing");
      phaseRef.current = "playing";
      requestAnimationFrame(() => {
        if (phaseRef.current === "playing") schedulePrompt();
      });
    },
    [clearTimers, schedulePrompt, primeCrowd],
  );

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      const k = e.key.toLowerCase();
      if (k === "j") resolveHit("punch");
      else if (k === "k") resolveHit("leg");
    },
    [resolveHit],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (phase === "playing") {
      startCrowd();
    } else {
      stopCrowd();
    }
    return () => stopCrowd();
  }, [phase, startCrowd, stopCrowd]);

  useEffect(() => {
    if (phase !== "gameover" || startTimeRef.current === 0) return;
    const total = hits + misses;
    saveSession({
      gameSlug: "boxing",
      gameName: "Arena Boxing",
      score,
      accuracy: total > 0 ? hits / total : 0,
      durationMs: Date.now() - startTimeRef.current,
    });
    startTimeRef.current = 0;
  }, [phase, score, hits, misses]);

  useEffect(() => {
    if (!crowdRoar) return;
    const t = setTimeout(() => setCrowdRoar(false), 600);
    return () => clearTimeout(t);
  }, [crowdRoar]);

  const moveInfo = MOVES.find((m) => m.id === current);

  const crowdHeads = Array.from({ length: 120 }, (_, i) => (
    <span key={i} className={styles.crowdHead} />
  ));

  return (
    <div className={styles.arena}>
      <GameBgVideo gameSlug="boxing" />
      <div
        className={`${styles.crowd} ${phase === "playing" ? styles.crowdActive : ""} ${crowdRoar ? styles.crowdRoar : ""}`}
        aria-hidden
      >
        <div className={styles.crowdLayer} />
        <div className={styles.crowdLayer2} />
        <div className={styles.crowdSilhouettes}>{crowdHeads}</div>
        <div className={styles.crowdWave} />
        <div className={styles.crowdBokeh} />
      </div>
      <div className={styles.spotlight} aria-hidden />
      <div className={styles.ring} aria-hidden />

      <div className={styles.hud}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Score</span>
          <span className={styles.statVal}>{score}</span>
        </div>
        {phase === "playing" && combo >= 2 && (
          <div className={styles.combo}>Combo ×{combo}</div>
        )}
        <div className={styles.stat}>
          <span className={styles.statLabel}>Hits</span>
          <span className={styles.statVal}>{hits}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Miss</span>
          <span className={styles.statVal} style={{ color: "#ff6b6b" }}>
            {misses}/5
          </span>
        </div>
      </div>

      <div className={styles.scene}>
        <div
          className={`${styles.opponent} ${opponentHit ? styles.opponentHit : ""} ${feedback === "late" ? styles.opponentWin : ""}`}
        >
          <div className={styles.opponentHead} />
          <div className={styles.opponentTorso} />
          <div className={styles.opponentGuard}>
            <span className={styles.opponentGloveL} />
            <span className={styles.opponentGloveR} />
          </div>
        </div>

        {phase === "playing" && current && moveInfo && (
          <div
            className={`${styles.prompt} ${feedback === "hit" ? styles.promptHit : ""} ${feedback === "miss" || feedback === "late" ? styles.promptMiss : ""}`}
          >
            <span className={styles.promptWord}>{moveInfo.label}</span>
            <span className={styles.promptKey}>
              {moveInfo.hint}
              <kbd>{moveInfo.key}</kbd>
            </span>
            <div className={styles.promptBar}>
              <div
                className={styles.promptFill}
                style={{ width: `${timePct}%` }}
              />
            </div>
          </div>
        )}

        <div className={styles.playerGloves}>
          <div
            className={`${styles.gloveL} ${playerStrike === "punch" ? styles.glovePunchL : ""} ${playerStrike === "leg" ? styles.gloveLegL : ""}`}
          />
          <div
            className={`${styles.gloveR} ${playerStrike === "punch" ? styles.glovePunchR : ""} ${playerStrike === "leg" ? styles.gloveLegR : ""}`}
          />
        </div>
      </div>

      {phase === "playing" && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => resolveHit("punch")}
          >
            <kbd>J</kbd> Punch
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => resolveHit("leg")}
          >
            <kbd>K</kbd> Leg
          </button>
        </div>
      )}

      {phase === "menu" && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <p className={styles.eyebrow}>Reaction · Motor</p>
            <h2 className={styles.panelTitle}>Arena Boxing</h2>
            <p className={styles.panelText}>
              Read the call, strike with the right key. <strong>J</strong> =
              punch, <strong>K</strong> = leg shot. Faster difficulty = quicker
              calls and shorter windows.
            </p>
            <div className={styles.diffGrid}>
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={styles.diffCard}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    primeCrowd();
                    startGame(d);
                  }}
                >
                  <span className={styles.diffName}>{DIFF[d].label}</span>
                  <span className={styles.diffDesc}>{DIFF[d].desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <p className={styles.eyebrow}>Bell rings</p>
            <h2 className={styles.panelTitle}>Knockout</h2>
            <p className={styles.panelText}>
              Score <strong>{score}</strong> · hits {hits} · best combo{" "}
              <strong>×{maxCombo}</strong>
            </p>
            <div className={styles.panelRow}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => startGame(difficulty)}
              >
                Rematch
              </button>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  clearTimers();
                  setPhase("menu");
                }}
              >
                Difficulty
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <button
          type="button"
          className={styles.endBtn}
          onClick={() => {
            clearTimers();
            stopCrowd();
            setPhase("gameover");
          }}
        >
          End round
        </button>
      )}
    </div>
  );
}
