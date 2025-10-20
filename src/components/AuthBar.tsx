"use client";

import { signOut, useSession } from "next-auth/react";

export default function AuthBar() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(0,0,0,0.6)",
        color: "white",
        padding: "6px 10px",
        borderRadius: 8,
        zIndex: 1000,
      }}
    >
      {session.user?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt={session.user.name || "User"}
          width={20}
          height={20}
          style={{ borderRadius: 4 }}
        />
      )}
      <span style={{ fontSize: 12 }}>{session.user?.name || session.user?.email || "User"}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/auth" })}
        style={{
          fontSize: 12,
          padding: "4px 8px",
          background: "#ffffff",
          color: "#111",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  );
}


