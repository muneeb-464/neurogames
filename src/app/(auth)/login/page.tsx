"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import styles from "../form.module.css";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await loginUser(identifier.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    login(result.user);
    router.replace("/");
  }

  return (
    <>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>◎</span>
        <span className={styles.brandName}>NeuroFocus</span>
      </div>

      <h1 className={styles.heading}>Welcome back</h1>
      <p className={styles.sub}>Sign in to continue training.</p>

      <GoogleAuthButton onSuccess={(user) => { login(user); router.replace("/"); }} />

      <div className={styles.divider}><span>or continue with email</span></div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="identifier">Email or username</label>
          <input
            id="identifier"
            className={styles.input}
            type="text"
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            className={styles.input}
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className={styles.footer}>
        No account?{" "}
        <Link href="/signup" className={styles.link}>Create one</Link>
      </p>
    </>
  );
}
