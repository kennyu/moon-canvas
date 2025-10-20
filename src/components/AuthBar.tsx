"use client";

import { signOut, useSession } from "next-auth/react";
import type { FC } from "react";

type AuthBarProps = { inline?: boolean };

const AuthBar: FC<AuthBarProps> = ({ inline = false }) => {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div
      style={{
        position: inline ? "static" : "fixed",
        top: inline ? undefined : 12,
        right: inline ? undefined : 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(0,0,0,0.6)",
        color: "white",
        padding: inline ? "4px 8px" : "6px 10px",
        borderRadius: 8,
        zIndex: inline ? 100 : 1000,
        pointerEvents: "auto",
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
};

export default AuthBar;


