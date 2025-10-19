"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useEditor } from "tldraw";
import { parseShapeCommand } from "@/agent/client/parseShapeCommand";
import styles from "./ChatPanel.module.css";

type Message = { id: string; role: "user" | "assistant"; text: string };

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const editor = useEditor();

  const onSend = useCallback(async () => {
    const text = value.trim();
    if (!text) return;
    const msg: Message = { id: `${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, msg]);
    setValue("");

    const { hasCreateIntent, shape, color } = parseShapeCommand(text);

    if (!hasCreateIntent) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "assistant", text: "(note) No create intent detected." },
      ]);
      return;
    }

    const viewport = editor.getViewportPageBounds();
    try {
      const res = await fetch("/api/shape-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, viewport, shapeHint: shape }),
      });
      const { x, y, w, h } = await res.json();

      const isCircle = shape === "circle";
      const size = isCircle ? Math.min(w, h) : null;
      const geo = isCircle ? "ellipse" : shape;

      editor.createShape({
        type: "geo",
        x,
        y,
        props: { geo, w: size ?? w, h: size ?? h, color },
      } as any);

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "assistant", text: `Created ${shape} in ${color}.` },
      ]);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "assistant", text: "(error) Failed to place shape." },
      ]);
    }
  }, [value, editor]);

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
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.nativeEvent) {
                  e.nativeEvent.stopImmediatePropagation?.();
                }
                onKeyDown(e);
              }}
            />
            <button className={styles.sendBtn} onClick={onSend}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPanel;


