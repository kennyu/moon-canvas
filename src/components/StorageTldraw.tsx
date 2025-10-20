"use client";

import "tldraw/tldraw.css";
import { Tldraw, DefaultStylePanel, DefaultToolbar } from "tldraw";
import { useStorageStore } from "./useStorageStore";
import { useSelf } from "@liveblocks/react/suspense";
import { Avatars } from "@/components/Avatars";
import { ChatPanel } from "@/components/ChatPanel";

export function StorageTldraw() {
  // Getting authenticated user info. Doing this using selectors instead
  // of just `useSelf()` to prevent re-renders on Presence changes
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);

  const store = useStorageStore({
    user: { id, color: info.color, name: info.name },
  });

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <Tldraw
        store={store}
        licenseKey='tldraw-2026-01-26/WyJyWDUwamVOXyIsWyIqIl0sMTYsIjIwMjYtMDEtMjYiXQ.EZYgRowORj0sAqbigsc9bwZi2olTsFzAlzlwyh44FwSNbvj0mpGjz1jTfyHq3Ln5ZCfAEXzYj/TR9woNE8pWBQ'
        components={{
          // Render a live avatar stack at the top-right
          StylePanel: () => (
            <div
              style={{
                display: "flex-column",
                marginTop: 4,
              }}
            >
              <Avatars />
              <DefaultStylePanel />
            </div>
          ),
          PageMenu: null,
          Toolbar: () => (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                zIndex: 10,
                pointerEvents: "auto",
              }}
            >
              <DefaultToolbar />
              <div style={{ width: "min(720px, 90vw)" }}>
                <ChatPanel />
              </div>
            </div>
          ),
        }}
        autoFocus
      />
    </div>
  );
}


