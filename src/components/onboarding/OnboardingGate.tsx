"use client";

import { useUser } from "@/context/UserContext";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingGate() {
  const { needsOnboarding } = useUser();
  if (!needsOnboarding) return null;
  return <OnboardingModal />;
}
