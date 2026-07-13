"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./NumberRecallGame.module.css";
import GameBgVideo from "./_shared/GameBgVideo";
import { saveSession } from "@/lib/sessions";

type Difficulty = "easy" | "medium" | "hard" | "custom";

type Phase = "menu" | "ready" | "show" | "recall" | "result";

const PRESET: Record<Exclude<Difficulty, "custom">, number> = {
  easy: 4,
  medium: 6,
  hard: 8,
};

const MIN_LEN = 1;
const MAX_LEN = 30;
const MIN_SEC = 0.1;
const MAX_SEC = 300;
const DEFAULT_SEC = 5;
const RECALL_MS = 20000;

function clampSeconds(n: number) {
  if (Number.isNaN(n)) return DEFAULT_SEC;
  return Math.min(MAX_SEC, Math.max(MIN_SEC, n));
}

function randomDigit() {
  return Math.floor(Math.random() * 10); // 0–9 equal probability
}

function makeSequence(len: number) {
  return Array.from({ length: len }, () => randomDigit());
}

function clampLen(n: number) {
  if (Number.isNaN(n)) return MIN_LEN;
  return Math.min(MAX_LEN, Math.max(MIN_LEN, Math.round(n)));
}

export default function NumberRecallGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [customLen, setCustomLen] = useState(5);
  const [showSeconds, setShowSeconds] = useState(DEFAULT_SEC);
  const [phase, setPhase] = useState<Phase>("menu");
  const [sequence, setSequence] = useState<number[]>([]);
  const [entries, setEntries] = useState<number[]>([]);
  const [showLeftMs, setShowLeftMs] = useState(0);
  const [recallLeftMs, setRecallLeftMs] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);
  const [paused, setPaused] = useState(false);
  const [resultKind, setResultKind] = useState<"success" | "fail" | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  const entriesRef = useRef(entries);
  const sequenceRef = useRef(sequence);
  const recallLeftRef = useRef(recallLeftMs);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);
  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);
  useEffect(() => {
    recallLeftRef.current = recallLeftMs;
  }, [recallLeftMs]);

  const startTimeRef = useRef(0);
  const roundsPassedRef = useRef(0);
  const roundsFailedRef = useRef(0);

  const activeLen =
    difficulty === "custom" ? clampLen(customLen) : PRESET[difficulty];

  const beginRound = useCallback((len: number) => {
    setSequence(makeSequence(len));
    setEntries([]);
    setMistakes(0);
    setFeedback(null);
    setResultKind(null);
    setPaused(false);
    setShowLeftMs(0);
    setPhase("ready"); // wait for user — timer does not auto-start
  }, []);

  // Grade the full attempt — never ends the game, just scores it
  const finishRound = useCallback((finalEntries: number[]) => {
    const seq = sequenceRef.current;
    let miss = 0;
    for (let i = 0; i < seq.length; i++) {
      if (finalEntries[i] !== seq[i]) miss += 1;
    }
    const correct = seq.length - miss;
    const bonus = miss === 0 ? Math.floor(recallLeftRef.current / 200) : 0;
    setMistakes(miss);
    setResultKind(miss === 0 ? "success" : "fail");
    setFeedback(miss === 0 ? "ok" : "bad");
    setScore((s) => s + correct * 10 + bonus);
    setPhase("result");
  }, []);

  const revealDigits = useCallback(() => {
    setShowLeftMs(clampSeconds(showSeconds) * 1000);
    setPhase("show");
  }, [showSeconds]);

  const startGame = useCallback(() => {
    setScore(0);
    setRound(1);
    startTimeRef.current = Date.now();
    roundsPassedRef.current = 0;
    roundsFailedRef.current = 0;
    beginRound(activeLen);
  }, [activeLen, beginRound]);

  // Show phase countdown → recall
  useEffect(() => {
    if (phase !== "show" || paused) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || phaseRef.current !== "show") return;
      setShowLeftMs((ms) => {
        if (ms <= 100) {
          setRecallLeftMs(RECALL_MS);
          setPhase("recall");
          return 0;
        }
        return ms - 100;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  // Recall phase countdown → grade whatever is entered on timeout
  useEffect(() => {
    if (phase !== "recall" || paused) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || phaseRef.current !== "recall") return;
      setRecallLeftMs((ms) => {
        if (ms <= 100) {
          finishRound(entriesRef.current);
          return 0;
        }
        return ms - 100;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, paused, finishRound]);

  const onDigit = (n: number) => {
    if (phase !== "recall" || paused) return;
    if (entries.length >= sequence.length) return;
    const next = [...entries, n];
    setEntries(next);
    if (next.length >= sequence.length) {
      finishRound(next);
    }
  };

  const backspace = () => {
    if (phase !== "recall" || paused) return;
    setEntries((e) => e.slice(0, -1));
  };

  const clearInput = () => {
    if (phase !== "recall" || paused) return;
    setEntries([]);
  };

  // Result → tally + always continue to next round
  useEffect(() => {
    if (phase !== "result") return;
    if (resultKind === "success") roundsPassedRef.current += 1;
    else roundsFailedRef.current += 1;
    const t = window.setTimeout(() => {
      setRound((r) => r + 1);
      beginRound(activeLen);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [phase, resultKind, beginRound, activeLen]);

  const exitToMenu = useCallback(() => {
    if (startTimeRef.current > 0) {
      const passed = roundsPassedRef.current;
      const failed = roundsFailedRef.current;
      saveSession({
        gameSlug: "number-recall",
        gameName: "Number Recall",
        score,
        accuracy: passed + failed > 0 ? passed / (passed + failed) : 0,
        durationMs: Date.now() - startTimeRef.current,
      });
      startTimeRef.current = 0;
    }
    setPhase("menu");
    setPaused(false);
  }, [score]);

  const showSec = Math.ceil(showLeftMs / 1000);
  const recallSec = Math.ceil(recallLeftMs / 1000);

  return (
    <div className={styles.root}>
      <GameBgVideo gameSlug="number-recall" paused={paused} />
      <div className={styles.ambient} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.meta}>
          <div className={styles.metaCell}>
            <div className={styles.metaLabel}>Round</div>
            <div className={styles.metaValue}>{round}</div>
          </div>
          <div className={styles.metaCell}>
            <div className={styles.metaLabel}>Score</div>
            <div className={styles.metaValue}>{score}</div>
          </div>
          <div className={styles.metaCell}>
            <div className={styles.metaLabel}>Time</div>
            <div className={styles.metaValue}>
              {phase === "show" ? `${showSec}s` : phase === "recall" ? `${recallSec}s` : "—"}
            </div>
          </div>
        </div>

        {phase !== "menu" && (
          <p className={styles.hint}>
            {phase === "ready" && "Ready? Reveal the digits when you are — timer starts on tap."}
            {phase === "show" && "Memorise all the digits — order matters."}
            {phase === "recall" &&
              "Enter the digits in the same order before time runs out."}
            {phase === "result" &&
              (resultKind === "success"
                ? "Perfect recall — next round."
                : `${mistakes} of ${sequence.length} wrong — keep going.`)}
          </p>
        )}

        <div className={styles.stage}>
          {phase === "ready" && (
            <div className={styles.readyBox}>
              <div className={styles.readyCount}>{activeLen} digits</div>
              <button type="button" className={styles.btnPrimary} onClick={revealDigits}>
                Reveal · {clampSeconds(showSeconds)}s
              </button>
            </div>
          )}

          {phase === "show" && (
            <>
              <span className={styles.showBadge}>Memorise</span>
              <div className={styles.showRow}>
                {sequence.map((d, i) => (
                  <div key={i} className={styles.showTile}>
                    {d}
                  </div>
                ))}
              </div>
            </>
          )}

          {(phase === "recall" || (phase === "result" && resultKind)) && (
            <div className={styles.slots} aria-label="Sequence progress">
              {sequence.map((correctDigit, i) => {
                const entered = entries[i];
                const hasEntry = entered !== undefined;

                if (phase === "result") {
                  // green if right, red (showing the correct digit) if wrong/missing
                  const right = entered === correctDigit;
                  return (
                    <div
                      key={i}
                      className={right ? styles.slotCorrect : styles.slotWrong}
                    >
                      {right ? entered : correctDigit}
                    </div>
                  );
                }

                // recall: reflect what the user has typed so far
                return (
                  <div
                    key={i}
                    className={hasEntry ? styles.slotFilled : styles.slot}
                  >
                    {hasEntry ? entered : "·"}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.feedback} aria-live="polite">
          {feedback === "ok" && <span className={styles.ok}>All correct</span>}
          {feedback === "bad" && (
            <span className={styles.bad}>
              {mistakes} mistake{mistakes === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              className={styles.key}
              disabled={phase !== "recall" || paused}
              onClick={() => onDigit(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={styles.key}
            disabled={phase !== "recall" || paused}
            onClick={clearInput}
          >
            Clear
          </button>
          <button
            type="button"
            className={styles.key}
            disabled={phase !== "recall" || paused}
            onClick={() => onDigit(0)}
          >
            0
          </button>
          <button
            type="button"
            className={styles.key}
            disabled={phase !== "recall" || paused || entries.length === 0}
            onClick={backspace}
          >
            ⌫
          </button>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.btn}
            disabled={phase === "menu" || phase === "ready" || phase === "show"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={exitToMenu}
          >
            Menu
          </button>
        </div>
      </div>

      {phase === "menu" && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h2>Number recall</h2>
            <p>
              All the digits appear at once when you tap Reveal. Memorise them
              within your timer, then replay the full chain in order. Difficulty
              sets how many digits — or pick your own count and time.
            </p>
            <div className={styles.diffRow}>
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={difficulty === d ? styles.diffOn : styles.diffBtn}
                  onClick={() => setDifficulty(d)}
                >
                  {d[0]!.toUpperCase() + d.slice(1)} · {PRESET[d]}
                </button>
              ))}
              <button
                type="button"
                className={difficulty === "custom" ? styles.diffOn : styles.diffBtn}
                onClick={() => setDifficulty("custom")}
              >
                Custom
              </button>
            </div>

            {difficulty === "custom" && (
              <label className={styles.customRow}>
                <span>Digits ({MIN_LEN}–{MAX_LEN})</span>
                <input
                  type="number"
                  min={MIN_LEN}
                  max={MAX_LEN}
                  value={customLen}
                  className={styles.customInput}
                  onChange={(e) => setCustomLen(clampLen(Number(e.target.value)))}
                />
              </label>
            )}

            <label className={styles.customRow}>
              <span>Memorise timer (s)</span>
              <input
                type="number"
                min={MIN_SEC}
                max={MAX_SEC}
                step={0.1}
                value={showSeconds}
                className={styles.customInput}
                onChange={(e) => setShowSeconds(clampSeconds(Number(e.target.value)))}
              />
            </label>

            <div className={styles.panelActions}>
              <button type="button" className={styles.btnPrimary} onClick={startGame}>
                Start · {activeLen} digits
              </button>
            </div>
          </div>
        </div>
      )}

      {paused && phase === "recall" && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h2>Paused</h2>
            <p>Timer is frozen. Resume when you are ready.</p>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setPaused(false)}
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
