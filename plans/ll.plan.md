<!-- 7ee5768c-9834-4971-8dba-d48261664d98 89a2c935-cb58-4ad2-b7c2-1da4447a63f5 -->
# Viewport Debug Panel

## What we'll add

- A client component `src/components/DebugPanel.tsx` that reads from the TLDraw `editor` and shows:
  - viewportSize (w,h) from `editor.getViewportPageBounds()`
  - viewport (x,y,w,h) from `editor.getViewportPageBounds()`
  - cursor (x,y) using `editor.inputs?.currentPagePoint` if available, else `screen`→`page` mapping
  - FPS via `requestAnimationFrame` counter
- Render it as a bottom-right, column-stacked overlay in `StorageTldraw`.

## Implementation details

- `DebugPanel.tsx`
  - `use client`; `const editor = useEditor()`
  - `useEffect` + `requestAnimationFrame` loop:
    - read `vp = editor.getViewportPageBounds()`
    - read cursor from `editor.inputs?.currentPagePoint` (fallback: compute from last mousemove using `editor` mapping if needed)
    - keep an FPS counter over ~1s window
    - set local state for display
  - UI: absolute positioned container (bottom: 8, right: 8, zIndex: 20), small mono text, column layout

- `StorageTldraw.tsx`
  - Import and render `<DebugPanel />` inside the `components.Toolbar` fragment; use absolute positioning so it anchors bottom-right.

## Minimal snippet (key calls)

```23:35:src/components/DebugPanel.tsx
const vp = editor.getViewportPageBounds();
const size = { w: vp.w, h: vp.h };
const cursor = (editor as any)?.inputs?.currentPagePoint ?? null;
```

## Files to change

- Add: `src/components/DebugPanel.tsx`
- Update: `src/components/StorageTldraw.tsx` to include the panel overlay

## Notes

- No config or server changes required.
- If `editor.inputs.currentPagePoint` is undefined in your TLDraw version, we will fall back to `editor.getViewportPageBounds()` center or add a small pointer listener to map to page coords.

### To-dos

- [ ] Create DebugPanel.tsx showing viewport size/coords, cursor, FPS
- [ ] Render DebugPanel in StorageTldraw bottom-right overlay