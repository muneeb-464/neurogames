"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./BoxingComboArena.module.css";

const LEG_SHOT_CLIP = "/videos/leg-shot.mp4";
const FOLLOW_UP_CLIP = "/videos/combo-follow-up.mp4";
const BLOCK_CLIP = "/videos/block.mp4";

const LEG_SHOT_START_SEC = 38;
const LEG_SHOT_END_SEC = 43;

const CLIPS = [
  {
    id: "leg-shot",
    src: LEG_SHOT_CLIP,
    title: "Leg Shot",
    seekStart: LEG_SHOT_START_SEC,
    endSec: LEG_SHOT_END_SEC,
  },
  { id: "follow-up", src: FOLLOW_UP_CLIP, title: "Combo" },
  { id: "block", src: BLOCK_CLIP, title: "Block" },
] as const;

type Clip = (typeof CLIPS)[number];
type OverlayPlacement = "top" | "left" | "right";

type OrderedClip = Clip & { placement: OverlayPlacement };

const OVERLAY_PLACEMENTS: OverlayPlacement[] = ["top", "left", "right"];

const PLACEMENT_CLASS: Record<OverlayPlacement, string> = {
  top: styles.overlayTop,
  left: styles.overlayLeft,
  right: styles.overlayRight,
};

function randomPlacement(): OverlayPlacement {
  return OVERLAY_PLACEMENTS[
    Math.floor(Math.random() * OVERLAY_PLACEMENTS.length)
  ];
}

function shuffleClips(clips: readonly Clip[]): OrderedClip[] {
  const order = [...clips];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map((entry) => ({
    ...entry,
    placement: randomPlacement(),
  }));
}

function waitForEvent(
  target: HTMLVideoElement,
  event: keyof HTMLMediaElementEventMap,
) {
  return new Promise<void>((resolve) => {
    if (
      event === "loadedmetadata" &&
      target.readyState >= HTMLMediaElement.HAVE_METADATA
    ) {
      resolve();
      return;
    }
    if (
      event === "canplay" &&
      target.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      resolve();
      return;
    }
    target.addEventListener(event, () => resolve(), { once: true });
  });
}

function seekTo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.05) {
      resolve();
      return;
    }

    const timer = window.setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("Video seek timed out"));
    }, 15000);

    const onSeeked = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };

    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

export default function BoxingComboArena() {
  const [clipOrder] = useState(() => shuffleClips(CLIPS));
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [clipError, setClipError] = useState(false);
  const [clipIndex, setClipIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prepareStartedRef = useRef(false);
  const transitioningRef = useRef(false);

  const clip = clipOrder[clipIndex];
  const isComplete = clipIndex >= clipOrder.length;

  const advanceClip = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    prepareStartedRef.current = false;
    setVideoLoaded(false);
    setClipIndex((index) => index + 1);
  }, []);

  const prepareClip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || prepareStartedRef.current || clipError || isComplete) return;
    prepareStartedRef.current = true;
    transitioningRef.current = false;

    try {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        await waitForEvent(video, "loadedmetadata");
      }

      if ("seekStart" in clip && clip.seekStart != null) {
        await seekTo(video, clip.seekStart);
      } else {
        video.currentTime = 0;
      }

      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        await waitForEvent(video, "canplay");
      }

      setVideoLoaded(true);
      await video.play();
    } catch {
      prepareStartedRef.current = false;
      setClipError(true);
    }
  }, [clip, clipError, isComplete]);

  useEffect(() => {
    if (!videoLoaded || isComplete) return;

    const video = videoRef.current;
    if (!video) return;

    const onProgress = () => {
      if ("endSec" in clip && clip.endSec != null && video.currentTime >= clip.endSec) {
        video.pause();
        advanceClip();
        return;
      }

      if (video.ended) {
        advanceClip();
      }
    };

    video.addEventListener("timeupdate", onProgress);
    video.addEventListener("ended", onProgress);
    return () => {
      video.removeEventListener("timeupdate", onProgress);
      video.removeEventListener("ended", onProgress);
    };
  }, [videoLoaded, clip, isComplete, advanceClip]);

  return (
    <div className={`${styles.root} ${styles.rootSingle}`}>
      <div className={styles.arenaWrap}>
        <div className={styles.crowd} aria-hidden />
        <div className={`${styles.arena} ${styles.arenaPlaying}`}>
          <div className={styles.spotlights} aria-hidden />
          <div className={styles.ring} aria-hidden />

          <div className={styles.videoStage}>
            <div className={styles.videoFrame}>
              {!videoLoaded && !clipError && !isComplete && (
                <div
                  className={styles.skeleton}
                  aria-busy="true"
                  aria-label="Loading video"
                >
                  <div className={styles.skeletonShimmer} />
                  <div className={styles.skeletonBars}>
                    <span className={styles.skeletonBar} />
                    <span className={styles.skeletonBar} />
                    <span className={styles.skeletonBarShort} />
                  </div>
                </div>
              )}

              {videoLoaded && !isComplete && clip && (
                <div
                  className={`${styles.videoOverlay} ${styles.overlayTextOnly} ${PLACEMENT_CLASS[clip.placement]}`}
                >
                  <div className={styles.overlayTitle}>{clip.title}</div>
                </div>
              )}

              {clipError ? (
                <div className={styles.videoFallback}>
                  <div className={styles.videoFallbackTitle}>
                    Could not load video clip
                  </div>
                  <p className={styles.videoFallbackText}>
                    Expected files:
                    <br />
                    {CLIPS.map(({ src }) => (
                      <span key={src}>
                        <code>{src}</code>
                        <br />
                      </span>
                    ))}
                  </p>
                </div>
              ) : !isComplete ? (
                <video
                  key={`${clip.id}-${clipIndex}`}
                  ref={videoRef}
                  className={`${styles.video} ${videoLoaded ? styles.videoVisible : styles.videoHidden}`}
                  src={clip.src}
                  muted
                  playsInline
                  preload="auto"
                  controls={false}
                  onLoadedMetadata={() => {
                    void prepareClip();
                  }}
                  onError={() => setClipError(true)}
                />
              ) : null}

              {isComplete && <div className={styles.videoFinished} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
