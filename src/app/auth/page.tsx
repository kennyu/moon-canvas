"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

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
    <div style={{ maxWidth: 560, margin: "48px auto", padding: 24, display: "grid", gap: 24 }}>
      <h1>Sign up or log in</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={{ display: "grid", gap: 16 }}>
        <form onSubmit={onSignup} style={{ display: "grid", gap: 8 }}>
          <h2>Sign up</h2>
          <input placeholder="Name" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} />
          <input placeholder="Email" type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
          <input placeholder="Password" type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} />
          <button type="submit">Create account</button>
        </form>

        <form onSubmit={onLogin} style={{ display: "grid", gap: 8 }}>
          <h2>Log in</h2>
          <input placeholder="Email" type="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
          <input placeholder="Password" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
          <button type="submit">Log in</button>
        </form>

        <div>
          <button onClick={() => signIn("google", { callbackUrl: "/" })}>Continue with Google</button>
        </div>
      </div>
    </div>
  );
}


