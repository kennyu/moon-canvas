"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useEditor } from "tldraw";
import { parseShapeCommand } from "@/agent/client/parseShapeCommand";
import { parseTransformCommand } from "@/agent/client/parseTransformCommand";
import { parseLayoutCommand } from "@/agent/client/parseLayoutCommand";
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

    const vp = editor.getViewportPageBounds();
    const viewportSize = { w: vp.w, h: vp.h } as { w: number; h: number };
    const visibleCenter = { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 } as { x: number; y: number };

    function getVisibleShapes() {
        const all = editor.getCurrentPageShapes();
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
        .filter(Boolean) as any[];
      return shapes;
    }

    function median(values: number[]): number {
      if (!values.length) return 0;
      const arr = [...values].sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 ? arr[mid]! : (arr[mid - 1]! + arr[mid]!) / 2;
    }

    function applyLayoutDistribute(args: { ids?: string[]; axis: "row" | "column"; align?: "left" | "center" | "right" | "top" | "middle" | "bottom"; gapPx?: number; target?: "selection" | "viewport" }) {
      const shapes = getVisibleShapes();
      const selection = new Set(editor.getSelectedShapeIds?.() ?? []);
      const targets = (args.target === "selection" && selection.size ? shapes.filter((s) => selection.has(s.id)) : shapes) as any[];
      if (targets.length < 2) return;

      const axis = args.axis ?? "row";
      const align = args.align;
      const gap = args.gapPx;
      const sorted = [...targets].sort((a, b) => (axis === "row" ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y));
      const centers = sorted.map((s) => ({ cx: s.bounds.x + s.bounds.w / 2, cy: s.bounds.y + s.bounds.h / 2 }));
      const baseline = axis === "row" ? median(centers.map((c) => c.cy)) : median(centers.map((c) => c.cx));

      if (axis === "row") {
        const totalWidth = sorted.reduce((acc, s) => acc + s.bounds.w, 0);
        const minX = Math.min(...sorted.map((s) => s.bounds.x));
        const maxX = Math.max(...sorted.map((s) => s.bounds.x + s.bounds.w));
        const span = maxX - minX;
        const free = Math.max(0, span - totalWidth);
        const gapPx = gap ?? (sorted.length > 1 ? Math.round(free / (sorted.length - 1)) : 0);
        let cursorX = minX;
        for (const s of sorted) {
          const y = align === "top" ? baseline - s.bounds.h / 2 : align === "bottom" ? baseline - s.bounds.h / 2 : baseline - s.bounds.h / 2;
          editor.updateShape({ id: s.id, x: Math.round(cursorX), y: Math.round(y) } as any);
          cursorX += s.bounds.w + gapPx;
          }
        } else {
        const totalHeight = sorted.reduce((acc, s) => acc + s.bounds.h, 0);
        const minY = Math.min(...sorted.map((s) => s.bounds.y));
        const maxY = Math.max(...sorted.map((s) => s.bounds.y + s.bounds.h));
        const span = maxY - minY;
        const free = Math.max(0, span - totalHeight);
        const gapPx = gap ?? (sorted.length > 1 ? Math.round(free / (sorted.length - 1)) : 0);
        let cursorY = minY;
        for (const s of sorted) {
          const x = align === "left" ? baseline - s.bounds.w / 2 : align === "right" ? baseline - s.bounds.w / 2 : baseline - s.bounds.w / 2;
          editor.updateShape({ id: s.id, x: Math.round(x), y: Math.round(cursorY) } as any);
          cursorY += s.bounds.h + gapPx;
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-l`, role: "assistant", text: `Applied ${axis} layout to ${targets.length} shapes.` },
      ]);
    }

    try {
      const body = JSON.stringify({
        message: text,
        viewportSize,
        visibleCenter,
        shapes: getVisibleShapes(),
        selectionIds: editor.getSelectedShapeIds?.() ?? [],
      });

      const res = await fetch("/api/canvas-agent", {
          method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body,
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, { id: `${Date.now()}-err`, role: "assistant", text: "(error) Failed to start agent." }]);
        return;
      }

      // Fallback: some environments may not expose a streaming body
      if (!res.body) {
        try {
          const full = await res.text();
          if (full) {
            let buffer = full.replace(/\r\n/g, "\n");
            const parts = buffer.split("\n\n");
            for (const part of parts) {
              if (!part.trim()) continue;
              const lines = part.split("\n");
              let event: string | undefined;
              const dataLines: string[] = [];
              for (const line of lines) {
                const trimmed = line.replace(/\r/g, "");
                if (trimmed.startsWith("event:")) event = trimmed.slice(6).trim();
                else if (trimmed.startsWith("data:")) dataLines.push(trimmed.slice(5).trim());
              }
              const dataStr = dataLines.join("\n");
              let payload: any = undefined;
              if (dataStr) {
                try { payload = JSON.parse(dataStr); } catch {}
              }
              if (process.env.NODE_ENV !== "production") {
                try {
                  const preview = payload == null ? "" : ` ${JSON.stringify(payload).slice(0, 150)}${JSON.stringify(payload).length > 150 ? "…" : ""}`;
                  // eslint-disable-next-line no-console
                  console.log(`[sse] ${event}${preview}`);
                } catch {}
              }
              if (event === "message" && payload?.text) {
                setMessages((prev) => [...prev, { id: `${Date.now()}-m`, role: "assistant", text: payload.text }]);
              } else if (event === "tool.addShape") {
                const a = payload as { type: string; geo?: string; x: number; y: number; w: number; h: number; color?: string; text?: string };
                if (a?.type) {
                  if (a.type === "geo") {
                    editor.createShape({ type: "geo", x: a.x, y: a.y, props: { geo: a.geo ?? "rectangle", w: a.w, h: a.h, color: a.color, text: a.text } } as any);
                  } else {
                    editor.createShape({ type: a.type as any, x: a.x, y: a.y, props: { w: a.w, h: a.h, color: a.color, text: a.text } } as any);
                  }
              // Auto-center on the newly created shape's bounds
              const centerX = a.x + (a.w || 0) / 2;
              const centerY = a.y + (a.h || 0) / 2;
              const anyEditor = editor as any;
              if (typeof anyEditor.zoomToBounds === "function") {
                try { anyEditor.zoomToBounds({ x: a.x, y: a.y, w: a.w, h: a.h }, { animation: { duration: 220 } }); } catch {}
              } else if (typeof anyEditor.getCamera === "function" && typeof anyEditor.setCamera === "function") {
                try { const cam = anyEditor.getCamera(); anyEditor.setCamera({ x: centerX, y: centerY, z: cam?.z ?? 1 }); } catch {}
              }
                }
              } else if (event === "tool.updateShape") {
                const u = payload as { id: string; x?: number; y?: number; props?: any; rotation?: number };
                if (u?.id) editor.updateShape({ id: u.id, x: u.x, y: u.y, type: u?.props ? "geo" : undefined, props: u.props, rotation: u.rotation } as any);
              } else if (event === "tool.moveShapes") {
                const m = payload as { moves: Array<{ id: string; to?: { x: number; y: number }; by?: { dx: number; dy: number } }> };
                for (const mv of m?.moves ?? []) {
                  if (mv.to) editor.updateShape({ id: mv.id, x: mv.to.x, y: mv.to.y } as any);
                  else if (mv.by) {
                    const s: any = editor.getShape(mv.id as any);
                    if (s) editor.updateShape({ id: mv.id, x: s.x + mv.by.dx, y: s.y + mv.by.dy } as any);
                  }
                }
              } else if (event === "tool.resizeShape") {
                const r = payload as { id: string; to?: { w: number; h: number }; by?: { dw: number; dh: number } };
                if (r?.id) {
                  if (r.to) editor.updateShape({ id: r.id, type: "geo", props: { w: r.to.w, h: r.to.h } } as any);
                  else if (r.by) {
                    const s: any = editor.getShape(r.id as any);
                    if (s?.props) editor.updateShape({ id: r.id, type: "geo", props: { w: (s.props.w || 0) + r.by.dw, h: (s.props.h || 0) + r.by.dh } } as any);
                  }
                }
              } else if (event === "tool.rotateShape") {
                const rot = payload as { id: string; to?: number; by?: number; unit?: "deg" | "rad" };
                if (rot?.id) {
                  const val = rot.to ?? rot.by ?? 0;
                  const radians = rot.unit === "rad" ? val : (val * Math.PI) / 180;
                  const s: any = editor.getShape(rot.id as any);
                  const newRot = rot.to != null ? radians : ((s?.rotation || 0) + radians);
                  editor.updateShape({ id: rot.id, rotation: newRot } as any);
                }
              } else if (event === "tool.layoutDistribute") {
                applyLayoutDistribute(payload);
              } else if (event === "tool.deleteShapes") {
                const d = payload as { ids: string[] };
                for (const id of d?.ids ?? []) {
                  (editor as any).deleteShape ? (editor as any).deleteShape(id) : (editor as any).deleteShapes?.([id]);
                }
              }
            }
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
          }
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.error("[sse] fallback parse error", err);
          }
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const processBuffer = () => {
        const work = buffer.replace(/\r\n/g, "\n");
        const parts = work.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const lines = part.split("\n");
          let event: string | undefined;
          const dataLines: string[] = [];
          for (const line of lines) {
            const trimmed = line.replace(/\r/g, "");
            if (trimmed.startsWith("event:")) event = trimmed.slice(6).trim();
            else if (trimmed.startsWith("data:")) dataLines.push(trimmed.slice(5).trim());
          }
          const dataStr = dataLines.join("\n");
          let payload: any = undefined;
          if (dataStr) {
            try { payload = JSON.parse(dataStr); } catch {}
          }

          if (process.env.NODE_ENV !== "production") {
            // debug: log the incoming SSE event briefly
            try {
              const preview = payload == null ? "" : ` ${JSON.stringify(payload).slice(0, 150)}${JSON.stringify(payload).length > 150 ? "…" : ""}`;
              // eslint-disable-next-line no-console
              console.log(`[sse] ${event}${preview}`);
            } catch {}
          }

          if (event === "message" && payload?.text) {
            setMessages((prev) => [...prev, { id: `${Date.now()}-m`, role: "assistant", text: payload.text }]);
          } else if (event === "tool.addShape") {
            const a = payload as { type: string; geo?: string; x: number; y: number; w: number; h: number; color?: string; text?: string };
            if (a?.type) {
              if (a.type === "geo") {
                editor.createShape({ type: "geo", x: a.x, y: a.y, props: { geo: a.geo ?? "rectangle", w: a.w, h: a.h, color: a.color, text: a.text } } as any);
              } else {
                editor.createShape({ type: a.type as any, x: a.x, y: a.y, props: { w: a.w, h: a.h, color: a.color, text: a.text } } as any);
              }
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[ai-canvas] addShape", { type: a.type, geo: a.geo, x: a.x, y: a.y, w: a.w, h: a.h, color: a.color });
              }
              // Auto-center/zoom to the created shape
              const anyEditor = editor as any;
              const bounds = { x: a.x, y: a.y, w: a.w, h: a.h };
              try {
                if (typeof anyEditor.zoomToBounds === "function") {
                  anyEditor.zoomToBounds(bounds, { animation: { duration: 220 } });
                  if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.log("[ai-canvas] camera.zoomToBounds", bounds);
                  }
                } else if (typeof anyEditor.getCamera === "function" && typeof anyEditor.setCamera === "function") {
                  const cam = anyEditor.getCamera();
                  const cx = a.x + a.w / 2;
                  const cy = a.y + a.h / 2;
                  anyEditor.setCamera({ x: cx, y: cy, z: cam?.z ?? 1 });
                  if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.log("[ai-canvas] camera.center", { x: cx, y: cy, z: cam?.z ?? 1 });
                  }
                }
              } catch {}
            }
          } else if (event === "tool.updateShape") {
            const u = payload as { id: string; x?: number; y?: number; props?: any; rotation?: number };
            if (u?.id) {
              editor.updateShape({ id: u.id, x: u.x, y: u.y, type: u?.props ? "geo" : undefined, props: u.props, rotation: u.rotation } as any);
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[ai-canvas] updateShape", u);
              }
            }
          } else if (event === "tool.moveShapes") {
            const m = payload as { moves: Array<{ id: string; to?: { x: number; y: number }; by?: { dx: number; dy: number } }> };
            for (const mv of m?.moves ?? []) {
              if (mv.to) {
                editor.updateShape({ id: mv.id, x: mv.to.x, y: mv.to.y } as any);
                if (process.env.NODE_ENV !== "production") {
                  // eslint-disable-next-line no-console
                  console.log("[ai-canvas] moveShape.to", mv);
                }
              } else if (mv.by) {
                const s: any = editor.getShape(mv.id as any);
                if (s) {
                  editor.updateShape({ id: mv.id, x: s.x + mv.by.dx, y: s.y + mv.by.dy } as any);
                  if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.log("[ai-canvas] moveShape.by", mv);
                  }
                }
              }
            }
          } else if (event === "tool.resizeShape") {
            const r = payload as { id: string; to?: { w: number; h: number }; by?: { dw: number; dh: number } };
            if (r?.id) {
              if (r.to) {
                editor.updateShape({ id: r.id, type: "geo", props: { w: r.to.w, h: r.to.h } } as any);
                if (process.env.NODE_ENV !== "production") {
                  // eslint-disable-next-line no-console
                  console.log("[ai-canvas] resizeShape.to", r);
                }
              } else if (r.by) {
                const s: any = editor.getShape(r.id as any);
                if (s?.props) {
                  editor.updateShape({ id: r.id, type: "geo", props: { w: (s.props.w || 0) + r.by.dw, h: (s.props.h || 0) + r.by.dh } } as any);
                  if (process.env.NODE_ENV !== "production") {
                    // eslint-disable-next-line no-console
                    console.log("[ai-canvas] resizeShape.by", r);
                  }
                }
              }
            }
          } else if (event === "tool.rotateShape") {
            const rot = payload as { id: string; to?: number; by?: number; unit?: "deg" | "rad" };
            if (rot?.id) {
              const val = rot.to ?? rot.by ?? 0;
              const radians = rot.unit === "rad" ? val : (val * Math.PI) / 180;
              const s: any = editor.getShape(rot.id as any);
              const newRot = rot.to != null ? radians : ((s?.rotation || 0) + radians);
              editor.updateShape({ id: rot.id, rotation: newRot } as any);
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[ai-canvas] rotateShape", rot);
              }
            }
          } else if (event === "tool.layoutDistribute") {
            applyLayoutDistribute(payload);
          } else if (event === "tool.deleteShapes") {
            const d = payload as { ids: string[] };
            for (const id of d?.ids ?? []) {
              (editor as any).deleteShape ? (editor as any).deleteShape(id) : (editor as any).deleteShapes?.([id]);
              if (process.env.NODE_ENV !== "production") {
                // eslint-disable-next-line no-console
                console.log("[ai-canvas] deleteShape", { id });
              }
            }
          } else if (event === "done") {
            // end of stream
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }

      // flush any remaining complete events
      processBuffer();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[chatpanel] onSend error", e);
      }
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


