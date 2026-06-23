"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  loadProfile,
  saveProfile,
  UserProfile,
} from "@/lib/userProfile";

interface UserContextValue {
  profile: UserProfile | null;
  updateProfile: (p: UserProfile) => void;
  needsOnboarding: boolean;
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  updateProfile: () => {},
  needsOnboarding: false,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setHydrated(true);
  }, []);

  const updateProfile = useCallback((p: UserProfile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  const needsOnboarding = hydrated && (!profile || !profile.completedOnboarding);

  return (
    <UserContext.Provider value={{ profile, updateProfile, needsOnboarding }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
