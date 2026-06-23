"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import styles from "../form.module.css";

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const result = await registerUser(username.trim(), email.trim(), password);
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

      <h1 className={styles.heading}>Create Edu new account</h1>
      <p className={styles.sub}>Start your cognitive training journey.</p>

      <GoogleAuthButton onSuccess={(user) => { login(user); router.replace("/"); }} />

      <div className={styles.divider}><span>or continue with email</span></div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="username">Username</label>
          <input
            id="username"
            className={styles.input}
            type="text"
            placeholder="yourname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            className={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            className={styles.input}
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            className={styles.input}
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className={styles.footer}>
        Already have an account?{" "}
        <Link href="/login" className={styles.link}>Sign in</Link>
      </p>
    </>
  );
}
