"use client";

import { useState } from "react";
import { Hobby, HOBBY_META, UserProfile } from "@/lib/userProfile";
import { useUser } from "@/context/UserContext";
import styles from "./OnboardingModal.module.css";

const HOBBIES = Object.entries(HOBBY_META) as [
  Hobby,
  (typeof HOBBY_META)[Hobby],
][];

type Step = "welcome" | "name" | "age" | "hobbies" | "done";

export default function OnboardingModal() {
  const { updateProfile } = useUser();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [customHobby, setCustomHobby] = useState("");

  function toggleHobby(h: Hobby) {
    setHobbies((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h],
    );
  }

  function finish() {
    const profile: UserProfile = {
      name: name.trim() || "Trainer",
      age: age.trim(),
      hobbies,
      customHobby: hobbies.includes("other") ? customHobby.trim() : undefined,
      completedOnboarding: true,
      createdAt: new Date().toISOString(),
    };
    updateProfile(profile);
  }

  const showCustomInput = hobbies.includes("other");

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {step === "welcome" && (
          <div className={styles.step}>
            <div className={styles.glyph} aria-hidden>◎</div>
            <h1 className={styles.heading}>Welcome to NeuroFocus</h1>
            <p className={styles.sub}>
              A quick setup helps us personalise your training experience.
            </p>
            <button className={styles.btn} onClick={() => setStep("name")}>
              Get started →
            </button>
          </div>
        )}

        {step === "name" && (
          <div className={styles.step}>
            <p className={styles.kicker}>Step 1 of 3</p>
            <h2 className={styles.heading}>What&apos;s your name?</h2>
            <input
              className={styles.input}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && setStep("age")}
            />
            <div className={styles.row}>
              <button className={styles.btnGhost} onClick={() => setStep("welcome")}>
                ← Back
              </button>
              <button className={styles.btn} onClick={() => setStep("age")}>
                Next →
              </button>
            </div>
          </div>
        )}

        {step === "age" && (
          <div className={styles.step}>
            <p className={styles.kicker}>Step 2 of 3</p>
            <h2 className={styles.heading}>How old are you?</h2>
            <input
              className={styles.input}
              placeholder="Your age"
              type="number"
              min="5"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && setStep("hobbies")}
            />
            <div className={styles.row}>
              <button className={styles.btnGhost} onClick={() => setStep("name")}>
                ← Back
              </button>
              <button className={styles.btn} onClick={() => setStep("hobbies")}>
                Next →
              </button>
            </div>
          </div>
        )}

        {step === "hobbies" && (
          <div className={styles.step}>
            <p className={styles.kicker}>Step 3 of 3</p>
            <h2 className={styles.heading}>Pick your interests</h2>
            <p className={styles.sub}>We&apos;ll play matching backgrounds during games.</p>
            <div className={styles.hobbyGrid}>
              {HOBBIES.map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  className={
                    hobbies.includes(id)
                      ? styles.hobbyBtnActive
                      : styles.hobbyBtn
                  }
                  style={
                    hobbies.includes(id)
                      ? ({ "--accent-hobby": meta.accent } as React.CSSProperties)
                      : undefined
                  }
                  onClick={() => toggleHobby(id)}
                >
                  <span className={styles.hobbyIcon} aria-hidden>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              ))}
            </div>
            {showCustomInput && (
              <input
                className={styles.input}
                placeholder="Describe your interest…"
                value={customHobby}
                onChange={(e) => setCustomHobby(e.target.value)}
                autoFocus
              />
            )}
            <div className={styles.row}>
              <button className={styles.btnGhost} onClick={() => setStep("age")}>
                ← Back
              </button>
              <button
                className={styles.btn}
                onClick={finish}
                disabled={hobbies.length === 0 || (showCustomInput && !customHobby.trim())}
              >
                Start training →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
