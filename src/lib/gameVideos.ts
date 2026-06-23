const DB_NAME = "nf:game-videos";
const DB_VERSION = 1;
const STORE_VIDEOS = "videos";
const STORE_ASSIGNMENTS = "assignments";

export interface StoredVideo {
  id: string;
  name: string;
  blob: Blob;
  addedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_VIDEOS, { keyPath: "id" });
      req.result.createObjectStore(STORE_ASSIGNMENTS, { keyPath: "gameSlug" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideo(name: string, blob: Blob): Promise<string> {
  const db = await openDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, "readwrite");
    tx.objectStore(STORE_VIDEOS).put({ id, name, blob, addedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listVideos(): Promise<Omit<StoredVideo, "blob">[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, "readonly");
    const req = tx.objectStore(STORE_VIDEOS).getAll();
    req.onsuccess = () =>
      resolve(req.result.map(({ id, name, addedAt }) => ({ id, name, addedAt })));
    req.onerror = () => reject(req.error);
  });
}

export async function getVideoBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VIDEOS, "readonly");
    const req = tx.objectStore(STORE_VIDEOS).get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_VIDEOS, STORE_ASSIGNMENTS], "readwrite");
    tx.objectStore(STORE_VIDEOS).delete(id);
    // clear any assignments pointing to this video
    const aStore = tx.objectStore(STORE_ASSIGNMENTS);
    const req = aStore.getAll();
    req.onsuccess = () => {
      for (const a of req.result as { gameSlug: string; videoId: string }[]) {
        if (a.videoId === id) aStore.delete(a.gameSlug);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function assignVideo(gameSlug: string, videoId: string | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSIGNMENTS, "readwrite");
    const store = tx.objectStore(STORE_ASSIGNMENTS);
    if (videoId) {
      store.put({ gameSlug, videoId });
    } else {
      store.delete(gameSlug);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAssignments(): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSIGNMENTS, "readonly");
    const req = tx.objectStore(STORE_ASSIGNMENTS).getAll();
    req.onsuccess = () => {
      const map: Record<string, string> = {};
      for (const a of req.result as { gameSlug: string; videoId: string }[]) {
        map[a.gameSlug] = a.videoId;
      }
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}
