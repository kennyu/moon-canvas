"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useEditor } from "tldraw";
import { parseShapeCommand } from "@/agent/client/parseShapeCommand";
import { parseTransformCommand } from "@/agent/client/parseTransformCommand";
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
    const transform = parseTransformCommand(text);

    if (!hasCreateIntent && !transform.hasTransformIntent) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "assistant", text: "(note) No create/transform intent detected." },
      ]);
      return;
    }

    const viewport = editor.getViewportPageBounds();
    try {
      if (hasCreateIntent) {
        const res = await fetch("/api/canvas-agent/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, viewport, shapeHint: shape }),
        });
        const { x, y, w, h } = await res.json();

        const isCircle = shape === "circle";
        const size = isCircle ? Math.min(w, h) : null;
        const geo = isCircle ? "ellipse" : shape;
        const finalW = size ?? w;
        const finalH = size ?? h;

        editor.createShape({
          type: "geo",
          x,
          y,
          props: { geo, w: finalW, h: finalH, color },
        } as any);

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "assistant",
            text: `Created ${shape} in ${color} at (${x}, ${y}) size ${finalW}x${finalH}.`,
          },
        ]);
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }

      if (transform.hasTransformIntent) {
        const all = editor.getCurrentPageShapes();
        const vp = editor.getViewportPageBounds();
        const shapes = all
          .map((s: any) => {
            const b = editor.getShapePageBounds(s.id);
            if (!b) return null;
            const intersects = !(b.x + b.w < vp.x || b.y + b.h < vp.y || b.x > vp.x + vp.w || b.y > vp.y + vp.h);
            if (!intersects) return null;
            return {
              id: s.id,
              type: s.type,
              geo: s.props?.geo,
              color: s.props?.color,
              text: s.props?.text,
              rotation: (s as any).rotation,
              bounds: { x: b.x, y: b.y, w: b.w, h: b.h },
            };
          })
          .filter(Boolean);

        const res2 = await fetch("/api/canvas-agent/transform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            viewport,
            hints: { action: transform.action, shape: transform.shapeHint, color: transform.colorHint },
            shapes,
          }),
        });
        const data = await res2.json();

        if (data?.shapeId && data?.action) {
          if (data.action === "move" && data.move?.to) {
            editor.updateShape({ id: data.shapeId, x: data.move.to.x, y: data.move.to.y } as any);
            setMessages((prev) => [
              ...prev,
              { id: `${Date.now()}-t`, role: "assistant", text: `Moved ${data.shapeId} to (${data.move.to.x}, ${data.move.to.y}).` },
            ]);
          } else if (data.action === "resize" && data.resize?.to) {
            editor.updateShape({ id: data.shapeId, type: "geo", props: { w: data.resize.to.w, h: data.resize.to.h } } as any);
            setMessages((prev) => [
              ...prev,
              { id: `${Date.now()}-t`, role: "assistant", text: `Resized ${data.shapeId} to ${data.resize.to.w}x${data.resize.to.h}.` },
            ]);
          } else if (data.action === "rotate" && data.rotate) {
            const deg = data.rotate.to ?? data.rotate.by ?? 0;
            const radians = (data.rotate.unit === "rad" ? deg : (deg * Math.PI) / 180) as number;
            editor.updateShape({ id: data.shapeId, rotation: radians } as any);
            setMessages((prev) => [
              ...prev,
              { id: `${Date.now()}-t`, role: "assistant", text: `Rotated ${data.shapeId} by ${Math.round((radians * 180) / Math.PI)}°.` },
            ]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { id: `${Date.now()}-t`, role: "assistant", text: "(note) No applicable transform returned." },
          ]);
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "assistant", text: "(error) Failed to process command." },
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


