"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { useGameVideo } from "@/context/GameVideoContext";
import { getHobbyVideoSrc } from "@/lib/userProfile";
import styles from "./GameBgVideo.module.css";

interface Props {
  gameSlug?: string;
  paused?: boolean;
}

export default function GameBgVideo({ gameSlug, paused }: Props) {
  const { profile } = useUser();
  const { getVideoSrc } = useGameVideo();
  const videoRef = useRef<HTMLVideoElement>(null);

  const customSrc = gameSlug ? getVideoSrc(gameSlug) : null;
  const src = customSrc ?? getHobbyVideoSrc(profile);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    v.src = src;
    v.load();
    v.play().catch(() => {});
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [paused]);

  if (!src) return null;

  return (
    <div className={styles.wrap} aria-hidden>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className={styles.overlay} />
    </div>
  );
}
