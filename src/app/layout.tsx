import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { GameVideoProvider } from "@/context/GameVideoContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NeuroFocus Trainer",
  description: "Cognitive training dashboard and focus games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable}`}
    >
      <body suppressHydrationWarning>
        <AuthProvider>
          <GameVideoProvider>{children}</GameVideoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
