"use client";

import { useEffect, useRef } from "react";
import { type AuthUser, upsertGoogleUser } from "@/lib/auth";
import styles from "../../app/(auth)/form.module.css";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
    handleGoogleCredential?: (response: { credential: string }) => void;
  }
}

interface Props {
  onSuccess: (user: AuthUser) => void;
}

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function GoogleAuthButton({ onSuccess }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || initialized.current) return;

    window.handleGoogleCredential = (response: { credential: string }) => {
      const payload = parseJwt(response.credential);
      if (!payload) return;
      const user = upsertGoogleUser({
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        image: payload.picture,
      });
      onSuccess(user);
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: window.handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "filled_black",
        size: "large",
        width: divRef.current.offsetWidth || 360,
        text: "continue_with",
        shape: "rectangular",
      });
    };
    document.head.appendChild(script);
    initialized.current = true;
  }, [onSuccess]);

  if (!CLIENT_ID) {
    return (
      <div>
        <button type="button" className={styles.googleBtn} disabled>
          <GoogleIcon />
          Continue with Google
        </button>
        <p className={styles.googleNote}>
          Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to <code>.env.local</code> to enable.
        </p>
      </div>
    );
  }

  return <div ref={divRef} style={{ minHeight: 44 }} />;
}

function GoogleIcon() {
  return (
    <svg className={styles.googleLogo} viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
