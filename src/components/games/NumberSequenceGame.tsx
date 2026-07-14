"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./NumberSequenceGame.module.css";
import GameBgVideo from "./_shared/GameBgVideo";
import { useVoiceDigits } from "./_shared/useVoiceDigits";
import { saveSession } from "@/lib/sessions";

type Difficulty = "easy" | "medium" | "hard";

type Phase = "menu" | "watch" | "recall" | "result";

const CFG: Record<
  Difficulty,
  { digitMs: number; gapMs: number; recallMs: number; startLen: number; maxLen: number }
> = {
  easy: { digitMs: 680, gapMs: 220, recallMs: 22000, startLen: 3, maxLen: 8 },
  medium: { digitMs: 520, gapMs: 160, recallMs: 16000, startLen: 3, maxLen: 9 },
  hard: { digitMs: 400, gapMs: 100, recallMs: 12000, startLen: 4, maxLen: 10 },
};

function randomDigit() {
  return 1 + Math.floor(Math.random() * 9);
}

function makeSequence(len: number) {
  return Array.from({ length: len }, () => randomDigit());
}

export default function NumberSequenceGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [phase, setPhase] = useState<Phase>("menu");
  const [sequence, setSequence] = useState<number[]>([]);
  const [flashDigit, setFlashDigit] = useState<number | null>(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [recallLeftMs, setRecallLeftMs] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [seqLen, setSeqLen] = useState(CFG.medium.startLen);
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);
  const [paused, setPaused] = useState(false);
  const [resultKind, setResultKind] = useState<"success" | "fail" | null>(null);
  const [failReason, setFailReason] = useState<"wrong" | "time" | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);

  const watchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seqLenRef = useRef(seqLen);
  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  const sequenceRef = useRef(sequence);
  const inputIndexRef = useRef(inputIndex);
  const recallLeftRef = useRef(recallLeftMs);

  useEffect(() => {
    seqLenRef.current = seqLen;
  }, [seqLen]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);
  useEffect(() => {
    inputIndexRef.current = inputIndex;
  }, [inputIndex]);
  useEffect(() => {
    recallLeftRef.current = recallLeftMs;
  }, [recallLeftMs]);

  const clearWatchTimers = useCallback(() => {
    for (const t of watchTimersRef.current) clearTimeout(t);
    watchTimersRef.current = [];
  }, []);

  const beginRound = useCallback(
    (len: number) => {
      clearWatchTimers();
      const seq = makeSequence(len);
      setSequence(seq);
      setInputIndex(0);
      setFlashDigit(null);
      setFeedback(null);
      setResultKind(null);
      setFailReason(null);
      setPaused(false);
      setPhase("watch");
    },
    [clearWatchTimers],
  );

  const startTimeRef = useRef(0);
  const roundsPassedRef = useRef(0);
  const roundsFailedRef = useRef(0);

  const startGame = useCallback(() => {
    const c = CFG[difficulty];
    setScore(0);
    setRound(1);
    startTimeRef.current = Date.now();
    roundsPassedRef.current = 0;
    roundsFailedRef.current = 0;
    setSeqLen(c.startLen);
    seqLenRef.current = c.startLen;
    beginRound(c.startLen);
  }, [beginRound, difficulty]);

  useEffect(() => {
    if (phase !== "watch") return;
    clearWatchTimers();
    const c = CFG[difficulty];
    let i = 0;

    const step = () => {
      if (phaseRef.current !== "watch") return;
      if (i >= sequence.length) {
        setFlashDigit(null);
        setRecallLeftMs(c.recallMs);
        setPhase("recall");
        return;
      }
      const d = sequence[i]!;
      setFlashDigit(d);
      const t1 = setTimeout(() => {
        setFlashDigit(null);
        const t2 = setTimeout(() => {
          i += 1;
          step();
        }, c.gapMs);
        watchTimersRef.current.push(t2);
      }, c.digitMs);
      watchTimersRef.current.push(t1);
    };

    step();
    return clearWatchTimers;
  }, [phase, sequence, difficulty, clearWatchTimers]);

  useEffect(() => {
    if (phase !== "recall" || paused) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || phaseRef.current !== "recall") return;
      setRecallLeftMs((ms) => {
        if (ms <= 100) {
          setFeedback("bad");
          setFailReason("time");
          setResultKind("fail");
          setPhase("result");
          return 0;
        }
        return ms - 100;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, paused, sequence.length]);

  // Ref-based so voice input (async, possibly several digits per utterance)
  // and the keypad share one path without stale-closure bugs.
  const onDigit = useCallback((n: number) => {
    if (phaseRef.current !== "recall" || pausedRef.current) return;
    const seq = sequenceRef.current;
    const idx = inputIndexRef.current;
    const expected = seq[idx];
    if (expected === undefined) return;
    if (n !== expected) {
      phaseRef.current = "result";
      setFeedback("bad");
      setFailReason("wrong");
      setResultKind("fail");
      setPhase("result");
      return;
    }
    const next = idx + 1;
    inputIndexRef.current = next;
    setInputIndex(next);
    if (next >= seq.length) {
      phaseRef.current = "result";
      setFeedback("ok");
      setResultKind("success");
      setPhase("result");
      setScore((s) => s + seq.length * 10 + Math.floor(recallLeftRef.current / 200));
    }
  }, []);

  const clearInput = useCallback(() => {
    if (phaseRef.current !== "recall" || pausedRef.current) return;
    inputIndexRef.current = 0;
    setInputIndex(0);
  }, []);

  const {
    supported: voiceSupported,
    listening,
    error: voiceError,
    heard,
  } = useVoiceDigits({
    enabled: voiceOn && phase === "recall" && !paused,
    onDigit,
    onCommand: (cmd) => {
      if (cmd === "clear") clearInput();
    },
  });

  useEffect(() => {
    if (phase !== "result") return;
    if (resultKind === "success") roundsPassedRef.current += 1;
    else roundsFailedRef.current += 1;
    const t = window.setTimeout(() => {
      const c = CFG[difficulty];
      if (resultKind === "success") {
        const nextLen = Math.min(seqLenRef.current + 1, c.maxLen);
        setSeqLen(nextLen);
        seqLenRef.current = nextLen;
        setRound((r) => r + 1);
        beginRound(nextLen);
      } else {
        saveSession({
          gameSlug: "number-sequence",
          gameName: "Number Sequence",
          score,
          accuracy: roundsPassedRef.current + roundsFailedRef.current > 0
            ? roundsPassedRef.current / (roundsPassedRef.current + roundsFailedRef.current)
            : 0,
          durationMs: startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 0,
        });
        startTimeRef.current = 0;
        setSeqLen(c.startLen);
        seqLenRef.current = c.startLen;
        setRound(1);
        beginRound(c.startLen);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, resultKind, beginRound, difficulty]);

  const recallSec = Math.ceil(recallLeftMs / 1000);

  return (
    <div className={styles.root}>
      <GameBgVideo gameSlug="number-sequence" paused={paused} />
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
              {phase === "recall" ? `${recallSec}s` : "—"}
            </div>
          </div>
        </div>

        {phase !== "menu" && (
          <p className={styles.hint}>
            {phase === "watch" && "Watch each digit — order matters."}
            {phase === "recall" &&
              "Enter the sequence on the keypad before time runs out."}
            {phase === "result" &&
              (resultKind === "success"
                ? "Nice — longer chain next."
                : "Reset — new sequence.")}
          </p>
        )}

        <div className={styles.stage}>
          {phase === "watch" && (
            <>
              <span className={styles.watchBadge}>Watch</span>
              {flashDigit !== null ? (
                <div className={styles.flash}>{flashDigit}</div>
              ) : (
                <div className={styles.flash} style={{ opacity: 0.2 }}>
                  ·
                </div>
              )}
            </>
          )}

          {(phase === "recall" || (phase === "result" && resultKind)) && (
            <div className={styles.slots} aria-label="Sequence progress">
              {sequence.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className={i < inputIndex ? styles.slotFilled : styles.slot}
                >
                  {i < inputIndex ? d : "·"}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={styles.feedback}
          aria-live="polite"
        >
          {feedback === "ok" && <span className={styles.ok}>Correct</span>}
          {feedback === "bad" && (
            <span className={styles.bad}>
              {failReason === "time" ? "Time up" : "Wrong digit"}
            </span>
          )}
          {!feedback && voiceOn && phase === "recall" && (
            <span className={styles.voiceStatus}>
              {voiceError ??
                (listening
                  ? heard
                    ? `Heard: “${heard}”`
                    : "Listening — say the digits"
                  : "Starting mic…")}
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
            className={`${styles.key} ${styles.keyWide}`}
            disabled={phase !== "recall" || paused}
            onClick={clearInput}
          >
            Clear
          </button>
        </div>

        <div className={styles.controls}>
          {voiceSupported && (
            <button
              type="button"
              className={voiceOn ? `${styles.btn} ${styles.voiceBtnOn}` : styles.btn}
              onClick={() => setVoiceOn((v) => !v)}
              aria-pressed={voiceOn}
            >
              {voiceOn ? "🎤 Voice on" : "🎤 Voice off"}
            </button>
          )}
          <button
            type="button"
            className={styles.btn}
            disabled={phase === "menu" || phase === "watch"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              clearWatchTimers();
              setPhase("menu");
              setPaused(false);
            }}
          >
            Menu
          </button>
        </div>
      </div>

      {phase === "menu" && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h2>Number sequence</h2>
            <p>
              Digits flash one at a time. Replay the full chain before the timer
              ends — tap the keypad or turn on Voice and say the digits aloud.
              Difficulty changes flash speed and time allowed.
            </p>
            <div className={styles.diffRow}>
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={difficulty === d ? styles.diffOn : styles.diffBtn}
                  onClick={() => setDifficulty(d)}
                >
                  {d[0]!.toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <div className={styles.panelActions}>
              <button type="button" className={styles.btnPrimary} onClick={startGame}>
                Start
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
