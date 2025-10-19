"use client";

import "tldraw/tldraw.css";
import { Tldraw, DefaultStylePanel, DefaultStylePanelContent } from "tldraw";
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

  const licenseKey = process.env.TLDRAW_KEY;
  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <Tldraw
        store={store}
        licenseKey={licenseKey}
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
        }}
        autoFocus
      >
        <ChatPanel />
      </Tldraw>
    </div>
  );
}


