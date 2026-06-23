"use client";

import { useRef, useState } from "react";
import { useGameVideo } from "@/context/GameVideoContext";
import styles from "./GameVideoManager.module.css";

const GAMES = [
  { slug: "color-pattern",    label: "Color Pattern" },
  { slug: "boxing",           label: "Boxing Arena" },
  { slug: "boxing-combo",     label: "Boxing Combo" },
  { slug: "quick-math",       label: "Quick Math" },
  { slug: "math-training",    label: "Math Training" },
  { slug: "number-sequence",  label: "Number Sequence" },
];

export default function GameVideoManager() {
  const { videos, assignments, upload, remove, assign, loading } = useGameVideo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const videoFiles = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videoFiles.length === 0) return;
    setUploading(true);
    await upload(videoFiles);
    setUploading(false);
  }

  const [dragOver, setDragOver] = useState(false);

  return (
    <div className={styles.root}>
      <h2 className={styles.heading}>Game Background Videos</h2>
      <p className={styles.sub}>Upload videos and assign them to each game.</p>

      {/* Upload zone */}
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className={styles.hidden}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className={styles.dropIcon}>🎬</span>
        <span className={styles.dropText}>
          {uploading ? "Uploading…" : "Click or drag videos here"}
        </span>
        <span className={styles.dropHint}>MP4, WebM, MOV — multiple files OK</span>
      </div>

      {/* Uploaded videos list */}
      {videos.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Uploaded Videos ({videos.length})</h3>
          <ul className={styles.videoList}>
            {videos.map((v) => (
              <li key={v.id} className={styles.videoItem}>
                <span className={styles.videoName}>{v.name}</span>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => remove(v.id)}
                  title="Remove video"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-game assignment */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Assign to Games</h3>
        {loading ? (
          <p className={styles.sub}>Loading…</p>
        ) : (
          <ul className={styles.assignList}>
            {GAMES.map((game) => (
              <li key={game.slug} className={styles.assignRow}>
                <span className={styles.gameLabel}>{game.label}</span>
                <select
                  className={styles.select}
                  value={assignments[game.slug] ?? ""}
                  onChange={(e) => assign(game.slug, e.target.value || null)}
                >
                  <option value="">— hobby default —</option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
