"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth" throttle={16}>
        {children}
      </LiveblocksProvider>
    </SessionProvider>
  );
}


