"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  assignVideo,
  deleteVideo,
  getAssignments,
  getVideoBlob,
  listVideos,
  saveVideo,
  type StoredVideo,
} from "@/lib/gameVideos";

interface VideoMeta extends Omit<StoredVideo, "blob"> {}

interface GameVideoContextValue {
  videos: VideoMeta[];
  assignments: Record<string, string>; // gameSlug → videoId
  objectUrls: Record<string, string>;   // videoId → objectURL
  getVideoSrc: (gameSlug: string) => string | null;
  upload: (files: File[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  assign: (gameSlug: string, videoId: string | null) => Promise<void>;
  loading: boolean;
}

const GameVideoContext = createContext<GameVideoContextValue>({
  videos: [],
  assignments: {},
  objectUrls: {},
  getVideoSrc: () => null,
  upload: async () => {},
  remove: async () => {},
  assign: async () => {},
  loading: true,
});

export function GameVideoProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [objectUrls, setObjectUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const urlsRef = useRef<Record<string, string>>({});

  const loadVideoUrl = useCallback(async (id: string) => {
    if (urlsRef.current[id]) return urlsRef.current[id];
    const blob = await getVideoBlob(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlsRef.current[id] = url;
    setObjectUrls((prev) => ({ ...prev, [id]: url }));
    return url;
  }, []);

  const refresh = useCallback(async () => {
    const [vids, asgn] = await Promise.all([listVideos(), getAssignments()]);
    setVideos(vids);
    setAssignments(asgn);
    // pre-load objectURLs for assigned videos
    await Promise.all(Object.values(asgn).map((id) => loadVideoUrl(id)));
    setLoading(false);
  }, [loadVideoUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    refresh();
    return () => {
      // revoke all object URLs on unmount
      for (const url of Object.values(urlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [refresh]);

  const upload = useCallback(async (files: File[]) => {
    for (const file of files) {
      await saveVideo(file.name, file);
    }
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    if (urlsRef.current[id]) {
      URL.revokeObjectURL(urlsRef.current[id]!);
      delete urlsRef.current[id];
      setObjectUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    await deleteVideo(id);
    await refresh();
  }, [refresh]);

  const assign = useCallback(async (gameSlug: string, videoId: string | null) => {
    await assignVideo(gameSlug, videoId);
    if (videoId) await loadVideoUrl(videoId);
    setAssignments((prev) => {
      const next = { ...prev };
      if (videoId) next[gameSlug] = videoId;
      else delete next[gameSlug];
      return next;
    });
  }, [loadVideoUrl]);

  const getVideoSrc = useCallback((gameSlug: string): string | null => {
    const videoId = assignments[gameSlug];
    if (!videoId) return null;
    return urlsRef.current[videoId] ?? objectUrls[videoId] ?? null;
  }, [assignments, objectUrls]);

  return (
    <GameVideoContext.Provider value={{ videos, assignments, objectUrls, getVideoSrc, upload, remove, assign, loading }}>
      {children}
    </GameVideoContext.Provider>
  );
}

export function useGameVideo() {
  return useContext(GameVideoContext);
}
