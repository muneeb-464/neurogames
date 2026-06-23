import AppShell from "@/components/shell/AppShell";
import { UserProvider } from "@/context/UserContext";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import AuthGuard from "@/components/auth/AuthGuard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <AuthGuard />
      <OnboardingGate />
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
