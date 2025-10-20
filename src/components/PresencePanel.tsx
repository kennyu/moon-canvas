"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import styles from "./PresencePanel.module.css";

type UserInfo = { name?: string; color?: string };

export function PresencePanel() {
  const others = useOthers();
  const me = useSelf();

  const entries: Array<{ id: string | number; name: string; color: string }> = [];

  // Current user at the start
  if (me?.info) {
    const info = me.info as UserInfo;
    entries.push({ id: "me", name: info.name ?? "You", color: info.color ?? "#888" });
  }

  // Others
  for (const { connectionId, info } of others) {
    const u = info as UserInfo;
    entries.push({ id: connectionId, name: u.name ?? `User ${connectionId}`, color: u.color ?? "#888" });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>Who's Online</div>
      {entries.map((e) => (
        <div key={e.id} className={styles.item} title={e.name}>
          <span className={styles.swatch} style={{ backgroundColor: e.color }} />
          <span className={styles.name}>{e.name}</span>
        </div>
      ))}
    </div>
  );
}


