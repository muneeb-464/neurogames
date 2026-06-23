export type Hobby =
  | "basketball"
  | "boxing"
  | "soccer"
  | "tennis"
  | "chess"
  | "music"
  | "nature"
  | "gaming"
  | "other";

export interface UserProfile {
  name: string;
  age: string;
  hobbies: Hobby[];
  customHobby?: string; // filled when hobbies includes "other"
  completedOnboarding: boolean;
  createdAt: string;
}

export const HOBBY_META: Record<
  Hobby,
  { label: string; icon: string; videoSrc: string; accent: string }
> = {
  basketball: {
    label: "Basketball",
    icon: "🏀",
    videoSrc: "/videos/basketball 1.mp4",
    accent: "var(--accent-orange)",
  },
  boxing: {
    label: "Boxing",
    icon: "🥊",
    videoSrc: "/videos/hobbies/boxing.mp4",
    accent: "var(--accent-pink)",
  },
  soccer: {
    label: "Soccer",
    icon: "⚽",
    videoSrc: "/videos/foot.mp4",
    accent: "var(--accent-mint)",
  },
  tennis: {
    label: "Tennis",
    icon: "🎾",
    videoSrc: "/videos/football 2.mp4",
    accent: "var(--accent-teal)",
  },
  chess: {
    label: "Chess",
    icon: "♟",
    videoSrc: "/videos/hobbies/chess.mp4",
    accent: "var(--accent-gold)",
  },
  music: {
    label: "Music",
    icon: "🎵",
    videoSrc: "/videos/hobbies/music.mp4",
    accent: "var(--accent)",
  },
  nature: {
    label: "Nature",
    icon: "🌿",
    videoSrc: "/videos/hobbies/nature.mp4",
    accent: "var(--accent-mint)",
  },
  gaming: {
    label: "Gaming",
    icon: "🎮",
    videoSrc: "/videos/hobbies/gaming.mp4",
    accent: "var(--accent-teal)",
  },
  other: {
    label: "Other",
    icon: "✦",
    videoSrc: "",
    accent: "var(--accent)",
  },
};

const KEY = "nf:userProfile";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
}

/** Returns the video src for the user's first hobby, or null. */
export function getHobbyVideoSrc(profile: UserProfile | null): string | null {
  if (!profile || profile.hobbies.length === 0) return null;
  return HOBBY_META[profile.hobbies[0]].videoSrc;
}
