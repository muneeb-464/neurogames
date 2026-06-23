"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./MathTrainingGame.module.css";
import GameBgVideo from "./_shared/GameBgVideo";
import { saveSession } from "@/lib/sessions";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameState = "MENU" | "PLAYING" | "GAMEOVER";

interface Question {
  text: string;
  answer: number;
}

interface SpeechRecognitionAlt {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlt;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, oh: 0, nil: 0, naught: 0,
  one: 1, won: 1,
  two: 2, to: 2, too: 2,
  three: 3, tree: 3, free: 3,
  four: 4, for: 4, fore: 4,
  five: 5,
  six: 6, sex: 6,
  seven: 7,
  eight: 8, ate: 8,
  nine: 9,
  ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fourty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
};

function parseSpokenNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().trim();

  const digitsMatch = cleaned.match(/-?\d+/g);
  if (digitsMatch && digitsMatch.length > 0) {
    const joined = digitsMatch.join("");
    const n = parseInt(joined, 10);
    if (!Number.isNaN(n)) return n;
  }

  let negative = false;
  let working = cleaned
    .replace(/-/g, " ")
    .replace(/[^a-z\s]/g, " ");

  if (/\b(minus|negative)\b/.test(working)) {
    negative = true;
    working = working.replace(/\b(minus|negative)\b/g, " ");
  }

  const tokens = working
    .split(/\s+/)
    .filter((t) => t && t !== "and");
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let touched = false;

  for (const tok of tokens) {
    if (!(tok in NUMBER_WORDS)) continue;
    touched = true;
    const v = NUMBER_WORDS[tok]!;
    if (v === 100) {
      current = (current || 1) * 100;
    } else if (v === 1000) {
      total += (current || 1) * 1000;
      current = 0;
    } else {
      current += v;
    }
  }
  if (!touched) return null;
  const result = total + current;
  return negative ? -result : result;
}

