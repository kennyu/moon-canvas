"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./AuthPage.module.css";

export default function AuthPage() {
  const [signup, setSignup] = useState({ name: "", email: "", password: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signup),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Signup failed");
      return;
    }
    await signIn("credentials", { email: signup.email, password: signup.password, callbackUrl: "/" });
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", { email: login.email, password: login.password, redirect: false });
    if (result?.error) {
      setError("Invalid credentials");
    } else {
      location.href = "/";
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign up or log in</h1>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.grid}>
          <form onSubmit={onSignup} className={styles.form}>
            <h2 className={styles.formTitle}>Sign up</h2>
            <input className={styles.input} placeholder="Name" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} />
            <input className={styles.input} placeholder="Email" type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
            <input className={styles.input} placeholder="Password" type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
            <div className={styles.actions}>
              <button type="submit" className={styles.button}>Create account</button>
            </div>
          </form>

          <div className={styles.divider} />

          <form onSubmit={onLogin} className={styles.form}>
            <h2 className={styles.formTitle}>Log in</h2>
            <input className={styles.input} placeholder="Email" type="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
            <input className={styles.input} placeholder="Password" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
            <div className={styles.actions}>
              <button type="submit" className={styles.button}>Log in</button>
            </div>
          </form>

          <div className={styles.oauth}>
            <button type="button" className={styles.secondaryButton} onClick={() => signIn("google", { callbackUrl: "/" })}>Continue with Google</button>
          </div>
        </div>
      </div>
    </div>
  );
}


