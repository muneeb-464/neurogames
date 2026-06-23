"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./GamePageShell.module.css";

const SMALL_SCREEN = 768;

interface Props {
  title: string;
  backHref?: string;
  children: React.ReactNode;
}

export default function GamePageShell({ title, backHref = "/train", children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  const [showFsHint, setShowFsHint] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // show fullscreen hint on small screens (once per session)
  useEffect(() => {
    const dismissed = sessionStorage.getItem("fs-hint-dismissed");
    if (!dismissed && window.innerWidth < SMALL_SCREEN) {
      setShowFsHint(true);
    }
  }, []);

  const toggleFs = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // ESC already exits fullscreen natively; keep keyboard shortcut F too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFs();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFs]);

  function dismissHint(goFs = false) {
    sessionStorage.setItem("fs-hint-dismissed", "1");
    setShowFsHint(false);
    if (goFs) toggleFs();
  }

  return (
    <div ref={containerRef} className={`${styles.shell} ${isFs ? styles.fullscreen : ""}`}>
      <header className={styles.toolbar}>
        {!isFs && (
          <>
            <Link href={backHref} className={styles.back}>← Train</Link>
            <span className={styles.sep}>/</span>
            <span className={styles.crumb}>{title}</span>
          </>
        )}
        {isFs && <span className={styles.fsTitle}>{title}</span>}
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.fsBtn}
          onClick={toggleFs}
          title={isFs ? "Exit fullscreen (F)" : "Fullscreen (F)"}
        >
          {isFs ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
            </svg>
          )}
          <span>{isFs ? "Exit" : "Fullscreen"}</span>
        </button>
      </header>
      <div className={styles.gameArea}>
        {children}
      </div>

      {showFsHint && (
        <div className={styles.hintBackdrop}>
          <div className={styles.hintCard}>
            <div className={styles.hintIcon}>⛶</div>
            <h3 className={styles.hintTitle}>Better on fullscreen</h3>
            <p className={styles.hintText}>
              Your screen is small. Go fullscreen for the best experience.
            </p>
            <div className={styles.hintRow}>
              <button type="button" className={styles.hintPrimary} onClick={() => dismissHint(true)}>
                Go Fullscreen
              </button>
              <button type="button" className={styles.hintGhost} onClick={() => dismissHint(false)}>
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