export default function MathTrainingGame() {
  const [gameState, setGameState] = useState<GameState>("MENU");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [coins, setCoins] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const [question, setQuestion] = useState<Question>({ text: "", answer: 0 });
  const [input, setInput] = useState("");
  const [inputStatus, setInputStatus] = useState<
    "active" | "error" | "success"
  >("active");
  const [interim, setInterim] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const [timeLeft, setTimeLeft] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const wantsListeningRef = useRef(false);
  const resolvingRef = useRef(false);
  const currentAnswerRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const difficultyRef = useRef<Difficulty>("EASY");
  const gameStateRef = useRef<GameState>("MENU");
  const nextQuestionRef = useRef<() => void>(() => {});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const correctRef = useRef(0);
  const totalRef = useRef(0);
  const timeLimitRef = useRef(10000);
  const timeRemainingRef = useRef(10000);
  const lastTickRef = useRef(0);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);
  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const generateQuestion = useCallback((diff: Difficulty): Question => {
    const ops = ["+", "-", "×", "÷"];
    const op = ops[Math.floor(Math.random() * ops.length)]!;
    let a = 0;
    let b = 0;
    let answer = 0;

    if (diff === "EASY") {
      if (op === "+") {
        a = Math.floor(Math.random() * 9) + 1;
        b = Math.floor(Math.random() * 9) + 1;
        answer = a + b;
      } else if (op === "-") {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * (a - 1)) + 1;
        answer = a - b;
      } else if (op === "×") {
        a = Math.floor(Math.random() * 5) + 1;
        b = Math.floor(Math.random() * 5) + 1;
        answer = a * b;
      } else {
        b = Math.floor(Math.random() * 5) + 1;
        const c = Math.floor(Math.random() * 5) + 1;
        a = b * c;
        answer = c;
      }
    } else if (diff === "MEDIUM") {
      if (op === "+") {
        a = Math.floor(Math.random() * 41) + 10;
        b = Math.floor(Math.random() * 41) + 10;
        answer = a + b;
      } else if (op === "-") {
        a = Math.floor(Math.random() * 41) + 20;
        b = Math.floor(Math.random() * (a - 10)) + 10;
        answer = a - b;
      } else if (op === "×") {
        a = Math.floor(Math.random() * 8) + 2;
        b = Math.floor(Math.random() * 8) + 2;
        answer = a * b;
      } else {
        b = Math.floor(Math.random() * 8) + 2;
        const c = Math.floor(Math.random() * 8) + 2;
        a = b * c;
        answer = c;
      }
    } else {
      if (op === "+") {
        a = Math.floor(Math.random() * 151) + 50;
        b = Math.floor(Math.random() * 151) + 50;
        answer = a + b;
      } else if (op === "-") {
        a = Math.floor(Math.random() * 301) + 50;
        b = Math.floor(Math.random() * (a - 10)) + 10;
        answer = a - b;
      } else if (op === "×") {
        a = Math.floor(Math.random() * 11) + 5;
        b = Math.floor(Math.random() * 11) + 5;
        answer = a * b;
      } else {
        b = Math.floor(Math.random() * 11) + 5;
        const c = Math.floor(Math.random() * 11) + 5;
        a = b * c;
        answer = c;
      }
    }

    return { text: `${a} ${op} ${b}`, answer };
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFeedbackTimeout = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  const nextQuestion = useCallback(() => {
    if (gameStateRef.current !== "PLAYING") return;
    const diff = difficultyRef.current;
    const newQ = generateQuestion(diff);
    setQuestion(newQ);
    currentAnswerRef.current = newQ.answer;
    setInput("");
    setInterim("");
    setInputStatus("active");
    resolvingRef.current = false;
    timeRemainingRef.current = timeLimitRef.current;
    setTimeLeft(100);
    setSecondsLeft(Math.ceil(timeLimitRef.current / 1000));
    lastTickRef.current = Date.now();

    stopTimer();
    timerRef.current = setInterval(() => {
      if (gameStateRef.current !== "PLAYING" || resolvingRef.current) return;
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      timeRemainingRef.current -= delta;
      if (timeRemainingRef.current <= 0) {
        stopTimer();
        resolvingRef.current = true;
        setInputStatus("error");
        totalRef.current += 1;
        setMistakes((m) => m + 1);
        setCombo(0);
        setTimeLeft(0);
        setSecondsLeft(0);
        clearFeedbackTimeout();
        feedbackTimeoutRef.current = setTimeout(
          () => nextQuestionRef.current(),
          700,
        );
      } else {
        setTimeLeft((timeRemainingRef.current / timeLimitRef.current) * 100);
        setSecondsLeft(Math.max(0, Math.ceil(timeRemainingRef.current / 1000)));
      }
    }, 50);
  }, [generateQuestion, stopTimer, clearFeedbackTimeout]);

  useEffect(() => {
    nextQuestionRef.current = nextQuestion;
  }, [nextQuestion]);

  const submitAnswer = useCallback(
    (parsed: number) => {
      if (resolvingRef.current) return;
      if (gameStateRef.current !== "PLAYING") return;
      const expected = currentAnswerRef.current;

      if (parsed === expected) {
        resolvingRef.current = true;
        stopTimer();
        setInput(String(parsed));
        setInterim("");
        setInputStatus("success");
        const timeBonus = Math.floor(
          (timeRemainingRef.current / timeLimitRef.current) * 50,
        );
        let mult = 1;
        const c = comboRef.current;
        if (c >= 10) mult = 5;
        else if (c >= 5) mult = 3;
        else if (c >= 2) mult = 2;
        correctRef.current += 1;
        totalRef.current += 1;
        setScore((s) => s + (10 + timeBonus) * mult);
        const reward =
          difficultyRef.current === "HARD"
            ? 3
            : difficultyRef.current === "MEDIUM"
              ? 2
              : 1;
        setCoins((co) => co + reward);
        setCombo((cc) => {
          const nc = cc + 1;
          if (nc > maxComboRef.current) setMaxCombo(nc);
          return nc;
        });
        clearFeedbackTimeout();
        feedbackTimeoutRef.current = setTimeout(
          () => nextQuestionRef.current(),
          700,
        );
      } else {
        resolvingRef.current = true;
        stopTimer();
        setInput(String(parsed));
        setInterim("");
        setInputStatus("error");
        totalRef.current += 1;
        setMistakes((m) => m + 1);
        setCombo(0);
        clearFeedbackTimeout();
        feedbackTimeoutRef.current = setTimeout(
          () => nextQuestionRef.current(),
          800,
        );
      }
    },
    [stopTimer, clearFeedbackTimeout],
  );

  const handleInput = useCallback(
    (val: string) => {
      if (resolvingRef.current) return;
      if (gameStateRef.current !== "PLAYING") return;
      setInputStatus("active");
      setInput((prev) => {
        const next = (prev + val).slice(0, 6);
        const parsed = parseInt(next, 10);
        if (!Number.isNaN(parsed)) {
          const expected = currentAnswerRef.current;
          const ansLen = String(Math.abs(expected)).length;
          if (parsed === expected || next.length >= ansLen) {
            queueMicrotask(() => submitAnswer(parsed));
          }
        }
        return next;
      });
    },
    [submitAnswer],
  );

  const handleDelete = useCallback(() => {
    if (resolvingRef.current) return;
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const stopRecognition = useCallback(() => {
    wantsListeningRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError(
        "Voice input isn't supported here. Try Chrome, Edge, or Safari.",
      );
      return;
    }
    setVoiceError(null);

    let rec = recognitionRef.current;
    if (!rec) {
      rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => {
        setIsListening(false);
        if (
          wantsListeningRef.current &&
          gameStateRef.current === "PLAYING" &&
          recognitionRef.current
        ) {
          try {
            recognitionRef.current.start();
          } catch {
            /* already starting */
          }
        }
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setVoiceError(
            "Microphone permission denied. Allow it in your browser settings, then try again.",
          );
          wantsListeningRef.current = false;
        } else if (e.error === "audio-capture") {
          setVoiceError("No microphone detected.");
          wantsListeningRef.current = false;
        }
        setIsListening(false);
      };
      rec.onresult = (event) => {
        if (resolvingRef.current) return;
        if (gameStateRef.current !== "PLAYING") return;
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res) continue;
          const alt = res[0];
          if (!alt) continue;
          if (res.isFinal) finalText += alt.transcript + " ";
          else interimText += alt.transcript + " ";
        }
        if (interimText) setInterim(interimText.trim());
        if (finalText.trim()) {
          setInterim("");
          const parsed = parseSpokenNumber(finalText);
          if (parsed === null) return;
          setInput(String(parsed));
          submitAnswer(parsed);
        }
      };

      recognitionRef.current = rec;
    }

    wantsListeningRef.current = true;
    try {
      rec.start();
    } catch {
      /* already running */
    }
  }, [submitAnswer]);

  const toggleListening = () => {
    if (wantsListeningRef.current || isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameStateRef.current !== "PLAYING") return;
      if (e.key >= "0" && e.key <= "9") {
        handleInput(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter") {
        const parsed = parseInt(input, 10);
        if (!Number.isNaN(parsed)) submitAnswer(parsed);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleInput, handleDelete, submitAnswer, input]);

  useEffect(() => {
    return () => {
      stopTimer();
      clearFeedbackTimeout();
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, [stopTimer, clearFeedbackTimeout]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    difficultyRef.current = diff;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCoins(0);
    setMistakes(0);
    setVoiceError(null);
    startTimeRef.current = Date.now();
    correctRef.current = 0;
    totalRef.current = 0;
    setGameState("PLAYING");
    gameStateRef.current = "PLAYING";
    if (diff === "EASY") timeLimitRef.current = 17000;
    else if (diff === "MEDIUM") timeLimitRef.current = 14500;
    else timeLimitRef.current = 12500;
    nextQuestion();
  };

  const handleGameOver = () => {
    stopTimer();
    clearFeedbackTimeout();
    stopRecognition();
    setGameState("GAMEOVER");
    saveSession({
      gameSlug: "math-training",
      gameName: "Math Training",
      score,
      accuracy: totalRef.current > 0 ? correctRef.current / totalRef.current : 0,
      durationMs: startTimeRef.current > 0 ? Date.now() - startTimeRef.current : 0,
    });
    startTimeRef.current = 0;
  };

  const comboMultiplier =
    combo >= 10 ? 5 : combo >= 5 ? 3 : combo >= 2 ? 2 : 1;

  if (gameState === "MENU") {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Select Difficulty</h1>
        <div className={styles.difficultyGrid}>
          <div
            className={`${styles.diffCard} ${styles.easyCard}`}
            onClick={() => startGame("EASY")}
          >
            <div className={styles.cardContent}>
              <h2 className={styles.diffTitle}>EASY</h2>
              <p className={styles.diffDesc}>
                Simple calculations • Relaxed pace
              </p>
            </div>
          </div>
          <div
            className={`${styles.diffCard} ${styles.mediumCard}`}
            onClick={() => startGame("MEDIUM")}
          >
            <div className={styles.cardContent}>
              <h2 className={styles.diffTitle}>MEDIUM</h2>
              <p className={styles.diffDesc}>
                Balanced challenge • Faster thinking
              </p>
            </div>
          </div>
          <div
            className={`${styles.diffCard} ${styles.hardCard}`}
            onClick={() => startGame("HARD")}
          >
            <div className={styles.cardContent}>
              <h2 className={styles.diffTitle}>HARD</h2>
              <p className={styles.diffDesc}>
                Advanced calculations • Fast responses
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "GAMEOVER") {
    return (
      <div className={styles.container}>
        <div className={styles.gameOver}>
          <h2 className={styles.gameOverTitle}>Session Complete!</h2>
          <p className={styles.scoreLabel}>Final Score</p>
          <div className={styles.finalScore}>{score}</div>
          <div
            style={{
              display: "flex",
              gap: "2rem",
              justifyContent: "center",
              marginBottom: "2rem",
            }}
          >
            <div>
              <p className={styles.scoreLabel}>Coins</p>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--accent-gold)",
                }}
              >
                🪙 {coins}
              </div>
            </div>
            <div>
              <p className={styles.scoreLabel}>Mistakes</p>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#ff4d4d",
                }}
              >
                {mistakes}
              </div>
            </div>
            <div>
              <p className={styles.scoreLabel}>Max Combo</p>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "var(--accent-teal)",
                }}
              >
                {maxCombo}
              </div>
            </div>
          </div>
          <button
            className={styles.restartButton}
            onClick={() => {
              stopRecognition();
              setGameState("MENU");
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const dashOffset = 157 - (157 * timeLeft) / 100;

  return (
    <div className={styles.container}>
      <GameBgVideo gameSlug="math-training" />
      <div className={styles.gameArea}>
        <div className={styles.header}>
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>Score</span>
            <span className={styles.scoreValue}>{score}</span>
          </div>

          <div className={styles.scoreBox} style={{ alignItems: "center" }}>
            <span className={styles.scoreLabel}>Coins</span>
            <span
              className={styles.scoreValue}
              style={{ color: "var(--accent-gold)" }}
            >
              🪙 {coins}
            </span>
          </div>

          <div className={styles.scoreBox} style={{ alignItems: "center" }}>
            <span className={styles.scoreLabel}>Mistakes</span>
            <span
              className={styles.scoreValue}
              style={{ color: "#ff4d4d" }}
            >
              {mistakes}
            </span>
          </div>

          <button
            onClick={handleGameOver}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "var(--text)",
              border: "1px solid var(--border-glass)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            End
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "60px",
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          {combo > 1 && (
            <div className={styles.comboText} key={combo}>
              Combo x{comboMultiplier}
            </div>
          )}

          <div
            className={styles.timerBox}
            style={{ position: "absolute", right: 0 }}
          >
            <svg className={styles.timerSvg} viewBox="0 0 60 60">
              <circle
                className={styles.timerCircleBg}
                cx="30"
                cy="30"
                r="25"
              />
              <circle
                className={styles.timerCircle}
                cx="30"
                cy="30"
                r="25"
                style={{
                  strokeDashoffset: dashOffset,
                  stroke:
                    timeLeft < 30 ? "#ff4d4d" : "var(--accent-pink)",
                }}
              />
            </svg>
            <span
              className={styles.timerText}
              style={{ color: timeLeft < 30 ? "#ff4d4d" : "inherit" }}
            >
              {secondsLeft}
            </span>
          </div>
        </div>

        <div className={styles.equationBox}>
          <div className={styles.equationText}>{question.text}</div>
        </div>

        <div className={styles.inputWrapper}>
          <div className={`${styles.inputDisplay} ${styles[inputStatus]}`}>
            {input ? (
              input
            ) : interim ? (
              <span style={{ opacity: 0.45, fontSize: "1.2rem" }}>
                “{interim}”
              </span>
            ) : (
              <span style={{ opacity: 0.3 }}>?</span>
            )}
          </div>
          <button
            className={`${styles.voiceBtn} ${
              isListening ? styles.listening : ""
            }`}
            onClick={toggleListening}
            title={isListening ? "Listening… tap to stop" : "Speak your answer"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </button>
        </div>

        {voiceError && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "#ff8b8b",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {voiceError}
          </div>
        )}

        <div className={styles.inputGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className={styles.numButton}
              onClick={() => handleInput(String(num))}
            >
              {num}
            </button>
          ))}
          <button
            className={`${styles.numButton} ${styles.actionButton}`}
            onClick={handleDelete}
          >
            DEL
          </button>
          <button
            className={styles.numButton}
            onClick={() => handleInput("0")}
          >
            0
          </button>
          <button
            className={`${styles.numButton} ${styles.actionButton}`}
            onClick={() => {
              if (resolvingRef.current) return;
              setInput("");
              setInputStatus("active");
            }}
          >
            CLR
          </button>
        </div>
      </div>
    </div>
  );
}
