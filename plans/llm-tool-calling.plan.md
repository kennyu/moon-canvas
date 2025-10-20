<!-- 7ee5768c-9834-4971-8dba-d48261664d98 1b305109-93f7-4cec-a372-0a297b4f5efb -->
# LLM Tool‑Calling Canvas Agent

## What we'll build

- One server route `src/app/api/canvas-agent/route.ts` running an OpenAI tool-calling agent.
- Define tools: addShape, updateShape, moveShapes, resizeShape, rotateShape, layoutDistribute, selectShapes, deleteShapes.
- Server streams tool calls to the browser via SSE; the client applies them to `tldraw`'s `editor` directly.
- Input snapshot sent once at start: viewportSize + visibleCenter + shapes + selectionIds.
- Heuristics fallback emits equivalent tool events if `OPENAI_API_KEY` is missing.

## Server route (SSE + tools)

- Accept body: `{ message, viewportSize:{ w:number, h:number }, visibleCenter:{ x:number, y:number }, shapes: Shape[], selectionIds: string[] }`.
- All coordinates are in page space. The model should return page coordinates for positions.
- Initialize OpenAI; system prompt describes canvas, tool semantics, and coordinate system.
- Register tools with zod validation and guards:
  - sizes clamped to `viewportSize` (min 8px), positions not clamped (page coords)
  - use `visibleCenter` when user asks to “center” something
- Use streaming Responses API (SSE). On each tool call, write an SSE event the client applies immediately.
- Event format (examples):
  - `event: tool.addShape`  /  `data: { "idHint":"s_123","type":"geo","geo":"ellipse","x":100,"y":200,"w":160,"h":160,"color":"red","text":"" }`
  - `event: tool.updateShape`  /  `data: { "id":"s_abc","props":{ "color":"blue" } }`
  - `event: tool.moveShapes`  /  `data: { "moves":[ {"id":"s_1","to":{ "x":320, "y":240 }} ] }`
  - `event: message`  /  `data: { "text":"Aligned 3 shapes in a row." }`
  - `event: done`

## Client updates in `src/components/ChatPanel.tsx`

- Replace the 3 endpoint calls with a single streaming request to `/api/canvas-agent`.
- Build initial snapshot:
  - `viewportSize`: derive from `editor.getViewportPageBounds()` as `{ w, h }`
  - `visibleCenter`: derive from the same bounds `{ x: x + w/2, y: y + h/2 }`
  - `shapes`: shapes intersecting the current viewport (as before)
  - `selectionIds`: `editor.getSelectedShapeIds()`
- Read stream; dispatch tool events to `editor`:
  - addShape → `editor.createShape`
  - updateShape/resize/rotate/moveShapes → `editor.updateShape`
  - layoutDistribute → loop moves with `editor.updateShape`
- Maintain chat messages using `message` and `done` events; show error notes on stream failure.

## Validation & fallbacks

- Zod-validate incoming request and all tool payloads before emitting events.
- Clamp only sizes (w/h) to `viewportSize`; avoid clamping positions.
- Use `visibleCenter` when instructions specify centering.
- If no `OPENAI_API_KEY`, run heuristics to emit equivalent tool events (create at visibleCenter, transforms, layout).

## Deprecation

- Keep old routes (`create`, `transform`, `layout`) temporarily. After verifying the new agent, remove them and update any references (including e2e tests).

## Key change points

- Client calls to remove:
```40:71:src/components/ChatPanel.tsx
// three separate fetches: /create, /transform, /layout
```

- New server route: `src/app/api/canvas-agent/route.ts`
- Request schema shape:
```typescript
interface AgentRequest {
  message: string;
  viewportSize: { w: number; h: number };
  visibleCenter: { x: number; y: number };
  shapes: Array<{ id: string; type: string; bounds: { x: number; y: number; w: number; h: number }; geo?: string; color?: string; text?: string; rotation?: number }>;
  selectionIds: string[];
}
```


## Minimal tool schemas (essentials)

- addShape: `{ idHint?, type, geo?, x, y, w, h, color?, text? }`
- updateShape: `{ id, x?, y?, props?{ w?, h?, color?, text? }, rotation? }`
- moveShapes: `{ moves: [{ id, to?{x,y} | by?{dx,dy} }] }`
- resizeShape: `{ id, to?{w,h} | by?{dw,dh} }`
- rotateShape: `{ id, to?deg | by?deg, unit:'deg'|'rad' }`
- layoutDistribute: `{ ids?, axis:'row'|'column', align?, gapPx?, target? }`
- deleteShapes: `{ ids: string[] }`

### To-dos

- [ ] Create SSE agent route with OpenAI tools at src/app/api/canvas-agent/route.ts
- [ ] Define and validate tool schemas; clamp sizes to viewportSize
- [ ] Fallback emits tools using visibleCenter when no OPENAI_API_KEY
- [ ] Replace ChatPanel calls with streaming client and new request payload
- [ ] Stream agent messages and errors to chat UI
- [ ] Remove old create/transform/layout routes after verification