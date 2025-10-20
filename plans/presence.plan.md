<!-- f41b61da-f9e6-4507-9680-60799f799547 94a0bb26-a98f-4ce0-8ea5-c42015959b52 -->
# PresencePanel (cursor color + name)

### Overview

Add a PresencePanel that lists users on the canvas (color swatch + name). Mount it under DefaultQuickActions inside the TLDraw Toolbar slot and group them together.

### Implementation Steps

- Create `src/components/PresencePanel.tsx`:
  - Use `useOthers()` and `useSelf()` from `@liveblocks/react/suspense`.
  - For each user, read `info.name` and `info.color` (fallback `#888`).
  - Render compact row: circular color swatch (10–12px) + truncated name.
- Add `src/components/PresencePanel.module.css`:
  - Horizontal list styles: `display:flex; align-items:center; gap:8px; font-size:12px`.
  - Swatch: fixed 10–12px circle; add 1px border for contrast.
- Mount under DefaultQuickActions in `src/components/StorageTldraw.tsx`:
  - Import `{ DefaultToolbar, DefaultQuickActions }` from `tldraw` and the new `PresencePanel`.
  - In `components.Toolbar`, layout:
    - `<DefaultToolbar />` (top)
    - Below it, a horizontal group containing:
      - `<DefaultQuickActions />`
      - `<PresencePanel />`
    - Keep `ChatPanel` below this group (unchanged) or as-is if already placed.
  - Example (concise):
    ```
    components={{
      Toolbar: () => (
        <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <DefaultToolbar />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <DefaultQuickActions />
            <PresencePanel />
          </div>
          {/* ChatPanel already rendered below if desired */}
        </div>
      ),
    }}
    ```


### Files to Touch

- `src/components/PresencePanel.tsx` (new)
- `src/components/PresencePanel.module.css` (new)
- `src/components/StorageTldraw.tsx` (mount under DefaultQuickActions)

### Acceptance

- Panel shows each user’s color and name in a compact row next to QuickActions.
- No overlap or layout shift with Toolbar/ChatPanel.
- Works with 1–10 users; truncates long names.

### To-dos

- [ ] Create PresencePanel.tsx to list users with color swatch and name
- [ ] Add PresencePanel.module.css for compact list styling
- [ ] Mount PresencePanel in StorageTldraw at chosen location