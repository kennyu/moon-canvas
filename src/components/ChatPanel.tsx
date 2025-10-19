"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import styles from "./ChatPanel.module.css";

type Message = { id: string; role: "user" | "assistant"; text: string };

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(true);

  const onSend = useCallback(() => {
    const text = value.trim();
    if (!text) return;
    const msg: Message = { id: `${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, msg]);
    setValue("");
    // TODO: wire to agent backend, append assistant reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "assistant", text: "(stub) Received." },
      ]);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 250);
  }, [value]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  return (
    <div className={`${styles.container} ${open ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <div className={styles.title}>Chat with AI</div>
        <button className={styles.toggleBtn} onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Open"}
        </button>
      </div>
      {open && (
        <>
          <div className={`${styles.messages} ${styles.messagesOpen}`} ref={listRef}>
            {messages.map((m) => (
              <div key={m.id} style={{ marginBottom: 8, opacity: m.role === "assistant" ? 0.9 : 1 }}>
                <div style={{ fontSize: 12, color: "#666" }}>{m.role === "user" ? "You" : "Agent"}</div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.textbox}
              placeholder="Message the agent..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button className={styles.sendBtn} onClick={onSend}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPanel;


