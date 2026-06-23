"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./QuickMathGame.module.css";
import GameBgVideo from "./_shared/GameBgVideo";
import { saveSession } from "@/lib/sessions";

const TOTAL_ROUNDS = 10;
const QUESTION_MS = 12000;

type Phase = "playing" | "summary";

interface Question {
  a: number;
  b: number;
  answer: number;
  choices: number[];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function generateQuestion(): Question {
  const a = 10 + Math.floor(Math.random() * 40);
  const b = 10 + Math.floor(Math.random() * 40);
  const answer = a + b;
  const choices = new Set<number>([answer]);

  while (choices.size < 4) {
    const offset =
      (Math.floor(Math.random() * 5) + 1) *
      (Math.random() < 0.5 ? -1 : 1) *
      (Math.random() < 0.5 ? 2 : 1);
    const candidate = answer + offset;
    if (candidate > 0 && candidate !== answer) choices.add(candidate);
  }

  return { a, b, answer, choices: shuffle([...choices]) };
}

export default function QuickMathGame() {
  const [phase, setPhase] = useState<Phase>("playing");
  const [round, setRound] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [selected, setSelected] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(QUESTION_MS);
  const startTimeRef = useRef(Date.now());
  const lastTickRef = useRef(0);
  const resolvedRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadQuestion = useCallback(() => {
    setQuestion(generateQuestion());
    setSelected(null);
    setResolved(false);
    resolvedRef.current = false;
    remainingRef.current = QUESTION_MS;
    setTimeLeft(100);
    lastTickRef.current = Date.now();

    stopTimer();
    timerRef.current = setInterval(() => {
      if (resolvedRef.current) return;
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      remainingRef.current -= delta;
      if (remainingRef.current <= 0) {
        stopTimer();
        resolvedRef.current = true;
        setResolved(true);
        setTimeLeft(0);
      } else {
        setTimeLeft((remainingRef.current / QUESTION_MS) * 100);
      }
    }, 50);
  }, [stopTimer]);

  useEffect(() => {
    loadQuestion();
    return () => stopTimer();
  }, [loadQuestion, stopTimer]);

  const advanceRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      stopTimer();
      setPhase("summary");
      return;
    }
    setRound((r) => r + 1);
    loadQuestion();
  }, [round, loadQuestion, stopTimer]);

  const pickAnswer = useCallback(
    (choice: number) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      stopTimer();
      setSelected(choice);
      setResolved(true);
      if (choice === question.answer) {
        setCorrectCount((c) => c + 1);
      }
      window.setTimeout(() => advanceRound(), 650);
    },
    [question.answer, stopTimer, advanceRound],
  );

  useEffect(() => {
    if (!resolved || selected !== null) return;
    window.setTimeout(() => advanceRound(), 650);
  }, [resolved, selected, advanceRound]);

  useEffect(() => {
    if (phase !== "summary") return;
    saveSession({
      gameSlug: "quick-math",
      gameName: "Quick Math",
      score: correctCount * 10,
      accuracy: correctCount / TOTAL_ROUNDS,
      durationMs: Date.now() - startTimeRef.current,
    });
  }, [phase, correctCount]);

  const playAgain = () => {
    startTimeRef.current = Date.now();
    setPhase("playing");
    setRound(1);
    setCorrectCount(0);
    loadQuestion();
  };

  if (phase === "summary") {
    return (
      <div className={styles.arena}>
        <div className={styles.ambient} aria-hidden />
        <div className={styles.summaryWrap}>
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Session complete</h2>
            <p className={styles.summaryScore}>
              {correctCount} / {TOTAL_ROUNDS} correct
            </p>
            <div className={styles.summaryActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={playAgain}
              >
                Play again
              </button>
              <Link href="/train/math" className={styles.secondaryBtn}>
                Back to Mathematics
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.arena}>
      <GameBgVideo gameSlug="quick-math" />
      <div className={styles.ambient} aria-hidden />
      <div className={styles.inner}>
        <header className={styles.hud}>
          <div className={styles.hudRow}>
            <span>
              Round {round} / {TOTAL_ROUNDS}
            </span>
            <span className={styles.hudCorrect}>Correct: {correctCount}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, timeLeft)}%` }}
            />
          </div>
          <div className={styles.hudRule} aria-hidden />
        </header>

        <div
          className={`${styles.playfield} ${styles.playfieldWithLanes}`}
        >
          <div className={styles.laneGhost} aria-hidden />
          <div className={styles.mainCol}>
            <div className={styles.questionBox}>
              <p className={styles.equation}>
                {question.a} + {question.b} =
              </p>
              <p className={styles.questionMark}>?</p>
            </div>

            <div className={styles.choicesGrid}>
              {question.choices.map((choice) => {
                const isSelected = selected === choice;
                const isCorrect = choice === question.answer;
                let stateClass = "";
                if (resolved) {
                  if (isCorrect) stateClass = styles.choiceCorrect;
                  else if (isSelected) stateClass = styles.choiceWrong;
                } else if (isSelected) {
                  stateClass = styles.choicePicked;
                }

                return (
                  <button
                    key={choice}
                    type="button"
                    className={`${styles.choice} ${stateClass}`}
                    disabled={resolved}
                    onClick={() => pickAnswer(choice)}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className={styles.focusLane} aria-label="Focus lane">
            <span className={styles.focusWord}>FOCUS</span>
          </aside>
        </div>
      </div>
    </div>
  );
}
