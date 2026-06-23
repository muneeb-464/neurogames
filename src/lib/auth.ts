export interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  provider: "credentials" | "google";
  image?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  image?: string;
  provider: "credentials" | "google";
}

const USERS_KEY = "nf:users";
const SESSION_KEY = "nf:session";

export function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "nf_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const users = loadUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "Email already registered." };
  }
  if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: "Username already taken." };
  }
  const passwordHash = await hashPassword(password);
  const user: StoredUser = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    username,
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
    provider: "credentials",
  };
  saveUsers([...users, user]);
  return { ok: true, user: toAuthUser(user) };
}

export async function loginUser(
  emailOrUsername: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const users = loadUsers();
  const stored = users.find(
    (u) =>
      u.email.toLowerCase() === emailOrUsername.toLowerCase() ||
      u.username.toLowerCase() === emailOrUsername.toLowerCase(),
  );
  if (!stored) return { ok: false, error: "No account found." };
  if (stored.provider === "google") {
    return { ok: false, error: "This account uses Google sign-in." };
  }
  const hash = await hashPassword(password);
  if (hash !== stored.passwordHash) return { ok: false, error: "Incorrect password." };
  return { ok: true, user: toAuthUser(stored) };
}

export function upsertGoogleUser(googleUser: {
  id: string;
  name: string;
  email: string;
  image?: string;
}): AuthUser {
  const users = loadUsers();
  const existing = users.find((u) => u.email.toLowerCase() === googleUser.email.toLowerCase());
  if (existing) {
    const updated = { ...existing, image: googleUser.image, provider: "google" as const };
    saveUsers(users.map((u) => (u.id === existing.id ? updated : u)));
    return toAuthUser(updated);
  }
  const newUser: StoredUser = {
    id: googleUser.id,
    username: googleUser.name,
    email: googleUser.email,
    passwordHash: "",
    createdAt: new Date().toISOString(),
    provider: "google",
    image: googleUser.image,
  };
  saveUsers([...users, newUser]);
  return toAuthUser(newUser);
}

function toAuthUser(u: StoredUser): AuthUser {
  return { id: u.id, username: u.username, email: u.email, image: u.image, provider: u.provider };
}

export function saveSession(user: AuthUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
