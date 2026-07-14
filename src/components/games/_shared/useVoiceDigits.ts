"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type VoiceCommand = "clear" | "back";

type UseVoiceDigitsOptions = {
  /** Recognition runs only while true. */
  enabled: boolean;
  /** Called once per digit heard, in spoken order. */
  onDigit: (digit: number) => void;
  /** Called for control words ("clear", "back"). */
  onCommand?: (command: VoiceCommand) => void;
};

// Minimal Web Speech API surface — not in TS dom lib.
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Homophones included — recognisers often hear "to"/"for"/"ate".
const DIGIT_WORDS: Record<string, number> = {
  zero: 0,
  oh: 0,
  o: 0,
  one: 1,
  won: 1,
  two: 2,
  to: 2,
  too: 2,
  three: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
};

const COMMAND_WORDS: Record<string, VoiceCommand> = {
  clear: "clear",
  reset: "clear",
  back: "back",
  backspace: "back",
  delete: "back",
  undo: "back",
};

type ParsedToken = { kind: "digit"; value: number } | { kind: "command"; value: VoiceCommand };

export function parseSpokenTokens(transcript: string): ParsedToken[] {
  const tokens = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const out: ParsedToken[] = [];
  for (const token of tokens) {
    if (token in DIGIT_WORDS) {
      out.push({ kind: "digit", value: DIGIT_WORDS[token]! });
    } else if (/^\d+$/.test(token)) {
      // "123" arrives as one token — emit each digit in order
      for (const ch of token) out.push({ kind: "digit", value: Number(ch) });
    } else if (token in COMMAND_WORDS) {
      out.push({ kind: "command", value: COMMAND_WORDS[token]! });
    }
  }
  return out;
}

/**
 * Listens for spoken digits via the Web Speech API while `enabled`.
 * Only final (settled) recognition results are emitted, so a digit is
 * never revised after being entered. Chrome/Edge/Safari support the API;
 * `supported` is false elsewhere and the hook stays inert.
 */
const noopSubscribe = () => () => {};

export function useVoiceDigits({ enabled, onDigit, onCommand }: UseVoiceDigitsOptions) {
  // false during SSR, real support flag after hydration — no mismatch
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState("");

  const onDigitRef = useRef(onDigit);
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onDigitRef.current = onDigit;
    onCommandRef.current = onCommand;
  }, [onDigit, onCommand]);

  const clearHeardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashHeard = useCallback((text: string) => {
    setHeard(text);
    if (clearHeardTimer.current) clearTimeout(clearHeardTimer.current);
    clearHeardTimer.current = setTimeout(() => setHeard(""), 2000);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    let active = true;
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!active) return;
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      if (!active) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;
        flashHeard(transcript);
        for (const token of parseSpokenTokens(transcript)) {
          if (token.kind === "digit") onDigitRef.current(token.value);
          else onCommandRef.current?.(token.value);
        }
      }
    };

    recognition.onerror = (event) => {
      if (!active) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone blocked — allow mic access to use voice input.");
        setListening(false);
      }
      // "no-speech" / "aborted" / "network" fall through to onend, which restarts
    };

    recognition.onend = () => {
      if (!active) {
        setListening(false);
        return;
      }
      // Browsers stop recognition after silence — restart to keep listening
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    try {
      recognition.start();
    } catch {
      // start() throws if called while already running — leave listening false
    }

    return () => {
      active = false;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      // keep onend attached: it fires after stop() and clears `listening`
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    };
  }, [enabled, flashHeard]);

  useEffect(() => {
    return () => {
      if (clearHeardTimer.current) clearTimeout(clearHeardTimer.current);
    };
  }, []);

  return { supported, listening, error, heard };
}
